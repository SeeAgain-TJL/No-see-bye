#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
# The CI SSH key can only stream a release to this receiver.
[[ ${SSH_ORIGINAL_COMMAND:-} =~ ^deploy\ ([a-f0-9]{64})\ ([a-f0-9]{40})$ ]] || exit 64
digest=${BASH_REMATCH[1]}
commit=${BASH_REMATCH[2]}
bundle=$(mktemp /var/tmp/no-see-bye-ci.XXXXXX.tar.gz)
trap 'rm -f -- "$bundle"' EXIT
# Bound incoming storage to 600 MiB, including one byte to detect oversize input.
timeout 300 head -c 629145601 > "$bundle"
[[ $(stat -c %s "$bundle") -le 629145600 ]] || exit 65
bash /root/no-see-bye/deploy/deploy-release.sh "$bundle" "$digest" "$commit"
