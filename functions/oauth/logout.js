export async function onRequestPost(context) {
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

  // 3. Limpar o cookie no navegador e Redirecionar para o login
  const headers = new Headers();
  headers.append('Location', `${url.origin}/login.html`);
  headers.append('Cache-Control', 'no-store');
  headers.append(
    'Set-Cookie',
    'Host-session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict'
  );

  return new Response(null, { status: 302, headers });
}