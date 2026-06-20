export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // First, let Cloudflare Static Assets try to serve the exact requested file.
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) {
      return assetResponse;
    }

    // This app uses hash routing (#/...), but Workers sometimes receives /, /index,
    // or a deep path during previews/custom domains. Always fall back to index.html.
    const indexUrl = new URL(request.url);
    indexUrl.pathname = "/index.html";
    indexUrl.search = "";
    const indexRequest = new Request(indexUrl.toString(), request);
    const indexResponse = await env.ASSETS.fetch(indexRequest);

    if (indexResponse.status !== 404) {
      return new Response(indexResponse.body, {
        status: 200,
        headers: indexResponse.headers,
      });
    }

    return new Response("index.html not found in the Worker static assets bundle.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  },
};
