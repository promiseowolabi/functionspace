#!/usr/bin/env bash
# ./render.sh [pipeline.yaml.tmpl] > pipeline.yaml — fill ${…} from ../de.env
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE="$(cd "$(dirname "${1:-$HERE/pipeline.yaml.tmpl}")" && pwd)/$(basename "${1:-pipeline.yaml.tmpl}")"
. "$HERE/../common/lib.sh"
cd "$HERE" || exit 2
load_de_env
fs_render "$TEMPLATE"
