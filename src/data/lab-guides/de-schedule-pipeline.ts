import type { LabGuide } from './types'

const guide: LabGuide = {
  id: 'de-schedule-pipeline',
  requires: ['../de.env from lab 06', 'the $PREFIX-echo:latest image from lab 07', 'vastde', 'Docker (logged in to your registry if it needs auth)'],
  blocks: [
    {
      type: 'prose',
      md: `## What you will build

The echo function from lab 07, running on your VAST cluster, fed by a **schedule trigger** every five minutes. Four objects, created in the order D1.L2 explained: image → function → trigger → pipeline. Only the last one makes anything run.

A schedule trigger is used here on purpose: it proves the whole path without writing into anybody's bucket. Lab 09 switches to object events.`,
    },
    {
      type: 'prose',
      md: `## 1. Push the image

DataEngine pulls from the registry linked to your tenant, never from your laptop. Push the lab 07 image under your prefix:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `. ../de.env
docker tag $PREFIX-echo:latest $REGISTRY_URL/$PREFIX/echo:latest
docker push $REGISTRY_URL/$PREFIX/echo:latest`,
    },
    {
      type: 'prose',
      md: `## 2. Register and publish the function

A function is a pointer: registry + artifact path + tag. \`--publish\` makes revision 1 usable by pipelines.`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `vastde functions create --name $PREFIX-echo \\
  --container-registry $REGISTRY \\
  --artifact-source $PREFIX/echo --artifact-type image --image-tag latest \\
  --description "functionspace lab" --publish

vastde functions get $PREFIX-echo --with-revisions -o json | \\
  python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["last_published_revision_number"], [(r["revision_number"], r["image_tag"], r["is_published"]) for r in d["revisions"]])'
# 1 [(1, 'latest', True)]`,
    },
    {
      type: 'prose',
      md: `Nothing is running yet. The function is a record in VMS.

## 3. Create a schedule trigger`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `vastde triggers create schedule --name $PREFIX-tick \\
  --cron-schedule "*/5 * * * *" \\
  --topic-name $TOPIC --broker-type Internal --broker-name $BROKER`,
    },
    {
      type: 'callout',
      variant: 'segfault',
      title: 'Schedule triggers that never fire',
      md: `On the reference cluster, **only one of four newly created schedule triggers ever fired** — while an older schedule trigger on the same tenant fired every five minutes throughout. A trigger created with \`*/2\` stayed silent even after \`vastde triggers update\` changed it to \`*/5\` and the pipeline was redeployed. If no event arrives within one interval after the pipeline is Ready: delete the pipeline and the trigger, recreate the trigger (keep \`*/5\`), recreate the pipeline, and wait one more interval. If it still never fires, the pipeline is fine — lab 09's element trigger does not depend on the scheduler — and your VAST administrator should look at the scheduler.`,
    },
    {
      type: 'prose',
      md: `## 4. Write the pipeline and deploy it

\`pipeline.yaml.tmpl\` is the manifest from D1.L6 with \`\${…}\` placeholders. \`render.sh\` fills them from \`../de.env\`. Read the rendered file before you send it:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `./render.sh > pipeline.yaml
cat pipeline.yaml
vastde pipelines create --config pipeline.yaml --dry-run | head -3   # optional: see the request
vastde pipelines create --config pipeline.yaml --deploy`,
    },
    {
      type: 'code',
      filename: 'output',
      lang: 'text',
      code: `VRN: vast:dataengine:pipelines:alice-tick-pipeline
Deploying pipeline: alice-tick-pipeline
Pipeline deployed successfully`,
    },
    {
      type: 'prose',
      md: `That returned in about **12 s** on the reference cluster, but "deployed" is not "ready". Watch the status:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `vastde pipelines get $PREFIX-tick-pipeline -o json | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["status"], "-", d["reason"])'
# InProgress - Waiting for pipeline to become ready...
# Ready - Pipeline is ready and active.          ← ~24 s later`,
    },
    {
      type: 'prose',
      md: `## 5. Read the logs from the cluster

Wait for the next five-minute boundary, then:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `vastde logs get $PREFIX-tick-pipeline --since 15m --order-by desc --limit 1000`,
    },
    {
      type: 'code',
      filename: 'output (trimmed, oldest first)',
      lang: 'text',
      code: `[alice-echo] [INFO] [vast-runtime] Runtime is listening on port 8080
[alice-echo] [INFO] [vast-runtime] Sync handler detected, concurrency limited to 20 via middleware
[alice-echo] [INFO] [vast-runtime] Configured private thread pool executor with 20 workers
[alice-echo] [INFO] [user]         echo init: function=alice-echo-1-… revision=1
[alice-echo] [INFO] [vast-runtime] Handler is now ready to accept requests
…
[alice-echo] [INFO] [vast-runtime] START EventId: 1790430300…, EventType: vastdata.com:Schedule.TimerElapsed, EventSource: vastdata.com:alice-tick.…
[alice-echo] [INFO] [user]         echo r1: vastdata.com:Schedule.TimerElapsed id=1790430300… payload={'message': 'Activating trigger by cron'}
[alice-echo] [INFO] [vast-runtime] No sink URL configured`,
    },
    {
      type: 'prose',
      md: `Things to notice:

- **\`[user]\` vs \`[vast-runtime]\`** — your \`ctx.logger\` lines versus the runtime's. \`--scope user\` shows only yours.
- **\`Sync handler detected, concurrency limited to 20\`** — a plain \`def handler\` runs on a 20-thread pool, so one copy can handle up to 20 events at once. That is the per-copy concurrency (c) in X1.L2's sizing formula.
- **The schedule event** has type \`vastdata.com:Schedule.TimerElapsed\`, a numeric id, and a tiny payload — it carries no data, only the fact that time passed.`,
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'logs get returns 100 records, oldest first',
      md: `Found while writing the verify script: without flags, \`vastde logs get\` returned exactly 100 records starting from the beginning of the window, so over \`--since 60m\` the newest lines were simply not in the output. Use \`--order-by desc --limit 1000\`, and \`--scope user\` for just your handler's lines.`,
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
      md: `- **\`function\` fails** — the function exists but \`--publish\` was missed; D2.L3 and lab 10 cover publishing.
- **\`pipeline\` stays InProgress** — \`vastde pipelines get $PREFIX-tick-pipeline -o json\` and read \`reason\`. An image the cluster cannot pull (wrong \`REGISTRY_URL\` path or tag) is the usual cause.
- **\`logs\` fails but the pipeline is Ready** — no event has arrived yet (wait for a five-minute boundary), or see the schedule-trigger callout above. \`vastde traces list $PREFIX-tick-pipeline --since 15m\` shows one trace for \`init\` and one per event.
- **\`pipelines create\` says the pipeline already exists** — you are re-running; \`vastde pipelines get\` it, or delete and recreate.`,
    },
  ],
  cleanup: [
    {
      type: 'prose',
      md: `Lab 09 reuses the function and the image. Remove the schedule parts only:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `vastde pipelines delete $PREFIX-tick-pipeline
vastde triggers delete $PREFIX-tick`,
    },
  ],
}

export default guide
