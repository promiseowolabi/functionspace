#!/usr/bin/env bash
# Lab 02 — Load, Panic, Zero.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=../common/lib.sh
. "$HERE/../common/lib.sh"
require_prefix
require_cmd kubectl

SVC="$PREFIX-sleepy"
echo "lab 02 · autoscaling · service=$SVC"

check ksvc-ready "Service $SVC is Ready" k_ready ksvc "$SVC"

ann() { kubectl get ksvc "$SVC" -o jsonpath="{.spec.template.metadata.annotations['autoscaling\.knative\.dev/$1']}" 2>/dev/null; }
check target "autoscaling.knative.dev/target is set to 10" test "$(ann target)" = "10"
check max-scale "autoscaling.knative.dev/max-scale is set to 10" test "$(ann max-scale)" = "10"

RESULTS="$HERE/results.env"
has_results() {
  [ -f "$RESULTS" ] && grep -Eq '^PEAK_PODS=[0-9]+$' "$RESULTS" && grep -Eq '^ZERO_SECONDS=[0-9]+$' "$RESULTS"
}
check results "results.env records a peak pod count and a scale-to-zero time" has_results

plausible() {
  has_results || return 1
  # shellcheck disable=SC1090
  . "$RESULTS"
  # With target 10 and the 70% utilisation factor, each pod is sized for 7
  # concurrent requests. Any real load should need >1 pod, and max-scale caps
  # it at 10. Scale-to-zero cannot beat the 30 s grace period, and on an idle
  # kind cluster lands around 60–95 s.
  [ "$PEAK_PODS" -ge 2 ] && [ "$PEAK_PODS" -le 10 ] && [ "$ZERO_SECONDS" -ge 30 ] && [ "$ZERO_SECONDS" -le 300 ]
}
check plausible "the recorded numbers are consistent with the configuration" plausible

finish autoscaling
