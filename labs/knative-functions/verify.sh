#!/usr/bin/env bash
# Lab 05 — func, End to End.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=../common/lib.sh
. "$HERE/../common/lib.sh"
require_prefix
require_cmd kubectl curl

FN="$PREFIX-fn"
DIR="$HERE/$FN"
echo "lab 05 · knative-functions · function=$FN"

project_ok() {
  [ -f "$DIR/func.yaml" ] && grep -Eq "^name: $FN\$" "$DIR/func.yaml" && grep -Eq '^runtime: python$' "$DIR/func.yaml"
}
check project "func.yaml exists for $FN with the python runtime" project_ok

image_ok() { curl -s --max-time 5 http://localhost:5001/v2/_catalog | grep -q "\"$FN\""; }
check image "the function image is in the local kind registry" image_ok

ksvc_ok() {
  k_ready ksvc "$FN" &&
    [ "$(kubectl get ksvc "$FN" -o jsonpath="{.metadata.labels['function\.knative\.dev/name']}")" = "$FN" ]
}
check ksvc-ready "Knative Service $FN is Ready and labelled as a function" ksvc_ok

invoke_ok() {
  local url out
  url=$(kubectl get ksvc "$FN" -o jsonpath='{.status.url}')
  out=$(curl -s -i --max-time 20 "$url" \
    -H "Ce-Id: verify-$(date +%s)" -H "Ce-Specversion: 1.0" \
    -H "Ce-Type: dev.functionspace.order.created" -H "Ce-Source: /labs/verify" \
    -H "Content-Type: application/json" -d '{"order":"verify","sku":"fs-001","qty":1}')
  printf '%s' "$out" | head -1 | grep -q ' 200' &&
    printf '%s' "$out" | grep -Eqi '(^ce-specversion:|"specversion")'
}
check invoke "a CloudEvent sent to it returns a CloudEvent reply" invoke_ok

finish knative-functions
