#!/usr/bin/env bash
# Send N requests to <prefix>-rollout and count the answers.  ./sample.sh [N=200]
set -u
: "${PREFIX:?export PREFIX first}"
N="${1:-200}"
URL=$(kubectl get ksvc "$PREFIX-rollout" -o jsonpath='{.status.url}')
for _ in $(seq "$N"); do curl -s --max-time 10 "$URL"; echo; done | grep -v '^$' | sort | uniq -c
