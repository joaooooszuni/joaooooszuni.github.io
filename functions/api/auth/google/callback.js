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

function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
  return JSON.parse(jsonPayload);
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error || !code || !state) {
    return new Response('Parâmetros de resposta inválidos.', { status: 400 });
  }

  // 1. Validar cookie temporário de transação
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(/(?:^|;\s*)Host-oauth-tx=([^;]+)/);
  if (!match) {
    return new Response('Transação ausente ou expirada.', { status: 400 });
  }

  const rawTxId = match[1];
  const txHash = await sha256(rawTxId);
  const stateHash = await sha256(state);
  const now = Math.floor(Date.now() / 1000);

  // 2. Buscar e validar transação no D1
  const tx = await env.DB.prepare(
    'SELECT code_verifier, nonce FROM oauth_transactions WHERE id_hash = ? AND provider = ? AND state_hash = ? AND expires_at > ?'
  )
    .bind(txHash, 'google', stateHash, now)
    .first();

  if (!tx) {
    return new Response('Transação não encontrada ou inválida.', { status: 400 });
  }

  // Remove a transação para evitar reutilização
  await env.DB.prepare('DELETE FROM oauth_transactions WHERE id_hash = ?').bind(txHash).run();

  // 3. Trocar o código pelo id_token no Google
  const redirectUri = `${env.PUBLIC_BASE_URL}/oauth/callback/google`;
  const tokenParams = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code_verifier: tx.code_verifier,
  });

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenParams.toString(),
  });

  if (!tokenRes.ok) {
    return new Response('Falha na troca do código por tokens.', { status: 400 });
  }

  const tokenData = await tokenRes.json();
  const idTokenPayload = parseJwt(tokenData.id_token);

  // Validar claims básicas
  if (idTokenPayload.aud !== env.GOOGLE_CLIENT_ID) {
    return new Response('Audiência do token inválida.', { status: 400 });
  }

  // 4. Criar Sessão no D1
  const rawSessionId = bufferToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const sessionHash = await sha256(rawSessionId);
  const sessionExpiry = now + 28800; // 8 horas

  await env.DB.prepare(
    'INSERT INTO sessions (id_hash, issuer, subject, email, display_name, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
    .bind(
      sessionHash,
      'https://accounts.google.com',
      idTokenPayload.sub,
      idTokenPayload.email || null,
      idTokenPayload.name || idTokenPayload.email || 'Usuário Google',
      sessionExpiry,
      now
    )
    .run();

  // 5. Definir cookie de sessão e redirecionar para o dashboard
  const headers = new Headers();
  headers.append('Location', `${env.PUBLIC_BASE_URL}/examples/dashboard.html`);
  headers.append('Cache-Control', 'no-store');
  
  // Limpa o cookie de transação e define o cookie de sessão
  headers.append('Set-Cookie', 'Host-oauth-tx=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax');
  headers.append(
    'Set-Cookie',
    `Host-session=${rawSessionId}; Path=/; Max-Age=28800; HttpOnly; Secure; SameSite=Lax`
  );

  return new Response(null, { status: 302, headers });
}