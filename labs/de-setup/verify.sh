#!/usr/bin/env bash
# Lab 06 — Point vastde at Your Tenant.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=../common/lib.sh
. "$HERE/../common/lib.sh"
cd "$HERE" || exit 2
load_de_env
require_prefix
require_cmd vastde docker curl

echo "lab 06 · de-setup · prefix=$PREFIX"

check cli "vastde is on PATH and reports a version" sh -c 'vastde version | grep -Eq "^v?[0-9]+\.[0-9]+"'

de_env_ok() {
  local v
  for v in PREFIX VMS_URL TENANT K8S_CLUSTER NAMESPACE REGISTRY REGISTRY_URL BROKER TOPIC BUCKET S3_ENDPOINT BUILDER_IMAGE; do
    eval "val=\${$v:-}"
    # shellcheck disable=SC2154
    [ -n "$val" ] || return 1
    case "$val" in *example.internal*|my-*) return 1 ;; esac
  done
  case "$REGISTRY_URL" in *://*) return 1 ;; esac
}
check de-env "de.env defines every placeholder the DataEngine labs use" de_env_ok

check login "a tenant-scoped list call succeeds" de_json functions list

check compute "the compute cluster named in de.env is linked to the tenant" \
  de_json compute-clusters get "$K8S_CLUSTER"

check registry "the container registry named in de.env is linked to the tenant" \
  de_json container-registries get "$REGISTRY"

# registry_tls_ok — the registry's TLS certificate verifies, with the CA file
# Docker would use for it if there is one. 401 counts: it means TLS worked
# and the registry wants a login.
registry_tls_ok() {
  local ca="" f code
  for f in "$HOME/.docker/certs.d/$REGISTRY_URL/ca.crt" "/etc/docker/certs.d/$REGISTRY_URL/ca.crt"; do
    [ -f "$f" ] && { ca=$f; break; }
  done
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 ${ca:+--cacert "$ca"} "https://$REGISTRY_URL/v2/")
  [ "$code" = 200 ] || [ "$code" = 401 ]
}
check registry-tls "Docker can trust the registry's TLS certificate" registry_tls_ok

check docker "the Docker daemon vastde will use accepts its API and image store" \
  "$HERE/vastde-docker.sh" status

finish de-setup
