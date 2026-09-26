export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return new Response('Código de autorização não fornecido.', { status: 400 });
  }

  try {
    // 1. Troca o código pelo Token de Acesso
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
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

    // 2. Busca os dados do Utilizador no GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'User-Agent': 'Cloudflare-Pages-App'
      },
    });
    const userData = await userResponse.json();

    // 3. Regista na base de dados D1 (se estiver configurada)
    if (env.DB) {
      const userId = `github_${userData.id}`;
      await env.DB.prepare(`
        INSERT INTO users (id, email, name, avatar_url, provider)
        VALUES (?, ?, ?, ?, 'github')
        ON CONFLICT(id) DO UPDATE SET name=excluded.name, avatar_url=excluded.avatar_url;
      `).bind(userId, userData.email || userData.login || '', userData.name || userData.login, userData.avatar_url || '').run();
    }

    // 4. Redireciona para o Dashboard final
    return Response.redirect(`${url.origin}/examples/dashboard`, 302);
  } catch (err) {
    return new Response(`Erro no Callback do GitHub: ${err.message}`, { status: 500 });
  }
}