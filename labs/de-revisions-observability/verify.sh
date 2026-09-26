#!/usr/bin/env bash
# Lab 10 — Revision 2, With Evidence.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=../common/lib.sh
. "$HERE/../common/lib.sh"
cd "$HERE" || exit 2
load_de_env
require_prefix
require_cmd vastde python3

FN="$PREFIX-echo"; PIPE="$PREFIX-uploads-pipeline"
echo "lab 10 · de-revisions-observability · function=$FN pipeline=$PIPE"

check revision "function $FN has a published revision ≥ 2" \
  de_get functions "$FN" '(d.get("last_published_revision_number") or 0) >= 2'

pipeline_on_new_revision() {
  de_get pipelines "$PIPE" 'd.get("status") == "Ready"' || return 1
  vastde pipelines get "$PIPE" --manifest -o json --silent 2>/dev/null | python3 -c '
import json, sys
d = json.load(sys.stdin); m = d.get("manifest", d)
sys.exit(0 if any(f.get("revision", 0) >= 2 for f in m.get("function_deployments", [])) else 1)'
}
check pipeline "the uploads pipeline deploys the new revision and is Ready" pipeline_on_new_revision

check logs "logs show the revision-2 handler line" \
  sh -c "printf '%s' \"\$0\" | grep -Eq 'echo r([2-9]|[1-9][0-9]+): '" "$(de_logs "$PIPE" 60m)"

telemetry() {
  vastde metrics get -p "$PIPE" -m dataengine.function.invocations -a sum -w 1h -o json 2>/dev/null | python3 -c '
import json, sys
d = json.load(sys.stdin)
vals = [p[1] or 0 for r in d.get("results", []) for g in r.get("groups", []) for p in g.get("data", [])]
sys.exit(0 if sum(vals) > 0 else 1)' && return 0
  vastde traces list "$PIPE" --since 1h 2>/dev/null | grep -q "$FN"
}
check telemetry "metrics or traces are retrievable for the pipeline" telemetry

finish de-revisions-observability
