#!/usr/bin/env bash
# Lab 09 — An Upload Is an Event.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=../common/lib.sh
. "$HERE/../common/lib.sh"
cd "$HERE" || exit 2
load_de_env
require_prefix
require_cmd vastde python3

TRIG="$PREFIX-uploads"; PIPE="$PREFIX-uploads-pipeline"
echo "lab 09 · de-element-trigger · pipeline=$PIPE"

check trigger "element trigger $TRIG watches ObjectCreated on the lab bucket" \
  de_get triggers "$TRIG" "d.get('source_bucket_name') == '$BUCKET' and 'ObjectCreated:*' in (d.get('config', {}).get('events') or [])"

check pipeline "pipeline $PIPE is Ready" \
  de_get pipelines "$PIPE" 'd.get("status") == "Ready"'

# The checks below read the pipeline's logs, not the bucket, so they work from
# machines that cannot reach the S3 endpoint.
LOGS=$(de_logs "$PIPE" 60m)
RUNTIME=$(vastde logs get "$PIPE" --since 60m --order-by desc --limit 1000 2>/dev/null)  # all scopes: --scope runtime matches nothing (the value is vast-runtime)

check upload "a test object was uploaded under the $PREFIX/ key prefix" \
  sh -c "printf '%s' \"\$0\" | grep -q 'EventType: vastdata.com:Element.ElementCreated, EventSource: vastdata.com:$TRIG\\.'" "$RUNTIME"

check observed "pipeline logs show the handler received that object key" \
  sh -c "printf '%s' \"\$0\" | grep -Eq 'echo r[0-9]+: vastdata.com:Element\\.ElementCreated bucket=$BUCKET key=$PREFIX/'" "$LOGS"

finish de-element-trigger
