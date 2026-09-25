export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  // 1. Redirecionar para o GitHub
  if (!code) {
    const redirectUrl = `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&scope=user:email`;
    return Response.redirect(redirectUrl, 302);
  }

  // 2. Trocar o código pelo Token
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Cloudflare-Pages-App'
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const tokenData = await tokenResponse.json();
  if (tokenData.error) return new Response(`Erro no GitHub: ${tokenData.error_description}`, { status: 400 });

  // 3. Obter dados do Utilizador
  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `token ${tokenData.access_token}`,
      'User-Agent': 'Cloudflare-Pages-App'
    },
  });
  const userData = await userResponse.json();

  // 4. Salvar na Base de Dados D1
  const userId = `github_${userData.id}`;
  await env.DB.prepare(`
    INSERT INTO users (id, email, name, avatar_url, provider)
    VALUES (?, ?, ?, ?, 'github')
    ON CONFLICT(id) DO UPDATE SET name=excluded.name, avatar_url=excluded.avatar_url;
  `).bind(userId, userData.email || '', userData.name || userData.login, userData.avatar_url).run();

  // 5. Redirecionar para o Dashboard
  return Response.redirect(`${url.origin}/dashboard.html`, 302);
}
