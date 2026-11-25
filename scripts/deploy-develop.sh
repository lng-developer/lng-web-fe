#!/usr/bin/env bash
set -euo pipefail
test "$(hostname)" = lng
[[ "${DEPLOY_SHA:?}" =~ ^[0-9a-f]{40}$ ]]
test "$(node -p 'process.versions.node.split(".")[0]')" = 24
base=/home/lng/apps/lng-web-fe-develop
release="$base/releases/$DEPLOY_SHA-${GITHUB_RUN_ID:?}-${GITHUB_RUN_ATTEMPT:-1}"
test ! -e "$release"
mkdir -p "$release"
cp -a "${1:?artifact directory required}/dist" "$release/dist"
cp "$1/server.mjs" "$release/server.mjs"
test -f "$release/dist/index.html"
cd "$release"
DEPLOY_NODE="$(command -v node)" node --input-type=commonjs - <<'NODE'
const fs = require('fs');
fs.writeFileSync('ecosystem.develop.json', JSON.stringify({ apps: [{
  name: 'lng-web-fe', cwd: process.cwd(), script: 'server.mjs',
  interpreter: process.env.DEPLOY_NODE, instances: 1, exec_mode: 'fork',
  min_uptime: 10000, max_restarts: 5, env: { PORT: '5173' },
}]}));
NODE
previous=$(readlink -f "$base/current" || true)
rollback() {
  status=$?
  if [ "$status" -ne 0 ]; then
    if [ -n "$previous" ] && [ -f "$previous/ecosystem.develop.json" ]; then
      pm2 startOrReload "$previous/ecosystem.develop.json" --update-env
    else
      pm2 delete lng-web-fe
      pm2 start /home/lng/apps/lng-web-fe/server.mjs --name lng-web-fe --cwd /home/lng/apps/lng-web-fe
    fi
    pm2 save
  fi
  exit "$status"
}
trap rollback EXIT
pm2 startOrReload "$release/ecosystem.develop.json" --update-env
node --input-type=commonjs - <<'NODE'
const apps = JSON.parse(require('child_process').execFileSync('pm2', ['jlist'], { encoding: 'utf8' }));
if (apps.find(item => item.name === 'lng-web-fe')?.pm2_env.pm_cwd !== process.cwd()) {
  throw new Error('PM2 did not activate the intended frontend release');
}
NODE
expected=$(sha256sum dist/index.html | awk '{print $1}')
for i in {1..15}; do
  served=$(curl -fsS --max-time 5 http://127.0.0.1:5173/ | sha256sum | awk '{print $1}') || served=''
  if [ "$served" = "$expected" ]; then break; fi
  test "$i" -lt 15
  sleep 2
done
printf '%s\n' "$DEPLOY_SHA" > "$release/DEPLOYED_SHA"
ln -sfn "$release" "$base/current.next"
mv -Tf "$base/current.next" "$base/current"
pm2 save
trap - EXIT
printf 'Develop FE deployed: %s\n' "$DEPLOY_SHA"
