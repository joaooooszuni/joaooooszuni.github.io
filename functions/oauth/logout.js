function bufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return bufferToBase64Url(hash);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // Exigência da Seção 13.6 do PDF: Valida o cabeçalho Origin
  const origin = request.headers.get('Origin');
  if (origin !== env.PUBLIC_BASE_URL) {
    return new Response('Origem não autorizada', { status: 403 });
  }

  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(/Host-session=([^;]+)/);

  if (match) {
    const rawSessionId = match[1];
    const sessionHash = await sha256(rawSessionId);
    await env.DB.prepare('DELETE FROM sessions WHERE id_hash = ?').bind(sessionHash).run();
  }

  // Expira o cookie Host-session e redireciona para a home
  const headers = new Headers();
  headers.append('Location', env.PUBLIC_BASE_URL);
  headers.append('Cache-Control', 'no-store');
  headers.append('Set-Cookie', 'Host-session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict');

  return new Response(null, { status: 302, headers });
}