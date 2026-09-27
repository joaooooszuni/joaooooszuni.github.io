export async function onRequest(context) {
  return new Response(
    JSON.stringify({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "OAuth Lab API"
    }),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    }
  );
}