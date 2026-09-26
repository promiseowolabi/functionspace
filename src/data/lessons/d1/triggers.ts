import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'd1.l5',
  slug: 'triggers',
  trackId: 'd1',
  index: 5,
  title: 'Triggers',
  minutes: 15,
  hook: 'A DataEngine trigger does exactly one thing: turn something happening on the cluster into CloudEvents on a topic. Two kinds, four object events, and prefix and suffix filters that decide how much of your bucket wakes your function up.',
  exercise: 'read+quiz',
  takeaway: {
    number: '2 kinds, 4 events',
    claim: 'DataEngine has schedule triggers (cron) and element triggers (ObjectCreated, ObjectRemoved, ObjectTagging:Put, ObjectTagging:Delete on one bucket), filtered by name and tag prefix/suffix — and every event a filter lets through is one handler invocation you pay for.',
  },
  blocks: [
    {
      type: 'prose',
      md: `In Knative terms (K2.L1), a DataEngine trigger is a **source**: it produces CloudEvents and publishes them to a **topic** on an event broker. It does not know which function will run. The pipeline (D1.L6) is what connects a trigger's events to a function.`,
    },
    {
      type: 'prose',
      md: `## Schedule triggers

A cron expression. Every firing publishes one event. Useful for periodic work (compaction, reports, health checks) and — in lab 08 — for proving a pipeline works without writing anything into a bucket.

\`\`\`bash
vastde triggers create schedule --name alice-tick \\
  --cron-schedule "*/5 * * * *" \\
  --topic-name <TOPIC> --broker-type Internal --broker-name <BROKER>
\`\`\`

The request the CLI sends (\`--dry-run\` shows it without sending):`,
    },
    {
      type: 'code',
      filename: 'vastde triggers create schedule … --dry-run',
      lang: 'text',
      code: `[DRY RUN] Would send POST to /api/latest/serverless/triggers/schedule
{
  "broker": { "is_accessible_to_data_engine": true, "name": "<BROKER>", "type": "Internal" },
  "config": { "cron_schedule": "*/5 * * * *" },
  "name": "alice-tick",
  "topic_name": "<TOPIC>"
}`,
    },
    {
      type: 'prose',
      md: `## Element triggers

Object events on **one bucket**. The allowed events are exactly four: \`ObjectCreated:*\`, \`ObjectRemoved:*\`, \`ObjectTagging:Put\`, \`ObjectTagging:Delete\`. Filters narrow which objects count: \`--name-prefix\`, \`--name-suffix\`, \`--tag-prefix\`, \`--tag-suffix\`.

\`\`\`bash
vastde triggers create element --name alice-uploads \\
  --source-bucket <BUCKET> --event "ObjectCreated:*" --name-prefix "alice/" \\
  --topic-name <TOPIC> --broker-type Internal --broker-name <BROKER>
\`\`\``,
    },
    {
      type: 'code',
      filename: 'vastde triggers create element … --dry-run',
      lang: 'text',
      code: `[DRY RUN] Would send POST to /api/latest/serverless/triggers/element
{
  "broker": { "is_accessible_to_data_engine": true, "name": "<BROKER>", "type": "Internal" },
  "config": {
    "events": [ "ObjectCreated:*" ],
    "name_filters": { "prefixes": [ "alice/" ] },
    "source_bucket_name": "<BUCKET>"
  },
  "name": "alice-uploads",
  "topic_name": "<TOPIC>"
}`,
    },
    {
      type: 'callout',
      variant: 'segfault',
      title: 'A trigger that is Ready but never fires',
      md: `Observed on the reference cluster: of four newly created schedule triggers, only one ever produced events, while an older schedule trigger on the same tenant fired every five minutes throughout. A trigger created with \`*/2\` stayed silent even after \`triggers update\` changed it to \`*/5\`. Status \`Ready\` on a trigger means VMS accepted it, not that events are flowing — the only proof is a \`START EventId\` line in the pipeline's logs. Prefer recreating a schedule trigger to updating its cron, and escalate to your administrator if fresh ones stay silent. Element triggers (lab 09) fired on every upload.`,
    },
    {
      type: 'callout',
      variant: 'warning',
      title: '--topic-name, not --topic',
      md: `\`vastde triggers create --help\` lists a \`--topic\` flag on the parent command, but the \`element\` and \`schedule\` subcommands reject it (\`unknown flag: --topic\`); both take \`-t, --topic-name\`. Check a subcommand's own \`--help\` before scripting it.`,
    },
    {
      type: 'prose',
      md: `## Filters are a cost control

Every object event that passes the filter becomes one CloudEvent and, once a pipeline links it, one handler invocation. On a bucket that receives a million small files a day, a trigger with no prefix filter wakes your function a million times — including for the temporary files and sidecar objects your ingest tool writes.

Filter as tightly as the object layout allows:

| filter | typical use |
|---|---|
| \`--name-prefix incoming/\` | only the landing zone, not the processed zone the function writes to |
| \`--name-suffix .csv\` | only the file type the function can handle |
| \`--tag-prefix …\` with \`ObjectTagging:Put\` | "process when marked ready", decoupling upload from processing |

On the reference cluster, an element trigger with \`--name-prefix alice/\` produced an event for every upload under the prefix and **none** for an object written to a sibling prefix that merely started with the same letters (\`alice-outside/\`) — prefixes match the key string exactly as given, trailing slash included.

And the loop to avoid, same as K2.L6: **a function that writes into the prefix its own trigger watches** will trigger itself. Write outputs to a different prefix or bucket.`,
    },
    {
      type: 'diagram',
      caption: 'fig 1 — from a PUT to an event on a topic',
      height: 64,
      nodes: [
        { id: 'put', x: 2, y: 24, w: 16, h: 12, label: 'S3 PUT', sub: 'alice/data.csv' },
        { id: 'bucket', x: 22, y: 24, w: 16, h: 12, label: 'bucket', sub: '<BUCKET>' },
        { id: 'filter', x: 42, y: 24, w: 18, h: 12, label: 'filters', sub: 'event + prefix' },
        { id: 'topic', x: 66, y: 24, w: 16, h: 12, label: 'topic', sub: '<BROKER>/<TOPIC>' },
        { id: 'drop', x: 42, y: 48, w: 18, h: 10, label: 'ignored', sub: 'no event' },
        { id: 'pipe', x: 86, y: 24, w: 12, h: 12, label: 'pipeline', sub: 'D1.L6' },
      ],
      edges: [
        { from: 'put', to: 'bucket' },
        { from: 'bucket', to: 'filter', label: 'ObjectCreated' },
        { from: 'filter', to: 'topic', label: 'match' },
        { from: 'filter', to: 'drop', label: 'no match' },
        { from: 'topic', to: 'pipe' },
      ],
      steps: [
        { caption: 'A client writes an object with the S3 API. The write lands in the bucket like any other.', active: ['put', 'bucket'], edges: ['put->bucket'] },
        { caption: 'The element trigger on that bucket sees an ObjectCreated event and checks it against its filters: event type, name prefix/suffix, tag prefix/suffix.', active: ['bucket', 'filter'], edges: ['bucket->filter'] },
        { caption: 'An object outside the filters produces nothing — no event, no invocation, no cost. This is the cheapest place to discard work.', active: ['filter', 'drop'], edges: ['filter->drop'] },
        { caption: 'A match becomes a CloudEvent on the trigger\'s topic, carrying the bucket and key in its elementpath extension, for whichever pipeline links this trigger.', active: ['filter', 'topic', 'pipe'], edges: ['filter->topic', 'topic->pipe'] },
      ],
    },
    {
      type: 'vendor',
      snapshot: '2026-09',
      title: 'Triggers in vastde v5.5',
      systems: ['vast-dataengine'],
      sources: [
        'https://github.com/vast-data/dataengine-cli/blob/main/docs/references/commands/vastde_triggers_create_element.md',
        'https://github.com/vast-data/dataengine-cli/blob/main/docs/references/commands/vastde_triggers_create_schedule.md',
      ],
      md: `**Documented**: element and schedule trigger subcommands; the four allowed element events; name and tag prefix/suffix filters; \`--from-file\` for YAML/JSON trigger definitions; \`--custom-extension\` to add flat key/value CloudEvent extensions. **Observed** with v5.5.0-sp2: the request bodies above (via \`--dry-run\`, which works without contacting VMS); \`--topic-name\` accepted and \`--topic\` rejected on both subcommands. The broker type \`Internal\` means a VAST event broker on the cluster; \`External\` points at a Kafka elsewhere with \`--broker-url\`.`,
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'An element trigger on a landing bucket has no filters. The function writes its results back into the same bucket. What happens?',
          options: [
            'Nothing unusual',
            'Every result write is itself an ObjectCreated event that triggers the function again — a loop — so write results elsewhere or filter the trigger to the input prefix',
            'DataEngine blocks functions from writing to watched buckets',
            'The trigger only fires for the first object',
          ],
          correct: [1],
          explanation: 'Same loop as K2.L6, with objects instead of replies. Prefix filters (input/ vs output/) or a separate output bucket break it; there is no TTL on object events to stop it for you.',
        },
        {
          q: 'An ingest tool uploads each dataset as data.csv plus a .manifest file written last. The function must only run once the dataset is complete. Which trigger design fits best?',
          options: [
            'ObjectCreated:* with no filters',
            'ObjectCreated:* with --name-suffix .manifest, so the function fires on the file that marks completion',
            'A schedule trigger every second',
            'ObjectRemoved:*',
          ],
          correct: [1],
          explanation: 'Suffix filters let the completion marker be the event, so the function runs once per dataset with everything present. Tagging-based readiness (ObjectTagging:Put) is the other good pattern.',
        },
        {
          q: 'Why is a tight trigger filter a cost decision, not just a tidiness one?',
          options: [
            'Filters are billed separately',
            'Every event that passes becomes a handler invocation using pipeline compute; unneeded events cost pods, CPU and log volume, and can push the pipeline into its concurrency limit',
            'It is not — filters only affect logging',
            'Unfiltered triggers are rejected by VMS',
          ],
          correct: [1],
          explanation: 'Discarding at the trigger is free; discarding in the handler costs an invocation — and possibly a cold start — for nothing.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'Going deeper',
      md: `- \`vastde triggers create element --help\` and \`schedule --help\` — flags differ from the parent command's.
- \`vastde triggers get <name> -o json\` — the stored trigger, including filters and topic VRN.
- D2.L2 follows one S3 PUT through an element trigger to your handler and reads the event it produces.`,
    },
  ],
}

export default lesson
