export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return new Response('Código de autorização do GitHub não fornecido.', { status: 400 });
  }

  // Define a URI de redirecionamento exata que o GitHub espera receber
  const redirectUri = `${url.origin}/api/auth/github/callback`;

  try {
    // 1. Troca o código pelo Token de Acesso na API do GitHub
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Cloudflare-Pages-Auth' // O GitHub exige um User-Agent válido
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code: code,
        redirect_uri: redirectUri
      })
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return new Response(`Erro Token GitHub: ${tokenData.error_description || tokenData.error}`, { status: 400 });
    }

    // Se obteve o token com sucesso, pode prosseguir
    return new Response(`Login com GitHub efetuado com sucesso! Token: ${tokenData.access_token}`);

  } catch (err) {
    return new Response(`Erro ao processar callback: ${err.message}`, { status: 500 });
  }
}