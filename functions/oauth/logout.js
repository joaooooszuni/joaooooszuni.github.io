export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  const headers = new Headers();
  // Redireciona para a página de login após limpar a sessão
  headers.set('Location', `${url.origin}/login.html`);
  headers.set('Cache-Control', 'no-store');

  // Limpa todos os cookies de sessão possíveis
  const expired = 'Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
  headers.append('Set-Cookie', `Host-session=; ${expired}; HttpOnly; Secure`);
  headers.append('Set-Cookie', `session=; ${expired}`);
  headers.append('Set-Cookie', `user=; ${expired}`);
  headers.append('Set-Cookie', `session_user=; ${expired}`);

  return new Response(null, {
    status: 302,
    headers,
  });
}