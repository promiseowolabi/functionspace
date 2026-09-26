#!/usr/bin/env bash
# Lab 01 — One Service, Two Revisions.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=../common/lib.sh
. "$HERE/../common/lib.sh"
require_prefix
require_cmd kubectl curl

SVC="$PREFIX-hello"
echo "lab 01 · first-service · service=$SVC"

check ksvc-ready "Service $SVC is Ready" k_ready ksvc "$SVC"

two_revisions() {
  [ "$(kubectl get revision -l serving.knative.dev/service="$SVC" -o name | wc -l)" -ge 2 ]
}
check two-revisions "at least two Revisions exist for it" two_revisions

latest_serving() {
  local latest traffic
  latest=$(kubectl get ksvc "$SVC" -o jsonpath='{.status.latestReadyRevisionName}')
  traffic=$(kubectl get ksvc "$SVC" -o jsonpath='{.status.traffic[?(@.percent==100)].revisionName}')
  [ -n "$latest" ] && [ "$latest" = "$traffic" ]
}
check latest-serving "the latest Revision carries 100% of traffic" latest_serving

responds() {
  local url body
  url=$(kubectl get ksvc "$SVC" -o jsonpath='{.status.url}')
  body=$(curl -s --max-time 20 "$url" || curl -s --max-time 20 -H "Host: ${url#http://}" http://127.0.0.1)
  [ "$body" = "Hello $PREFIX!" ]
}
check responds "the Route URL answers with the updated TARGET (Hello $PREFIX!)" responds

finish first-service
