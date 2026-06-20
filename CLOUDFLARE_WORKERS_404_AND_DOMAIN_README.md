# Cloudflare Workers 404 + Custom Domain Fix

## Cloudflare Workers Builds fields

Build command:

```bash
npm install
```

Deploy command:

```bash
npm run deploy
```

Non-production branch deploy command:

```bash
npm run preview
```

Path: leave blank.

## Why this fixes workers.dev 404

This version is no longer assets-only. It includes `src/index.js`, which uses the `ASSETS` binding.
It first tries to serve the requested static asset. If Cloudflare returns 404, it falls back to `/index.html`.

## Custom domain

Cloudflare dashboard:
Workers & Pages → select Worker → Settings → Domains & Routes → Add → Custom Domain.
