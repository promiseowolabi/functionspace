import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'd2.l2',
  slug: 'element-triggers-end-to-end',
  trackId: 'd2',
  index: 2,
  title: 'Element Triggers, End to End',
  minutes: 16,
  hook: 'You subscribe to ObjectCreated, the CLI\'s test events say Element.ObjectCreated, and the cluster sends Element.ElementCreated. One upload, followed from the S3 PUT to your handler, shows every name and field that actually crosses the wire.',
  exercise: 'lab+quiz',
  takeaway: {
    number: '0 events outside the prefix',
    claim: 'An S3 PUT under a trigger\'s prefix produced exactly one vastdata.com:Element.ElementCreated event carrying the bucket and key in elementpath, and a PUT outside the prefix produced none — so the trigger filter, not your handler, is where unwanted objects should die.',
  },
  blocks: [
    {
      type: 'prose',
      md: `D1.L5 described element triggers from the CLI's side. This lesson follows one real upload through the reference cluster in lab 09 and reads everything the platform added on the way. The point is not the happy path — it is the three names that differ, the field your code must read, and where the filter bites.`,
    },
    {
      type: 'diagram',
      caption: 'fig 1 — one upload, end to end',
      height: 70,
      nodes: [
        { id: 'client', x: 2, y: 26, w: 16, h: 14, label: 'S3 client', sub: 'PUT alice/hello.csv' },
        { id: 'bucket', x: 22, y: 26, w: 16, h: 14, label: 'bucket', sub: '<BUCKET>' },
        { id: 'trig', x: 42, y: 6, w: 18, h: 12, label: 'element trigger', sub: 'prefix alice/' },
        { id: 'topic', x: 42, y: 44, w: 18, h: 12, label: 'topic', sub: 'key = elementpath' },
        { id: 'pod', x: 66, y: 26, w: 16, h: 14, label: 'function pod', sub: 'runtime :8080' },
        { id: 'h', x: 86, y: 26, w: 12, h: 14, label: 'handler', sub: 'bucket, key' },
      ],
      edges: [
        { from: 'client', to: 'bucket', label: 'PUT' },
        { from: 'bucket', to: 'trig', label: 'ObjectCreated' },
        { from: 'trig', to: 'topic', label: 'CloudEvent' },
        { from: 'topic', to: 'pod', label: 'link' },
        { from: 'pod', to: 'h' },
      ],
      steps: [
        { caption: 'An ordinary S3 client writes alice/hello.csv into the bucket. Nothing about the upload knows DataEngine exists.', active: ['client', 'bucket'], edges: ['client->bucket'] },
        { caption: 'The element trigger on the bucket sees ObjectCreated and checks its prefix filter. alice/hello.csv matches; alice-outside/x.csv would not.', active: ['bucket', 'trig'], edges: ['bucket->trig'] },
        { caption: 'The trigger publishes a CloudEvent of type vastdata.com:Element.ElementCreated, with elementpath = <bucket>/alice/hello.csv as its partition key.', active: ['trig', 'topic'], edges: ['trig->topic'] },
        { caption: 'The pipeline link delivers it to a function pod, where the runtime logs START EventId and builds an ElementTriggerVastEvent.', active: ['topic', 'pod'], edges: ['topic->pod'] },
        { caption: 'Your handler reads event.bucket and event.object_key — parsed from elementpath — and does its work. On the reference cluster, before the uploading client had even returned.', active: ['pod', 'h'], edges: ['pod->h'] },
      ],
    },
    {
      type: 'prose',
      md: `## What arrived

From the pipeline's logs on the reference cluster (anonymised):`,
    },
    {
      type: 'code',
      filename: 'vastde logs get <prefix>-uploads-pipeline --order-by desc',
      lang: 'text',
      code: `[vast-runtime] START EventId: 2006217878667296, EventType: vastdata.com:Element.ElementCreated,
               EventSource: vastdata.com:alice-uploads.<trigger-guid>
[user]         echo r1: vastdata.com:Element.ElementCreated bucket=<BUCKET> key=alice/hello-1790442644.csv
[vast-runtime] Function returned: {… 'key': 'alice/hello-1790442644.csv'} … duration 1.11 ms
[vast-runtime] No sink URL configured`,
    },
    {
      type: 'prose',
      md: `## Three names for one thing

| where | the name you see |
|---|---|
| the trigger's \`--event\` flag (S3 vocabulary) | \`ObjectCreated:*\` |
| \`vastde functions invoke --generate-event\` default | \`vastdata.com:Element.ObjectCreated\` |
| the event the cluster actually sent | **\`vastdata.com:Element.ElementCreated\`** |

If your handler branches on \`attrs["type"] == "vastdata.com:Element.ObjectCreated"\` because that is what your local tests used, it will never match in production. Test with a captured real event, or branch on the \`Element\` kind and treat the subtype loosely.`,
    },
    {
      type: 'callout',
      variant: 'segfault',
      title: 'Your local tests can lie',
      md: `Lab 07's generated and hand-written events both said \`Element.ObjectCreated\`. Everything passed locally. The first real upload arrived as \`Element.ElementCreated\`. Capture one real event from your cluster's logs and make it a test fixture.`,
    },
    {
      type: 'prose',
      md: `## The fields your code should read

- **\`event.bucket\`, \`event.object_key\`** — parsed from the \`elementpath\` extension (\`<bucket>/<key>\`). This is the object to process.
- **\`id\`** — a numeric id; with \`source\` it is the event's identity (F0.L2). A retry of this event keeps it (D2.L5).
- **\`source\`** — \`vastdata.com:<trigger name>.<trigger guid>\`: which trigger produced the event.
- **Not the data payload.** For object events the useful information is in the extensions, and \`get_data()\` returns the envelope anyway (D1.L4).

The event says an object *was* created. It does not contain the object. To process the file, your handler reads it over S3 (or a file protocol) — D1.L1's "the data hop shrinks, it does not vanish".`,
    },
    {
      type: 'prose',
      md: `## Where the filter bites

An upload to \`alice-outside/x.csv\` — same leading letters, different prefix — produced **no event**. Prefix matching is on the key string, trailing slash included. That is the cheapest place to throw work away; an event that reaches your handler costs an invocation (and possibly a cold start) even if your first line returns.

And how fast? On the reference cluster the handler logged before the \`aws s3 cp\` client on the uploading machine had returned, in 9 of 10 uploads. Two machines' clocks cannot resolve that, so the number to quote is DataEngine's own \`dataengine.event.reception_latency\` metric: p95 **612 ms** over a burst of 11 uploads and **72.5 ms** over 2 later ones (lab 10).`,
    },
    {
      type: 'vendor',
      snapshot: '2026-09',
      title: 'Element events on the reference cluster',
      systems: ['vast-dataengine'],
      sources: [
        'https://github.com/vast-data/dataengine-cli/blob/main/docs/references/commands/vastde_triggers_create_element.md',
        'https://github.com/vast-data/dataengine-cli/blob/main/docs/references/commands/vastde_functions_invoke.md',
      ],
      md: `**Documented**: element trigger events \`ObjectCreated:*\`, \`ObjectRemoved:*\`, \`ObjectTagging:Put\`, \`ObjectTagging:Delete\`; \`functions invoke --generate-event\` defaults to \`vastdata.com:Element.ObjectCreated\`. **Observed** (vastde v5.5.0-sp2, reference cluster, 2026-09-26): an S3 PUT under the trigger's prefix produced \`vastdata.com:Element.ElementCreated\` with a numeric id and \`source\` \`vastdata.com:<trigger>.<guid>\`; a PUT to a sibling prefix produced nothing; the reception-latency figures above, with their sample sizes. Other event kinds (removal, tagging) were not tested — capture one before coding against its type string.`,
    },
    {
      type: 'lab',
      lab: 'de-element-trigger',
      brief: 'Create an element trigger on your bucket filtered to your prefix, deploy the pipeline, upload a file from a host that can reach S3, and read the bucket and key your handler received — then prove the filter with an upload outside the prefix.',
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'A handler works in every local test but never processes real uploads, and logs show START lines with its events. The code begins: if attrs["type"] != "vastdata.com:Element.ObjectCreated": return. What is wrong?',
          options: [
            'The trigger is misconfigured',
            'Real object-created events arrive as vastdata.com:Element.ElementCreated; the local test events used a different subtype, so the handler returns early on every real event',
            'The bucket is empty',
            'The runtime strips the type attribute',
          ],
          correct: [1],
          explanation: 'The START lines prove delivery; the early return is the bug. Capture a real event as a fixture. This exact mismatch was observed on the reference cluster.',
        },
        {
          q: 'A pipeline should process only .parquet files landing under incoming/. Where should that rule live?',
          options: [
            'In the handler: if not key.endswith(".parquet"): return',
            'In the trigger: --name-prefix incoming/ --name-suffix .parquet, so non-matching objects never become events',
            'In the pipeline\'s resources block',
            'In a second function that filters for the first',
          ],
          correct: [1],
          explanation: 'Filtering at the trigger is free; filtering in the handler costs an invocation per unwanted object. Keep a defensive check in the handler too, but the trigger is the real filter.',
        },
        {
          q: 'An architect claims uploads are processed "in about 70 ms". What should you ask before accepting it?',
          options: [
            'Nothing — it is a measured number',
            'Which metric and percentile, over how many events, under what load: on the reference cluster p95 reception latency was 72.5 ms over 2 events but 612 ms over a burst of 11',
            'Whether the bucket is SSD-backed',
            'Whether the function is written in Python',
          ],
          correct: [1],
          explanation: 'A latency without percentile, sample size and load is a hope. The same cluster gave 72.5 ms and 612 ms depending on the burst.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'Going deeper',
      md: `- \`vastde logs get <pipeline> -o json\` — each record carries the function host, revision id and trace id; follow one event across them.
- \`vastde traces list <pipeline>\` then \`traces get <id>\` — the spans for one upload.
- D2.L5 for what happens when the handler fails on an object.`,
    },
  ],
}

export default lesson
