#!/usr/bin/env bash
# Deploy to Vercel production with LAB mode on, then run the recipe check.
# Needs: VERCEL_TOKEN (https://vercel.com/account/tokens), optionally VERCEL_ORG_ID / VERCEL_SCOPE.
#   VERCEL_TOKEN=... ./scripts/deploy-vercel.sh [--no-lab] [project-name]
set -euo pipefail
cd "$(dirname "$0")/.."
LAB=1; [ "${1:-}" = "--no-lab" ] && { LAB=0; shift; }
NAME="${1:-womens-soccer-playable}"
: "${VERCEL_TOKEN:?set VERCEL_TOKEN}"
SCOPE=(); [ -n "${VERCEL_SCOPE:-}" ] && SCOPE=(--scope "$VERCEL_SCOPE")
URL=$(npx --yes vercel@latest deploy --prod --yes --token "$VERCEL_TOKEN" "${SCOPE[@]}" \
  --name "$NAME" -e LAB="$LAB" 2>/dev/null | tail -n1)
echo "Deployment: $URL"
# Prefer the stable production alias (<project>.vercel.app); unique deployment URLs may sit behind Deployment Protection.
ALIAS="https://${NAME}.vercel.app"
echo "Checking $ALIAS"
node scripts/check.js "$ALIAS/r/a1"
