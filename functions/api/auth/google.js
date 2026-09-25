export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const redirectUri = `${url.origin}/api/auth/google`;

  // 1. Redireciona para o Google se não houver código de autorização
  if (!code) {
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${env.GOOGLE_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=openid%20email%20profile`;
    return Response.redirect(googleAuthUrl, 302);
  }

  // 2. Troca o código pelo Token de acesso
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const tokenData = await tokenResponse.json();
  if (tokenData.error) {
    return new Response(`Erro no Google: ${tokenData.error_description || tokenData.error}`, { status: 400 });
  }

  // 3. Obter dados do Utilizador no Google
  const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const userData = await userResponse.json();

  // 4. Guardar/Atualizar na Base de Dados D1
  const userId = `google_${userData.id}`;
  await env.DB.prepare(`
    INSERT INTO users (id, email, name, avatar_url, provider)
    VALUES (?, ?, ?, ?, 'google')
    ON CONFLICT(id) DO UPDATE SET name=excluded.name, avatar_url=excluded.avatar_url;
  `).bind(userId, userData.email || '', userData.name || '', userData.picture || '').run();

  // 5. Redirecionar para a página inicial/dashboard
  return Response.redirect(`${url.origin}/dashboard.html`, 302);
}
