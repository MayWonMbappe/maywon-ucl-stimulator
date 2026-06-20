# Cloudflare Pages public-output deployment

This package intentionally places the whole static site inside `public/`.

Use these Cloudflare Pages settings:

- Framework preset: None / Static HTML
- Root directory: leave blank
- Build command: `exit 0`
- Build output directory: `public`

Why: Cloudflare Pages parses `_redirects` only from the static asset/build output directory. If an old `_redirects` remains in the repository root, using `public` as the build output directory prevents Cloudflare from reading the old root-level `_redirects`.

Do not set Build output directory to `.` for this package.
