#!/usr/bin/env bash
# Drive <prefix>-sleepy with load from inside the cluster and record what the
# autoscaler did.
#
#   ./measure.sh [concurrency] [duration] [sleep-ms]      defaults: 50 30s 100
#
# The load generator is fortio, run as a one-off pod, so there is nothing to
# install on your machine. It calls the service's cluster-local address, which
# goes through Kourier's internal gateway and — when the revision is cold —
# the activator, exactly like external traffic.
#
# Samples the revision's Running pod count every second during the load, then
# keeps sampling after the load stops until the count reaches zero. Writes
# results.env (PEAK_PODS, ZERO_SECONDS, CONCURRENCY) and prints a timeline.
set -u
: "${PREFIX:?export PREFIX first}"
C="${1:-50}"; D="${2:-30s}"; MS="${3:-100}"
SVC="$PREFIX-sleepy"
kubectl get ksvc "$SVC" >/dev/null 2>&1 || { echo "service $SVC not found — create it first (step 1)"; exit 1; }
URL="http://$SVC.default.svc.cluster.local?sleep=$MS"

pods() {
  kubectl get pods -l serving.knative.dev/service="$SVC" --field-selector=status.phase=Running \
    -o name 2>/dev/null | wc -l | tr -d ' '
}

kubectl delete pod "$PREFIX-load" --ignore-not-found >/dev/null 2>&1
echo "load: fortio load -c $C -t $D -qps 0 $URL"
kubectl run "$PREFIX-load" --restart=Never --image=fortio/fortio:latest -- \
  load -c "$C" -t "$D" -qps 0 "$URL" >/dev/null
kubectl wait --for=jsonpath='{.status.phase}'=Running pod/"$PREFIX-load" --timeout=120s >/dev/null 2>&1

start=$(date +%s); peak=0
printf 't(s)  pods\n'
while [ "$(kubectl get pod "$PREFIX-load" -o jsonpath='{.status.phase}' 2>/dev/null)" = "Running" ]; do
  n=$(pods); [ "$n" -gt "$peak" ] && peak=$n
  printf '%4d  %s\n' "$(( $(date +%s) - start ))" "$n"
  sleep 1
done
end=$(date +%s)
kubectl logs "$PREFIX-load" 2>/dev/null | grep -E '^Ended after|^# target (50|99)%|^Code ' | sed 's/^/  fortio: /'
kubectl delete pod "$PREFIX-load" --ignore-not-found >/dev/null 2>&1

echo "load finished after $((end - start))s; peak pods: $peak. waiting for zero…"
while [ "$(pods)" -gt 0 ]; do sleep 2; done
zero=$(( $(date +%s) - end ))
echo "reached zero ${zero}s after the last request."
printf 'PEAK_PODS=%s\nZERO_SECONDS=%s\nCONCURRENCY=%s\n' "$peak" "$zero" "$C" > results.env
echo "wrote results.env"
