export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // 1. Obter o valor do Cookie de Sessão
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(/(?:^|;\s*)Host-session=([^;]+)/);
  const rawSessionId = match ? match[1] : null;

  if (rawSessionId) {
    // 2. Apagar a sessão da base de dados D1 se existir
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(rawSessionId);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      
      const bytes = new Uint8Array(hashBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const sessionHash = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      if (env.DB) {
        await env.DB.prepare('DELETE FROM sessions WHERE id_hash = ?').bind(sessionHash).run();
      }
    } catch (e) {
      console.error('Erro ao eliminar sessão:', e);
    }
  }

  // 3. Limpar todos os cookies no navegador e redirecionar para o login
  const headers = new Headers();
  headers.set('Location', `${url.origin}/login.html`);
  headers.set('Cache-Control', 'no-store');

  const expiredFlags = 'Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
  
  headers.append('Set-Cookie', `Host-session=; ${expiredFlags}; HttpOnly; Secure`);
  headers.append('Set-Cookie', `session=; ${expiredFlags}`);
  headers.append('Set-Cookie', `user=; ${expiredFlags}`);
  headers.append('Set-Cookie', `session_user=; ${expiredFlags}`);

  return new Response(null, { status: 302, headers });
}