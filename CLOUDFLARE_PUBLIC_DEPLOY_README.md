# Cloudflare Pages public-output deployment

This package intentionally places the whole static site inside `public/`.

Use these Cloudflare Pages settings:

- Framework preset: None / Static HTML
- Root directory: leave blank
- Build command: `exit 0`
- Build output directory: `public`

Why: Cloudflare Pages parses `_redirects` only from the static asset/build output directory. If an old `_redirects` remains in the repository root, using `public` as the build output directory prevents Cloudflare from reading the old root-level `_redirects`.

Do not set Build output directory to `.` for this package.

## 2026-06-20 Round 8 flow fix

This build fixes a league-phase flow bug: after Round 7, even if the selected club is already mathematically in the elimination zone, the game must continue to Matchday 8. League-phase elimination or qualification is finalized only after the user's eighth league-phase match.

