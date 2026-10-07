#!/usr/bin/env bash
# Deploys the registry to the Netlify project "rocket-nouilles-registry".
#
# The registry is deployed from a self-contained staging copy (own package.json,
# own node_modules) so that the Netlify CLI sees registry/ as the project root,
# whatever the surrounding repository layout (monorepo, git worktree...).
set -euo pipefail

SITE_ID="${NETLIFY_SITE_ID:-1deb2eae-20d1-46c6-86fb-47490d30d0cf}"
HERE="$(cd "$(dirname "$0")" && pwd)"
STAGE="$(mktemp -d "${TMPDIR:-/tmp}/rocketnouilles-registry.XXXXXX")"

cp -R "$HERE/src" "$HERE/netlify" "$HERE/public" "$HERE/netlify.toml" "$STAGE/"
cat > "$STAGE/package.json" <<'JSON'
{
  "name": "rocket-nouilles-registry",
  "private": true,
  "type": "module",
  "dependencies": { "@netlify/database": "^2.0.1" }
}
JSON

cd "$STAGE"
npm install --silent --no-audit --no-fund
netlify deploy --prod --site "$SITE_ID" "$@"
echo "Deployed from $STAGE"
