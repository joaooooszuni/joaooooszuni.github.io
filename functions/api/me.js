export async function onRequestGet(context) {
  const { request } = context;
  const cookieHeader = request.headers.get('Cookie') || '';
  
  // Extrai cookies do cabeçalho
  const cookies = {};
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.trim().split('=');
    if (name) cookies[name] = rest.join('=');
  });

  let sessionData = null;

  // Tenta ler o cookie 'session' ou 'user'
  const rawCookie = cookies.session || cookies.user;
  if (rawCookie) {
    try {
      sessionData = JSON.parse(decodeURIComponent(rawCookie));
    } catch (e) {
      sessionData = null;
    }
  }

  // Se o cookie for válido e possuir email ou subject, aprova a requisição
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

  // Se não houver sessão, retorna erro 401 para o dashboard redirecionar ao login
  return new Response(JSON.stringify({ error: 'Não autorizado' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  });
}