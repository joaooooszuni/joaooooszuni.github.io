export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Define para onde o GitHub deve devolver o utilizador após autorizar
  const redirectUri = `${url.origin}/api/oauth/github/callback`;

  const githubAuthUrl = `https://github.com/login/oauth/authorize?` +
    `client_id=${env.GITHUB_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=read:user%20user:email`;

  return Response.redirect(githubAuthUrl, 302);
}