export async function onRequestGet(context) {
  const clientId = context.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return new Response("GOOGLE_CLIENT_ID não configurado nas variáveis do Cloudflare", { status: 500 });
  }

  // URL para onde o Google redireciona após o login
  const redirectUri = "https://joaooooszuni-github-io.pages.dev/api/auth/google/callback";
  
  // Constrói a URL do Google OAuth
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile`;

  // Redireciona para a página do Google
  return Response.redirect(googleAuthUrl, 302);
}