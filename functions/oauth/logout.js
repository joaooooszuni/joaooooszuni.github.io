export async function onRequest(context) {
  const url = new URL(context.request.url);
  const headers = new Headers();

  // Expira todos os nomes de cookies possíveis em múltiplos caminhos
  const expired = 'Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; SameSite=Lax';
  
  headers.append('Set-Cookie', `session=; ${expired}`);
  headers.append('Set-Cookie', `Host-session=; ${expired}; Secure; HttpOnly`);
  headers.append('Set-Cookie', `user=; ${expired}`);
  headers.append('Set-Cookie', `session_user=; ${expired}`);
  headers.append('Set-Cookie', `token=; ${expired}`);
  headers.append('Set-Cookie', `auth=; ${expired}`);

  // Redireciona para o login e impede que o navegador salve o dashboard em cache
  headers.set('Location', `${url.origin}/login.html`);
  headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');

  return new Response(null, {
    status: 302,
    headers,
  });
}