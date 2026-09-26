#!/usr/bin/env bash
# functionspace — shared helpers for every lab's verify.sh.
#
# A verify.sh sources this file, calls `check <id> <description> <command...>`
# once per check, then `finish <lab-id>`. Each check runs its command quietly;
# the check passes when the command exits 0. `finish` prints a summary and,
# when every check passed, the completion code the site accepts.
#
# The completion code is sha256("functionspace:<lab>:<prefix>")[:8]. It marks
# progress; it does not prove it. Keep fs_code in lock-step with
# src/lib/lab-code.ts — tests/labs.test.ts checks both.

set -u

FS_PASS=0
FS_FAIL=0
FS_FAILED_IDS=()

if [ -t 1 ]; then
  FS_GREEN=$'\033[32m'; FS_RED=$'\033[31m'; FS_DIM=$'\033[2m'; FS_BOLD=$'\033[1m'; FS_RESET=$'\033[0m'
else
  FS_GREEN=''; FS_RED=''; FS_DIM=''; FS_BOLD=''; FS_RESET=''
fi

# require_prefix — PREFIX must be set and be a valid DNS-1123 label fragment.
require_prefix() {
  if [ -z "${PREFIX:-}" ]; then
    echo "${FS_RED}PREFIX is not set.${FS_RESET} Run: export PREFIX=<your-handle>   (the same value you saved on the site)" >&2
    exit 2
  fi
  if ! printf '%s' "$PREFIX" | grep -Eq '^[a-z][a-z0-9-]{1,18}[a-z0-9]$'; then
    echo "${FS_RED}PREFIX '$PREFIX' is not valid.${FS_RESET} 3–20 chars: lowercase letters, digits, hyphens; start with a letter." >&2
    exit 2
  fi
}

# require_cmd <cmd>... — fail fast with a readable message.
require_cmd() {
  local missing=0
  for c in "$@"; do
    if ! command -v "$c" >/dev/null 2>&1; then
      echo "${FS_RED}missing tool:${FS_RESET} $c" >&2
      missing=1
    fi
  done
  [ "$missing" -eq 0 ] || exit 2
}

# check <id> <description> <command...>
check() {
  local id="$1" desc="$2"
  shift 2
  if "$@" >/dev/null 2>&1; then
    printf '  %s✓%s %s %s[%s]%s\n' "$FS_GREEN" "$FS_RESET" "$desc" "$FS_DIM" "$id" "$FS_RESET"
    FS_PASS=$((FS_PASS + 1))
  else
    printf '  %s✗%s %s %s[%s]%s\n' "$FS_RED" "$FS_RESET" "$desc" "$FS_DIM" "$id" "$FS_RESET"
    FS_FAIL=$((FS_FAIL + 1))
    FS_FAILED_IDS+=("$id")
  fi
}

# fs_sha256 — portable sha256 of stdin, hex only.
fs_sha256() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum | cut -d' ' -f1
  else shasum -a 256 | cut -d' ' -f1
  fi
}

# fs_code <lab-id> <prefix>
fs_code() {
  local hex
  hex=$(printf 'functionspace:%s:%s' "$1" "$2" | fs_sha256 | cut -c1-8)
  printf 'FS-%s-%s\n' "$(printf '%s' "$1" | tr '[:lower:]' '[:upper:]')" "$hex"
}

# finish <lab-id>
finish() {
  local lab="$1"
  echo
  if [ "$FS_FAIL" -eq 0 ]; then
    echo "${FS_GREEN}${FS_BOLD}all ${FS_PASS} checks passed.${FS_RESET}"
    echo "completion code: ${FS_BOLD}$(fs_code "$lab" "$PREFIX")${FS_RESET}"
    exit 0
  else
    echo "${FS_RED}${FS_FAIL} of $((FS_PASS + FS_FAIL)) checks failed:${FS_RESET} ${FS_FAILED_IDS[*]}"
    echo "fix those and re-run; the guide's troubleshooting section covers each one."
    exit 1
  fi
}

# ---------- Kubernetes helpers ----------

# k_ready <kind> <name> [namespace] — the object's Ready condition is True.
k_ready() {
  local ns="${3:-default}"
  [ "$(kubectl get "$1" "$2" -n "$ns" -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>/dev/null)" = "True" ]
}

# k_available <deployment> <namespace>
k_available() {
  [ "$(kubectl get deployment "$1" -n "$2" -o jsonpath='{.status.conditions[?(@.type=="Available")].status}' 2>/dev/null)" = "True" ]
}

# ---------- DataEngine helpers ----------

# load_de_env — source de.env from the lab folder or its parent, and check it.
load_de_env() {
  local f=""
  for c in ./de.env ../de.env "${FS_DE_ENV:-}"; do
    if [ -n "$c" ] && [ -f "$c" ]; then f="$c"; break; fi
  done
  if [ -z "$f" ]; then
    echo "${FS_RED}de.env not found.${FS_RESET} Copy de.env.example from lab 06 next to your lab folders and fill it in." >&2
    exit 2
  fi
  # shellcheck disable=SC1090
  . "$f"
  export PREFIX="${PREFIX:-}"
}

# de_json <vastde args...> — run vastde with JSON output, quietly.
de_json() {
  vastde "$@" -o json --silent 2>/dev/null
}

# fs_render <template> — print the template with ${VAR} replaced by the
# de.env values. Only the known lab variables are substituted, so anything
# else in the file (including other $ signs) is left alone.
fs_render() {
  local out
  out=$(cat "$1")
  local v val
  for v in PREFIX VMS_URL TENANT K8S_CLUSTER NAMESPACE REGISTRY REGISTRY_URL BROKER TOPIC BUCKET S3_ENDPOINT BUILDER_IMAGE; do
    eval "val=\${$v:-}"
    # shellcheck disable=SC2154
    out=${out//\$\{$v\}/$val}
  done
  printf '%s\n' "$out"
}

# de_get <kind> <name> <python-expression over d> — evaluate against the
# object's JSON; succeeds when the expression is truthy. Example:
#   de_get functions alice-echo 'd["last_published_revision_number"] >= 1'
de_get() {
  local json
  json=$(vastde "$1" get "$2" -o json --silent 2>/dev/null) || return 1
  printf '%s' "$json" | python3 -c "import json,sys; d=json.load(sys.stdin); sys.exit(0 if ($3) else 1)"
}

# de_logs <pipeline> [since] — the pipeline's USER log lines, newest first.
# `vastde logs get` returns at most 100 records, oldest first, by default — over
# a long window the lines you want fall off the end. Hence the three flags.
de_logs() {
  vastde logs get "$1" --since "${2:-15m}" --scope user --order-by desc --limit 1000 2>/dev/null
}
