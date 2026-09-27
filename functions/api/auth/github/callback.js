// Auxiliar para converter ArrayBuffer em Base64URL
function bufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Auxiliar para gerar hash SHA-256
async function sha256(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return bufferToBase64Url(hash);
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return new Response('Código de autorização não fornecido.', { status: 400 });
  }

  const redirectUri = `${url.origin}/api/auth/github/callback`;

  try {
    // 1. Troca o código pelo access_token na API do GitHub
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Cloudflare-Pages-Auth'
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code: code,
        redirect_uri: redirectUri
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      return new Response('Falha ao obter access_token do GitHub', { status: 400 });
    }

    // 2. Consulta o perfil do utilizador na API do GitHub
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'Cloudflare-Pages-Auth',
        'X-GitHub-Api-Version': '2026-03-10'
      }
    });

    if (!userRes.ok) {
      return new Response('Falha ao obter perfil do GitHub', { status: 400 });
    }

    const userData = await userRes.json();
    const subject = String(userData.id);
    const displayName = userData.name || userData.login;
    const email = userData.email || null;

    // 3. Exigência do PDF: Revoga imediatamente a autorização concedida na API do GitHub
    const basicAuth = btoa(`${env.GITHUB_CLIENT_ID}:${env.GITHUB_CLIENT_SECRET}`);
    await fetch(`https://api.github.com/applications/${env.GITHUB_CLIENT_ID}/grant`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ access_token: tokenData.access_token })
    });

    // 4. Cria a sessão opaca local no D1
    const rawSessionId = bufferToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
    const sessionHash = await sha256(rawSessionId);
    const now = Math.floor(Date.now() / 1000);
    const sessionDuration = 8 * 3600; // 8 horas
    const expiresAt = now + sessionDuration;

    await env.DB.prepare(
      'INSERT INTO sessions (id_hash, issuer, subject, email, display_name, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(sessionHash, 'https://github.com', subject, email, displayName, expiresAt, now).run();

    // 5. Define o cookie de sessão seguro e REDIRECIONA para o Dashboard/Index
    const headers = new Headers();
    headers.append('Location', `${url.origin}/index.html`); // Ou '/dashboard' dependendo de como está o teu projeto
    headers.append('Cache-Control', 'no-store');
    headers.append('Set-Cookie', `Host-session=${rawSessionId}; Path=/; Max-Age=${sessionDuration}; HttpOnly; Secure; SameSite=Strict`);

    return new Response(null, { status: 302, headers });

  } catch (err) {
    return new Response(`Erro ao processar login: ${err.message}`, { status: 500 });
  }
}