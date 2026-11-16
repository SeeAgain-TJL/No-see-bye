#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# Fixed production paths: neither the SSH caller nor the archive chooses them.
app=/root/no-see-bye
bundle=${1:?release archive required}
digest=${2:?SHA-256 required}
commit=${3:?commit required}
[[ $digest =~ ^[a-f0-9]{64}$ && $commit =~ ^[a-f0-9]{40}$ ]] || exit 64
[[ -d $app && ! -L $app && -f $app/config.env && -d $app/data ]] || exit 65
exec 9>/root/.no-see-bye-deploy.lock
flock -n 9 || { echo 'Another deployment is running' >&2; exit 75; }
printf '%s  %s\n' "$digest" "$bundle" | sha256sum --check --status

stage=$(mktemp -d /root/.no-see-bye-stage.XXXXXX)
backup=/root/no-see-bye-backups/$(date -u +%Y%m%dT%H%M%SZ)-${commit:0:12}
mkdir -p "$backup"
tar -tzf "$bundle" > "$stage/archive-files"
if grep -Eq '(^/|(^|/)\.\.(/|$)|^[^/]+$)' "$stage/archive-files" || grep -Ev '^no-see-bye(/|$)' "$stage/archive-files"; then
  echo 'Invalid release archive paths' >&2
  exit 65
fi
tar -xzf "$bundle" -C "$stage" --no-same-owner
next=$stage/no-see-bye
[[ -f $next/server.js && -f $next/runtime/node && ! -e $next/data && ! -e $next/config.env ]] || exit 65
chmod +x "$next/runtime/node"
"$next/runtime/node" -e 'const fs=require("fs");const r=JSON.parse(fs.readFileSync(process.argv[1]));if(r.commit!==process.argv[2]||r.application!=="no-see-bye"||r.platform!=="linux"||r.arch!=="x64")process.exit(1)' "$next/release.json" "$commit"

timer_active=false
systemctl is-active --quiet no-see-bye-cleanup.timer && timer_active=true
app_active=false
systemctl is-active --quiet no-see-bye && app_active=true
shared=(data config.env)
shopt -s nullglob
for env_file in "$app"/.env*; do
  [[ ${env_file##*/} == .env.example ]] || shared+=("${env_file##*/}")
done
stopped=false
success=false
rollback() {
  local status=$?
  trap - EXIT
  if [[ $success == false && $stopped == true ]]; then
    set +e
    systemctl stop no-see-bye
    if [[ -d $backup/application ]]; then
      for item in "${shared[@]}"; do
        if [[ -e $app/$item && ! -e $backup/application/$item ]]; then mv "$app/$item" "$backup/application/$item"; fi
        if [[ -e $next/$item && ! -e $backup/application/$item ]]; then mv "$next/$item" "$backup/application/$item"; fi
      done
      if [[ -d $app ]]; then mv "$app" "$backup/failed-release"; fi
      mv "$backup/application" "$app"
    else
      for item in "${shared[@]}"; do
        if [[ -e $next/$item && ! -e $app/$item ]]; then mv "$next/$item" "$app/$item"; fi
      done
    fi
    [[ $app_active == false ]] || systemctl start no-see-bye
    echo "Deployment failed; previous application restored. Backup: $backup" >&2
  fi
  if [[ $timer_active == true && $stopped == true ]]; then systemctl start no-see-bye-cleanup.timer || true; fi
  exit "$status"
}
trap rollback EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
stopped=true
if [[ $timer_active == true ]]; then systemctl stop no-see-bye-cleanup.timer; fi
if systemctl cat no-see-bye-cleanup.service >/dev/null 2>&1; then systemctl stop no-see-bye-cleanup.service; fi
systemctl stop no-see-bye

# Back up the database, media and configuration while writers are stopped.
tar -czf "$backup/state.tar.gz" -C "$app" "${shared[@]}"
for item in "${shared[@]}"; do
  [[ ! -e $app/$item ]] || mv "$app/$item" "$next/$item"
done
mv "$app" "$backup/application"
mv "$next" "$app"
systemctl start no-see-bye
healthy=false
for attempt in {1..45}; do
  if curl --fail --silent --show-error --max-time 3 http://127.0.0.1:3000/api/health 2>/dev/null | grep -q '"status":"ok"'; then healthy=true; break; fi
  sleep 1
done
[[ $healthy == true ]] || { echo 'Health check failed' >&2; exit 1; }
systemctl is-active --quiet no-see-bye
# Verify the real HTTPS virtual host and certificate through the local Nginx.
# The separate runner probe reports Internet routing problems independently.
curl --fail --silent --show-error --max-time 10 --retry 3 --retry-delay 2 \
  --resolve tingjieli.shop:443:127.0.0.1 https://tingjieli.shop/api/health | grep -q '"status":"ok"'
success=true
echo "DEPLOYED $commit"
echo "BACKUP $backup"
