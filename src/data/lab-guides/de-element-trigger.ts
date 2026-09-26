import type { LabGuide } from './types'

const guide: LabGuide = {
  id: 'de-element-trigger',
  requires: [
    '../de.env with BUCKET and S3_ENDPOINT',
    'the published $PREFIX-echo function from lab 08',
    'vastde',
    'the AWS CLI with credentials for the bucket, on a machine that can reach the S3 endpoint',
  ],
  blocks: [
    {
      type: 'prose',
      md: `## What you will build

An **element trigger** on your bucket, filtered to keys under \`$PREFIX/\`, linked by a pipeline to the echo function. Then you upload a file with the ordinary S3 API and watch the handler receive the bucket and key — the "file landed, do something" pattern from D1.L1, for real.`,
    },
    {
      type: 'callout',
      variant: 'info',
      title: 'The S3 endpoint may not be reachable from your laptop',
      md: `The VMS (which \`vastde\` talks to) and the S3 data endpoint are often on different networks. On the reference setup, \`vastde\` worked from a laptop over VPN but the tenant's S3 endpoint was only reachable from a host on the data network, so the upload step ran there. Everything else in this lab — including \`verify.sh\`, which reads logs rather than the bucket — works from wherever \`vastde\` does.`,
    },
    {
      type: 'prose',
      md: `## 1. Create the element trigger`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `. ../de.env
vastde triggers create element --name $PREFIX-uploads \\
  --source-bucket $BUCKET \\
  --event "ObjectCreated:*" \\
  --name-prefix "$PREFIX/" \\
  --topic-name $TOPIC --broker-type Internal --broker-name $BROKER

vastde triggers get $PREFIX-uploads -o json | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["source_bucket_name"], d["config"])'
# <BUCKET> {'events': ['ObjectCreated:*'], 'name_filters': {'prefixes': ['alice/'], 'suffixes': None}, …}`,
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'Check who else watches the bucket',
      md: `If another element trigger watches the same bucket with no filters, every file you upload will also run that trigger's pipeline. \`vastde triggers list -o json\` and look at \`source_bucket_name\` before uploading anything.`,
    },
    {
      type: 'prose',
      md: `## 2. Deploy the pipeline

Same shape as lab 08's, with the element trigger in place of the schedule:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `./render.sh > pipeline.yaml
vastde pipelines create --config pipeline.yaml --deploy
vastde pipelines get $PREFIX-uploads-pipeline -o json | python3 -c 'import json,sys; print(json.load(sys.stdin)["status"])'
# Ready`,
    },
    {
      type: 'prose',
      md: `## 3. Upload a file

On a machine that can reach \`$S3_ENDPOINT\` with credentials for \`$BUCKET\`:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `BUCKET=<BUCKET> S3_ENDPOINT=<S3_ENDPOINT> PREFIX=alice ./upload.sh
# uploaded s3://<BUCKET>/alice/hello-1790442644.csv at 17:10:52 UTC`,
    },
    {
      type: 'prose',
      md: `## 4. Watch it arrive`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `vastde logs get $PREFIX-uploads-pipeline --since 10m --order-by desc --limit 1000 | grep -E 'START|echo r|returned|sink'`,
    },
    {
      type: 'code',
      filename: 'output (reference cluster, anonymised)',
      lang: 'text',
      code: `[vast-runtime] START EventId: 2006217878667296, EventType: vastdata.com:Element.ElementCreated, EventSource: vastdata.com:alice-uploads.<trigger-guid>
[user]         echo r1: vastdata.com:Element.ElementCreated bucket=<BUCKET> key=alice/hello-1790442644.csv id=2006217878667296
[vast-runtime] Function returned: {'revision': 1, 'type': 'vastdata.com:Element.ElementCreated', 'bucket': '<BUCKET>', 'key': 'alice/hello-1790442644.csv'} … duration 1.11 ms
[vast-runtime] No sink URL configured`,
    },
    {
      type: 'prose',
      md: `Read it carefully:

- **The type is \`vastdata.com:Element.ElementCreated\`.** You subscribed to \`ObjectCreated:*\` (the S3 event name), and \`vastde functions invoke --generate-event\` defaults to \`Element.ObjectCreated\` — but the event the cluster produced says \`ElementCreated\`. Handlers that branch on the exact type string must use what the cluster sends; lab 07's hand-written test event would not have matched.
- **The bucket and key arrived** through \`event.bucket\` and \`event.object_key\` (the \`elementpath\` extension, D1.L4).
- **It was fast.** On the reference cluster the handler logged before the \`aws s3 cp\` client on the uploading host had even returned, in 9 of 10 uploads — the gap was below what clock differences between two machines let you measure. DataEngine's own metric, \`dataengine.event.reception_latency\` (lab 10), is the number to quote.`,
    },
    {
      type: 'prose',
      md: `## 5. Prove the filter

Upload to a key *outside* the prefix — for example \`$PREFIX-outside/x.csv\`, which starts with the same letters but not with \`$PREFIX/\` — wait a minute, and check the logs: on the reference cluster it produced **no event at all**. Remove the object afterwards.`,
    },
    {
      type: 'prose',
      md: `## 6. Verify`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `./verify.sh`,
    },
    {
      type: 'deepdive',
      title: 'Troubleshooting',
      md: `- **\`upload\` fails** — no \`Element.ElementCreated\` event from your trigger in the last hour. Did the upload succeed, and is the key under exactly \`$PREFIX/\` (trailing slash included)?
- **\`observed\` fails but \`upload\` passes** — the handler ran but did not log a key: the function image is not lab 07's echo, or the event had no \`elementpath\`.
- **\`aws s3 cp\` hangs or times out** — the S3 endpoint is not reachable from that machine; see the first callout.
- **Nothing arrives at all** — \`vastde traces list $PREFIX-uploads-pipeline --since 15m\`: only an \`init\` trace means no event reached the function; check the trigger's bucket and filters.`,
    },
  ],
  cleanup: [
    {
      type: 'prose',
      md: `Lab 10 reuses this pipeline and trigger. When you are done with both labs:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `vastde pipelines delete $PREFIX-uploads-pipeline
vastde triggers delete $PREFIX-uploads
vastde functions delete $PREFIX-echo
# and, from the S3-capable host:
aws s3 rm s3://$BUCKET/$PREFIX/ --recursive --endpoint-url $S3_ENDPOINT`,
    },
  ],
}

export default guide
