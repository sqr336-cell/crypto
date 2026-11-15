#!/usr/bin/env bash
# Builds the static site: landing page + legal pages + the web demo under /app.
# Output: landing/ (deploy as-is on Cloudflare Pages, Netlify, etc.)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Legal pages from the Markdown drafts.
render() {
  local title="$1" src="$2" out="$3"
  {
    printf '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>%s — BEATLINK</title>' "$title"
    printf '<link rel="icon" href="assets/favicon.png"><link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;600&family=Syne:wght@800&display=swap" rel="stylesheet">'
    printf '<style>body{margin:0;background:#0e0d12;color:#eeebf5;font:400 16px/1.65 "Instrument Sans",system-ui,sans-serif}main{max-width:720px;margin:0 auto;padding:48px 20px 96px}h1,h2{font-family:Syne,sans-serif;letter-spacing:-.02em}h1{font-size:40px;line-height:1.05}a{color:#a99bff}table{border-collapse:collapse;width:100%%;font-size:14px}td,th{border-top:1px solid rgba(238,235,245,.12);padding:8px;text-align:left;vertical-align:top}blockquote{margin:0;padding:12px 16px;border-left:3px solid #a99bff;background:#16151b;color:#9c98ab}</style></head><body><main><p><a href="./">← BEATLINK</a></p>'
    npx --yes marked@15.0.12 --gfm < "$src"
    printf '</main></body></html>\n'
  } > "$out"
}
render "Confidentialité" legal/politique-de-confidentialite.md landing/privacy.html
render "Conditions d'utilisation" legal/conditions-utilisation.md landing/terms.html

# Web demo (no backend, fictional data) under /app.
if [ "${SKIP_APP:-0}" != "1" ]; then
  rm -rf landing/app
  (cd mobile && EXPO_BASE_URL=/app EXPO_PUBLIC_FORCE_DEMO=1 npx expo export --platform web --output-dir ../landing/app)
fi
printf '/app/* /app/index.html 200\n' > landing/_redirects
echo "Static site ready in landing/"
