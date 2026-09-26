#!/usr/bin/env bash
# POST one CloudEvent (binary mode) into <prefix>-broker from a pod inside the
# cluster — the broker ingress is not exposed outside it.
set -u
: "${PREFIX:?export PREFIX first}"
BROKER_URL=$(kubectl get broker "$PREFIX-broker" -o jsonpath='{.status.address.url}')
[ -n "$BROKER_URL" ] || { echo "broker $PREFIX-broker has no address yet"; exit 1; }
ID="order-$(date +%s)"
kubectl run "$PREFIX-curl" --rm -i --restart=Never --quiet --image=curlimages/curl:8.10.1 -- \
  curl -s -o /dev/null -w "broker ingress answered HTTP %{http_code}\n" -X POST "$BROKER_URL" \
  -H "Ce-Id: $ID" \
  -H "Ce-Specversion: 1.0" \
  -H "Ce-Type: dev.functionspace.order.created" \
  -H "Ce-Source: /labs/broker-trigger/$PREFIX" \
  -H "Content-Type: application/json" \
  -d "{\"order\":\"$ID\",\"sku\":\"fs-001\",\"qty\":1}"
echo "sent event id $ID"
