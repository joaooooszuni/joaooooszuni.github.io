export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return new Response("Código de autorização não fornecido.", { status: 400 });
  }

  // Rota corrigida usando /api/auth/
  const redirectUri = `${url.origin}/api/auth/google/callback`;

  // 1. Trocar o código pelo Access Token no Google
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    })
  });

  const tokenData = await tokenResponse.json();
  if (tokenData.error) {
    return new Response(`Erro Google: ${tokenData.error_description || tokenData.error}`, { status: 400 });
  }

  // 2. Buscar dados do perfil do utilizador
  const userResponse = await fetch("https://www.googleapis.com/auth2/v2/userinfo", {
    headers: { "Authorization": `Bearer ${tokenData.access_token}` }
  });

  const googleUser = await userResponse.json();

  // 3. Salvar/Atualizar utilizador na base D1
  const userId = `google_${googleUser.id}`;
  await env.DB.prepare(`
    INSERT INTO users (id, email, name, avatar_url, provider)
    VALUES (?, ?, ?, ?, 'google')
    ON CONFLICT(id) DO UPDATE SET
      email = excluded.email,
      name = excluded.name,
      avatar_url = excluded.avatar_url
  `).bind(userId, googleUser.email, googleUser.name, googleUser.picture).run();

  // 4. Criar Sessão no D1
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

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