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

export async function onRequestGet(context) {
  const { request, env } = context;

  // 1. Obtém o cookie de sessão opaco
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(/Host-session=([^;]+)/);

  if (!match) {
    return new Response(JSON.stringify({ error: 'Não autenticado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  }

  const rawSessionId = match[1];
  const sessionHash = await sha256(rawSessionId);
  const now = Math.floor(Date.now() / 1000);

  // 2. Consulta o D1
  const session = await env.DB.prepare(
    'SELECT issuer, subject, email, display_name FROM sessions WHERE id_hash = ? AND expires_at > ?'
  ).bind(sessionHash, now).first();

  if (!session) {
    return new Response(JSON.stringify({ error: 'Sessão expirada ou inválida' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  }

  // 3. Devolve apenas o perfil mínimo exigido no PDF
  return new Response(JSON.stringify({
    issuer: session.issuer,
    subject: session.subject,
    email: session.email,
    displayName: session.display_name
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}