import type { LabGuide } from './types'

const guide: LabGuide = {
  id: 'de-revisions-observability',
  requires: ['the uploads pipeline from lab 09', '../de.env', 'vastde', 'Docker', 'Python 3.11+', 'the S3-capable host from lab 09 for one upload'],
  blocks: [
    {
      type: 'prose',
      md: `## What you will do

Ship revision 2 of the echo function, move the running pipeline onto it deliberately, and prove the change three ways: in the logs, in a metric, and in traces. Along the way you will hit a CLI bug and work around it by calling the API the CLI wraps — a skill worth having on any young platform.`,
    },
    {
      type: 'prose',
      md: `## 1. Build revision 2

Change the one constant, build with a new image tag, and push it:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `. ../de.env
sed -i 's/^REVISION = 1.*/REVISION = 2/' ../de-local-function/src/main.py
TMPDIR=$HOME/.cache/vastde-tmp vastde functions build $PREFIX-echo \\
  -t ../de-local-function/src -H main.py -V "3.12.*" -T v2
docker tag $PREFIX-echo:v2 $REGISTRY_URL/$PREFIX/echo:v2
docker push $REGISTRY_URL/$PREFIX/echo:v2`,
    },
    {
      type: 'prose',
      md: `## 2. Publish it — and meet the 422

The documented way to point a function at a new image and publish the resulting revision:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `vastde functions update $PREFIX-echo --image-tag v2 --publish`,
    },
    {
      type: 'code',
      filename: 'output (vastde v5.5.0-sp2)',
      lang: 'text',
      code: `Failed to update function:
422 Unprocessable Entity: {"detail":"{\\"last_published_revision_number\\": \\"Extra inputs are not permitted\\"}"}`,
    },
    {
      type: 'prose',
      md: `Do not guess; look at what the CLI sends:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `vastde functions update $PREFIX-echo --image-tag v2 --publish --dry-run`,
    },
    {
      type: 'code',
      filename: 'output (trimmed)',
      lang: 'text',
      code: `[DRY RUN] Would send PUT to /api/latest/serverless/functions/<function-guid>
{
  "artifact_source": "alice/echo",
  "image_tag": "v2",
  "is_published": true,
  "last_published_revision_number": 1,        ← copied from the existing function
  "name": "alice-echo",
  …
}`,
    },
    {
      type: 'prose',
      md: `The CLI copies a read-only field from the current function into its update, and the server's schema rejects unknown input. The same PUT **without that one field** succeeds — \`publish-revision.py\` in this lab folder makes exactly that call, reading your existing \`~/.vast/config.toml\` for the login:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `python3 publish-revision.py $PREFIX-echo v2
# alice-echo: published revision 2 (image tag v2)
vastde functions get $PREFIX-echo --with-revisions -o json | \\
  python3 -c 'import json,sys; d=json.load(sys.stdin); print([(r["revision_number"], r["image_tag"], r["is_published"]) for r in d["revisions"]])'
# [(1, 'latest', True), (2, 'v2', True)]`,
    },
    {
      type: 'callout',
      variant: 'info',
      title: 'Try the CLI first on your version',
      md: `This is a bug in one CLI release, observed with v5.5.0-sp2. Run the \`vastde functions update\` command first; if it succeeds on your version, you do not need the script. Publishing the same tag twice created no new revision — an unchanged image is a no-op, like an unchanged Knative template (K1.L1).`,
    },
    {
      type: 'prose',
      md: `## 3. Move the pipeline — update, then deploy

Publishing revision 2 changed nothing that is running: the pipeline's deployment still says \`revision: 1\` (D1.L6). Edit the manifest and update the pipeline:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `../de-element-trigger/render.sh ../de-element-trigger/pipeline.yaml.tmpl \\
  | sed 's/^      revision: 1$/      revision: 2/' > pipeline.yaml
vastde pipelines update $PREFIX-uploads-pipeline --config @pipeline.yaml
vastde pipelines get $PREFIX-uploads-pipeline --manifest -o json | \\
  python3 -c 'import json,sys; print([f["revision"] for f in json.load(sys.stdin)["function_deployments"]])'
# [2]`,
    },
    {
      type: 'prose',
      md: `The stored manifest says 2. Upload a file (lab 09's \`upload.sh\`) and read the handler line:`,
    },
    {
      type: 'code',
      filename: 'output — still revision 1',
      lang: 'text',
      code: `alice-echo-1-<id>-00001-deployment-<hash> | echo r1: vastdata.com:Element.ElementCreated bucket=<BUCKET> key=alice/v2-….csv`,
    },
    {
      type: 'prose',
      md: `Still \`r1\`. On the reference cluster, **\`pipelines update\` changed the stored manifest but not the running deployment**. Deploy it:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `vastde pipelines deploy $PREFIX-uploads-pipeline
# Pipeline deployed successfully            (Ready again ~15 s later)`,
    },
    {
      type: 'code',
      filename: 'output after one more upload (function_host | message)',
      lang: 'text',
      code: `alice-echo-1-<id>-00002-deployment-<hash> | echo init: function=alice-echo-1-<id> revision=2
alice-echo-1-<id>-00002-deployment-<hash> | echo r2: vastdata.com:Element.ElementCreated bucket=<BUCKET> key=alice/v2b-….csv`,
    },
    {
      type: 'prose',
      md: `Look at the pod name in \`function_host\` (from \`vastde logs get … -o json\`): it went from **\`…-00001-deployment-…\`** to **\`…-00002-deployment-…\`**. That is exactly how Knative names a revision's pods — compare \`alice-hello-00001-deployment-…\` in lab 01. The deploy stamped a new Knative revision, which ran \`init\` with the new code and took over. X1.L1 explains why.`,
    },
    {
      type: 'prose',
      md: `## 4. Evidence beyond logs

**Traces** — one per event, plus one for each \`init\`:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `vastde traces list $PREFIX-uploads-pipeline --since 1h
vastde traces get <trace-id>          # the spans for one event`,
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'Read durations from the timestamps',
      md: `On v5.5.0-sp2, \`traces get\` printed \`Duration: 2.716µs\` for a span whose start and end timestamps (in microseconds) were 2,716 apart — **2.7 ms**. The unit label is off by a factor of 1,000; compute durations from Start/End yourself.`,
    },
    {
      type: 'prose',
      md: `**Metrics** — the runtime exports four; list them, then query one type at a time (mixing a Counter and a Histogram in one call is rejected with 422):`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `vastde metrics names
# dataengine.event.reception_latency   Histogram  ms
# dataengine.event.total               Counter
# dataengine.function.invocations      Counter
# dataengine.function.invoke_duration  Histogram  ms

vastde metrics get -p $PREFIX-uploads-pipeline -m dataengine.function.invocations -a sum -w 1h -n 5
vastde metrics get -p $PREFIX-uploads-pipeline -m dataengine.event.reception_latency -a p95 -w 1h -n 3`,
    },
    {
      type: 'code',
      filename: 'reference cluster (values only)',
      lang: 'text',
      code: `dataengine.function.invocations  sum per 12-min bucket:  1, 11, 1
dataengine.event.reception_latency  p95 per 20-min bucket: 612.5 ms (11 events), 72.5 ms (2 events)`,
    },
    {
      type: 'prose',
      md: `The invocation count matches the uploads you made. Reception latency is measured inside the platform, so unlike lab 09's two-machine timing it is not distorted by clock differences — this is the number to put in a design document, with its sample size.`,
    },
    {
      type: 'prose',
      md: `## 5. Verify`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `./verify.sh`,
    },
    {
      type: 'deepdive',
      title: 'Troubleshooting',
      md: `- **\`revision\` fails** — revision 2 was never published: the 422 above, or \`publish-revision.py\` could not log in (it uses \`~/.vast/config.toml\`, same as \`vastde\`).
- **\`pipeline\` fails** — the stored manifest still says revision 1; re-run the \`pipelines update\`.
- **\`logs\` fails** — you updated but did not \`pipelines deploy\`, or no upload has happened since the deploy.
- **\`telemetry\` fails** — metrics can lag by a minute or two; traces are usually immediate.`,
    },
  ],
  cleanup: [
    {
      type: 'code',
      lang: 'bash',
      code: `vastde pipelines delete $PREFIX-uploads-pipeline
vastde triggers delete $PREFIX-uploads
vastde functions delete $PREFIX-echo
sed -i 's/^REVISION = 2.*/REVISION = 1  # lab 10 changes this to 2/' ../de-local-function/src/main.py
# from the S3-capable host:
aws s3 rm s3://$BUCKET/$PREFIX/ --recursive --endpoint-url $S3_ENDPOINT`,
    },
  ],
}

export default guide
