export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Serve real static files first through Cloudflare's assets binding.
    // With run_worker_first=true, every request reaches this Worker first,
    // so /, /index, and custom-domain deep paths cannot fall through to a raw 404.
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) {
      return assetResponse;
    }

    // If a concrete asset is missing, return the true 404 instead of index.html.
    // This prevents missing JS/CSS/module files from being returned as HTML.
    const lastSegment = url.pathname.split('/').filter(Boolean).pop() || '';
    const looksLikeFile = lastSegment.includes('.') && !lastSegment.endsWith('.html');
    if (looksLikeFile) {
      return assetResponse;
    }

    // SPA/hash-route fallback: /, /index, /anything-without-extension -> /index.html.
    const indexUrl = new URL(request.url);
    indexUrl.pathname = '/index.html';
    indexUrl.search = '';
    const indexRequest = new Request(indexUrl.toString(), {
      method: request.method,
      headers: request.headers,
      redirect: request.redirect,
    });
    const indexResponse = await env.ASSETS.fetch(indexRequest);

    if (indexResponse.status !== 404) {
      const headers = new Headers(indexResponse.headers);
      headers.set('Cache-Control', 'no-cache');
      return new Response(indexResponse.body, {
        status: 200,
        headers,
      });
    }

    return new Response('index.html not found in ./public. Check that public/index.html exists and that wrangler assets.directory points to ./public.', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  },
};
