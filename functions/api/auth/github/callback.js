export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return new Response("Código de autorização não fornecido.", { status: 400 });
  }

  // 1. Trocar o código pelo Access Token no GitHub
  const tokenResponse = await fetch("https://github.com/login/auth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code
    })
  });

  const tokenData = await tokenResponse.json();
  if (tokenData.error) {
    return new Response(`Erro ao obter token do GitHub: ${tokenData.error_description}`, { status: 400 });
  }

  // 2. Buscar os dados do utilizador no GitHub
  const userResponse = await fetch("https://api.github.com/user", {
    headers: {
      "Authorization": `Bearer ${tokenData.access_token}`,
      "User-Agent": "Cloudflare-Pages-App"
    }
  });

  const githubUser = await userResponse.json();

  // 3. Salvar/Atualizar utilizador na base D1
  const userId = `github_${githubUser.id}`;
  await env.DB.prepare(`
    INSERT INTO users (id, email, name, avatar_url, provider)
    VALUES (?, ?, ?, ?, 'github')
    ON CONFLICT(id) DO UPDATE SET
      email = excluded.email,
      name = excluded.name,
      avatar_url = excluded.avatar_url
  `).bind(userId, githubUser.email || githubUser.login, githubUser.name || githubUser.login, githubUser.avatar_url).run();

  // 4. Criar Sessão no D1
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 dias

  await env.DB.prepare(`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (?, ?, ?)
  `).bind(sessionId, userId, expiresAt).run();

  // 5. Redirecionar para o Dashboard com Cookie de Sessão
  return new Response(null, {
    status: 302,
    headers: {
      "Location": "/dashboard.html",
      "Set-Cookie": `session=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`
    }
  });
}