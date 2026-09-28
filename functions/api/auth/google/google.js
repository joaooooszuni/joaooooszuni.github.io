export async function onRequestGet(context) {
  // Os teus dados da Google
  const clientId = "1088358011801-95rj13vih4g7rqnas95toh23psdavg5p.apps.googleusercontent.com";
  const redirectUri = "https://joaooooszuni-github-io.pages.dev/api/auth/google/callback";
  
  // Cria um código de segurança
  const state = crypto.randomUUID();

  // O URL da Google
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid%20email%20profile&state=${state}`;

  // Devolve o status 302 (Redirecionar) e cria o cookie de segurança exigido
  return new Response(null, {
    status: 302,
    headers: {
      "Location": googleAuthUrl,
      "Set-Cookie": `Host-oauth-tx=${state}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=300`
    }
  });
}