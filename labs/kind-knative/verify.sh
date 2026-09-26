#!/usr/bin/env bash
# Lab 00 — A Knative Cluster You Own. Checks the cluster `kn quickstart kind` built.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=../common/lib.sh
. "$HERE/../common/lib.sh"
require_prefix
require_cmd kubectl

echo "lab 00 · kind-knative · prefix=$PREFIX"

check context "kubectl points at the kind-knative cluster" \
  test "$(kubectl config current-context 2>/dev/null)" = "kind-knative"

serving_ok() {
  for d in controller activator autoscaler webhook; do k_available "$d" knative-serving || return 1; done
}
check serving "Knative Serving controller, activator, autoscaler and webhook are Available" serving_ok

kourier_ok() {
  k_available 3scale-kourier-gateway kourier-system &&
    [ "$(kubectl get cm config-network -n knative-serving -o jsonpath='{.data.ingress\.class}')" = "kourier.ingress.networking.knative.dev" ]
}
check kourier "Kourier gateway is Available and is the configured ingress class" kourier_ok

eventing_ok() {
  for d in eventing-controller eventing-webhook mt-broker-controller mt-broker-ingress mt-broker-filter; do
    k_available "$d" knative-eventing || return 1
  done
}
check eventing "Knative Eventing controller and the multi-tenant broker are Available" eventing_ok

domain_ok() {
  kubectl get cm config-domain -n knative-serving -o jsonpath='{.data}' | grep -q '"127.0.0.1.sslip.io"'
}
check domain "config-domain serves routes on 127.0.0.1.sslip.io" domain_ok

finish kind-knative
