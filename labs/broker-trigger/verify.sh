#!/usr/bin/env bash
# Lab 04 — Events With Nobody Waiting.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=../common/lib.sh
. "$HERE/../common/lib.sh"
require_prefix
require_cmd kubectl

B="$PREFIX-broker"
echo "lab 04 · broker-trigger · broker=$B"

check broker "Broker $B is Ready" k_ready broker "$B"

source_ok() {
  k_ready pingsource "$PREFIX-ping" &&
    [ "$(kubectl get pingsource "$PREFIX-ping" -o jsonpath='{.spec.sink.ref.kind}/{.spec.sink.ref.name}')" = "Broker/$B" ]
}
check source "PingSource $PREFIX-ping is Ready and targets the broker" source_ok

triggers_ok() {
  local types
  types=$(kubectl get triggers -o jsonpath="{range .items[?(@.spec.broker==\"$B\")]}{.spec.filter.attributes.type}{\"\\n\"}{end}" | grep -v '^$' | sort -u | wc -l)
  [ "$types" -ge 2 ]
}
check triggers "two Triggers filter on different CloudEvent types" triggers_ok

logs_of() { kubectl logs -l serving.knative.dev/service="$1" -c user-container --tail=-1 2>/dev/null; }

delivered() {
  logs_of "$PREFIX-display" | grep -q "source: /apis/v1/namespaces/default/pingsources/$PREFIX-ping"
}
check delivered "the display sink logged a heartbeat event" delivered

dead_lettered() {
  local l
  l=$(logs_of "$PREFIX-dls")
  printf '%s' "$l" | grep -q "type: dev.functionspace.order.created" &&
    printf '%s' "$l" | grep -q "knativeerrorcode: 503"
}
check dead-lettered "the dead-letter sink received an event the failing sink rejected" dead_lettered

finish broker-trigger
