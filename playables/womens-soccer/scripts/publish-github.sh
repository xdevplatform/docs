#!/usr/bin/env bash
# Create the GitHub repo and push this folder as its root.
# Needs: gh CLI authenticated as the target owner (gh auth login) with repo-create rights.
#   ./scripts/publish-github.sh [owner/name] [--private]
set -euo pipefail
cd "$(dirname "$0")/.."
REPO="${1:-dianalaurag/womens-soccer-playable}"
VIS="--public"; [ "${2:-}" = "--private" ] && VIS="--private"
[ -d .git ] || { git init -q -b main; git add -A; git commit -qm "Initial commit: Pitch Perfect women's soccer X playable"; }
gh repo create "$REPO" $VIS --source . --remote origin --push
echo "Repo: https://github.com/$REPO"
