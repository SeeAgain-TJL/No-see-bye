#!/usr/bin/env bash
set -Eeuo pipefail
root=$(mktemp -d)
[[ $root == /tmp/* || $root == /var/tmp/* ]] || exit 1
trap 'rm -rf -- "$root"' EXIT
node_bin=${TEST_NODE:-$(command -v node)}
script=$(cd "$(dirname "$0")/.." && pwd)/deploy/deploy-release.sh
commit=1111111111111111111111111111111111111111

for scenario in success checksum-failure health-failure; do
  fixture=$root/$scenario
  mkdir -p "$fixture/bin" "$fixture/no-see-bye/data" "$fixture/source/no-see-bye/runtime"
  printf 'original user data' > "$fixture/no-see-bye/data/app.db"
  printf 'original config' > "$fixture/no-see-bye/config.env"
  printf 'previous code' > "$fixture/no-see-bye/server.js"
  printf 'active' > "$fixture/service"
  printf 'new code' > "$fixture/source/no-see-bye/server.js"
  printf '{"commit":"%s","application":"no-see-bye","platform":"linux","arch":"x64"}' "$commit" > "$fixture/source/no-see-bye/release.json"
  printf '#!/bin/sh\nexec "%s" "$@"\n' "$node_bin" > "$fixture/source/no-see-bye/runtime/node"
  chmod +x "$fixture/source/no-see-bye/runtime/node"
  cat > "$fixture/bin/systemctl" <<'STUB'
#!/bin/bash
case "$1" in
  is-active) [[ ${*: -1} == no-see-bye && $(cat "$FIXTURE/service") == active ]] ;;
  cat) exit 1 ;;
  stop) printf inactive > "$FIXTURE/service" ;;
  start) printf active > "$FIXTURE/service" ;;
  *) exit 1 ;;
esac
STUB
  cat > "$fixture/bin/curl" <<'STUB'
#!/bin/bash
[[ ! -f $FIXTURE/fail-health ]] || exit 22
printf '{"status":"ok"}'
STUB
  printf '#!/bin/sh\nexit 0\n' > "$fixture/bin/sleep"
  chmod +x "$fixture/bin/"*
  # Keep the production script's fixed-path contract; rewrite a test copy only.
  sed "s@/root/@$fixture/@g" "$script" > "$fixture/deploy.sh"
  tar -czf "$fixture/release.tar.gz" -C "$fixture/source" no-see-bye
  digest=$(sha256sum "$fixture/release.tar.gz" | cut -d ' ' -f 1)
  [[ $scenario != checksum-failure ]] || digest=0000000000000000000000000000000000000000000000000000000000000000
  [[ $scenario != health-failure ]] || touch "$fixture/fail-health"
  status=0
  PATH="$fixture/bin:$PATH" FIXTURE="$fixture" bash "$fixture/deploy.sh" "$fixture/release.tar.gz" "$digest" "$commit" > "$fixture/output" 2>&1 || status=$?
  if [[ $scenario == success ]]; then
    [[ $status == 0 && $(cat "$fixture/no-see-bye/server.js") == 'new code' ]]
    test -f "$fixture/no-see-bye-backups/"*/state.tar.gz
  else
    [[ $status != 0 && $(cat "$fixture/no-see-bye/server.js") == 'previous code' ]]
  fi
  [[ $(cat "$fixture/no-see-bye/data/app.db") == 'original user data' ]]
  [[ $(cat "$fixture/no-see-bye/config.env") == 'original config' ]]
  [[ $(cat "$fixture/service") == active ]]
  echo "PASS deployment $scenario"
done
