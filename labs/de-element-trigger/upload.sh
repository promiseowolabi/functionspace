#!/usr/bin/env bash
# Upload one small CSV under <PREFIX>/ in the lab bucket.
#
# Run it on a machine that can reach your VAST cluster's S3 endpoint — often
# not your laptop. It needs only the AWS CLI with credentials for the bucket
# and the three values below (copy them from de.env, or source de.env).
#
#   BUCKET=… S3_ENDPOINT=… PREFIX=… ./upload.sh
set -eu
: "${BUCKET:?}" "${S3_ENDPOINT:?}" "${PREFIX:?}"
KEY="$PREFIX/hello-$(date +%s).csv"
TMP=$(mktemp)
printf 'id,value\n1,42\n' > "$TMP"
aws s3 cp "$TMP" "s3://$BUCKET/$KEY" --endpoint-url "$S3_ENDPOINT" --only-show-errors
rm -f "$TMP"
echo "uploaded s3://$BUCKET/$KEY at $(date -u +%H:%M:%S) UTC"
