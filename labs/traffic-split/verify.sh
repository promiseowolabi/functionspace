#!/usr/bin/env bash
# Lab 03 — Blue, Green, Eighty-Twenty.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=../common/lib.sh
. "$HERE/../common/lib.sh"
require_prefix
require_cmd kubectl curl

SVC="$PREFIX-rollout"
echo "lab 03 · traffic-split · service=$SVC"

check ksvc-ready "Service $SVC is Ready" k_ready ksvc "$SVC"

tag_rev() { kubectl get ksvc "$SVC" -o jsonpath="{.status.traffic[?(@.tag==\"$1\")].revisionName}" 2>/dev/null; }
tag_pct() { kubectl get ksvc "$SVC" -o jsonpath="{.status.traffic[?(@.tag==\"$1\")].percent}" 2>/dev/null; }

tags_ok() { [ "$(tag_rev blue)" = "$SVC-blue" ] && [ "$(tag_rev green)" = "$SVC-green" ]; }
check tags "revisions are tagged blue and green" tags_ok

split_ok() { [ "$(tag_pct blue)" = "80" ] && [ "$(tag_pct green)" = "20" ]; }
check split "traffic is split 80 blue / 20 green" split_ok

tag_urls_ok() {
  local b g
  b=$(curl -s --max-time 20 "http://blue-$SVC.default.127.0.0.1.sslip.io")
  g=$(curl -s --max-time 20 "http://green-$SVC.default.127.0.0.1.sslip.io")
  [ "$b" = "Hello blue!" ] && [ "$g" = "Hello green!" ]
}
check tag-urls "blue-… and green-… tag URLs each answer with their own colour" tag_urls_ok

finish traffic-split
