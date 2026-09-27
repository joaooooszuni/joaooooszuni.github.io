export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return new Response('Código de autorização não fornecido pelo GitHub.', { status: 400 });
  }

  try {
    // 1. Troca o código pelo Token de Acesso
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      return new Response(`Erro Token GitHub: ${tokenData.error_description || tokenData.error}`, { status: 400 });
    }

    // 2. Procura as informações do utilizador no GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'User-Agent': 'Cloudflare-Pages-App',
      },
    });
    const userData = await userResponse.json();

    // 3. Obtém o e-mail principal do utilizador no GitHub
    let userEmail = userData.email || '';
    if (!userEmail) {
      const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'User-Agent': 'Cloudflare-Pages-App',
        },
      });
      const emails = await emailResponse.json();
      if (Array.isArray(emails)) {
        const primaryEmail = emails.find(e => e.primary) || emails[0];
        if (primaryEmail) userEmail = primaryEmail.email;
      }
    }

    // 4. Regista na base de dados D1 (se configurada)
    if (env.DB) {
      const userId = `github_${userData.id}`;
      await env.DB.prepare(`
        INSERT INTO users (id, email, name, avatar_url, provider)
        VALUES (?, ?, ?, ?, 'github')
        ON CONFLICT(id) DO UPDATE SET name=excluded.name, avatar_url=excluded.avatar_url;
      `).bind(userId, userEmail, userData.name || userData.login, userData.avatar_url || '').run();
    }

    // 5. Constrói a resposta com o JSON padronizado nos cookies
    const headers = new Headers();
    headers.set('Location', `${url.origin}/examples/dashboard.html`);
    
    const maxAge = 60 * 60 * 8; // 8 horas
    const userJson = JSON.stringify({
      id: String(userData.id),
      subject: String(userData.id), // Exigido pela validação do dashboard
      name: userData.name || userData.login,
      email: userEmail || `${userData.login}@github.com`, // Garante que nunca fica vazio
      picture: userData.avatar_url,
      provider: 'github'
    });

    headers.append('Set-Cookie', `session=${encodeURIComponent(userJson)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`);
    headers.append('Set-Cookie', `user=${encodeURIComponent(userJson)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`);
    headers.append('Set-Cookie', `session_user=${userEmail || userData.id}; Path=/; Max-Age=${maxAge}; SameSite=Lax`);

    return new Response(null, {
      status: 302,
      headers,
    });
  } catch (err) {
    return new Response(`Erro no Callback do GitHub: ${err.message}`, { status: 500 });
  }
}