# Cloudflare Pages Deploy Checklist

This package intentionally includes a Cloudflare-safe `_redirects` file containing only comments.
It exists to overwrite any old invalid `_redirects` file in GitHub.

Cloudflare Pages settings:

- Framework preset: None / Static HTML
- Build command: leave blank
- Build output directory: .
- Root directory: leave blank if `index.html` is at repository root

Before redeploying from GitHub, make sure the repository root contains this `_redirects` file and its first line starts with `#`.
The file must not contain an SPA fallback rewrite rule.
