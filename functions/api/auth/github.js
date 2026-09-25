export async function onRequestGet(context) {
  const clientId = context.env.GITHUB_CLIENT_ID;
  
  if (!clientId) {
    return new Response("GITHUB_CLIENT_ID não configurado nas variáveis do Cloudflare", { status: 500 });
  }

  // URL para onde o GitHub redireciona após o login
  const redirectUri = "https://joaooooszuni-github-io.pages.dev/api/auth/github/callback";
  
  // Constrói a URL do GitHub
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email`;

  // Redireciona para a página do GitHub
  return Response.redirect(githubAuthUrl, 302);
}