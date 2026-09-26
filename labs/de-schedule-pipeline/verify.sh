#!/usr/bin/env bash
# Lab 08 — Your First Pipeline.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=../common/lib.sh
. "$HERE/../common/lib.sh"
cd "$HERE" || exit 2
load_de_env
require_prefix
require_cmd vastde python3

FN="$PREFIX-echo"; TRIG="$PREFIX-tick"; PIPE="$PREFIX-tick-pipeline"
echo "lab 08 · de-schedule-pipeline · pipeline=$PIPE"

check function "function $FN is published" \
  de_get functions "$FN" '(d.get("last_published_revision_number") or 0) >= 1'

check trigger "schedule trigger $TRIG exists" \
  de_get triggers "$TRIG" 'd.get("config", {}).get("cron_schedule")'

check pipeline "pipeline $PIPE is Ready" \
  de_get pipelines "$PIPE" 'd.get("status") == "Ready"'

check logs "pipeline logs contain a handler line" \
  sh -c "printf '%s' \"\$0\" | grep -q 'echo r[0-9]*: vastdata.com:Schedule'" "$(de_logs "$PIPE" 30m)"

finish de-schedule-pipeline
