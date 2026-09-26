#!/usr/bin/env bash
# Lab 07 — Build It, Run It Here.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=../common/lib.sh
. "$HERE/../common/lib.sh"
cd "$HERE" || exit 2
load_de_env
require_prefix
require_cmd vastde docker curl

FN="$PREFIX-echo"
echo "lab 07 · de-local-function · function=$FN"

source_ok() {
  grep -Eq '^def init\(ctx\)' "$HERE/src/main.py" && grep -Eq '^def handler\(ctx, event\)' "$HERE/src/main.py"
}
check source "the function source defines init(ctx) and handler(ctx, event)" source_ok

check image "the local image $FN:latest exists" docker image inspect "$FN:latest"

check localrun "the function answers on localhost:8080" \
  sh -c '[ "$(curl -s --max-time 5 http://localhost:8080/readiness)" = "Ready" ]'

invoke_ok() {
  vastde functions invoke --event "$HERE/cloudevent.yaml" --url http://localhost:8080/ 2>&1 | grep -q 'Status: 2'
}
check invoke "a CloudEvent invoke returns HTTP 2xx" invoke_ok

finish de-local-function
