export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Define a URL de retorno para onde o Google deve devolver o utilizador
  const redirectUri = `${url.origin}/api/oauth/google/callback`;

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${env.GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent('openid email profile')}&` +
    `access_type=offline&` +
    `prompt=select_account`;

  return Response.redirect(googleAuthUrl, 302);
}