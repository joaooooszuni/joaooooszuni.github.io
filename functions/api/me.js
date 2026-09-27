export async function onRequestGet(context) {
  const { request } = context;
  const cookieHeader = request.headers.get('Cookie') || '';
  
  const cookies = {};
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.trim().split('=');
    if (name) cookies[name] = rest.join('=').trim();
  });

  let sessionData = null;
  const rawCookie = cookies.session || cookies.user;

  if (rawCookie) {
    try {
      sessionData = JSON.parse(decodeURIComponent(rawCookie));
    } catch (e) {
      sessionData = null;
    }
  }

  if (sessionData && (sessionData.email || sessionData.subject || sessionData.id)) {
    return new Response(JSON.stringify({
      email: sessionData.email || '',
      subject: sessionData.subject || sessionData.id || '',
      name: sessionData.name || '',
      picture: sessionData.picture || ''
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ error: 'Não autorizado' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  });
}