export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return new Response('Código de autorização do Google não fornecido.', { status: 400 });
  }

  try {
    const redirectUri = `${url.origin}/api/auth/google/callback`;

    // 1. Troca o código pelo Token de Acesso
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
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
      return new Response(`Erro Token Google: ${tokenData.error_description || tokenData.error}`, { status: 400 });
    }

    // 2. Procura os dados do Perfil do Utilizador no Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });
    const userData = await userResponse.json();

    // 3. Regista na base de dados D1 (se configurada)
    if (env.DB) {
      const userId = `google_${userData.id}`;
      await env.DB.prepare(`
        INSERT INTO users (id, email, name, avatar_url, provider)
        VALUES (?, ?, ?, ?, 'google')
        ON CONFLICT(id) DO UPDATE SET name=excluded.name, avatar_url=excluded.avatar_url;
      `).bind(userId, userData.email || '', userData.name || '', userData.picture || '').run();
    }

    // 4. Redireciona para o Dashboard final
    return Response.redirect(`${url.origin}/examples/dashboard`, 302);
  } catch (err) {
    return new Response(`Erro no Callback do Google: ${err.message}`, { status: 500 });
  }
}