import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'd2.l4',
  slug: 'observability',
  trackId: 'd2',
  index: 4,
  title: 'Observability',
  minutes: 17,
  hook: 'vastde logs returned exactly 100 lines — the oldest 100 in the window — so the event you were looking for was not there. The scope the help text told you to filter on matched nothing. Telemetry is only evidence once you know how the tools lie.',
  exercise: 'lab+quiz',
  takeaway: {
    number: '100 records, oldest first',
    claim: 'DataEngine answers "did it run, how long, why did it fail" with logs, traces and four runtime metrics — but vastde logs defaults to 100 records oldest-first, --scope runtime matches nothing (the value is vast-runtime), and trace durations are labelled µs when they are ms.',
  },
  blocks: [
    {
      type: 'prose',
      md: `Three questions come up in every incident: **did it run, how long did it take, and why did it fail?** DataEngine gives you three instruments — logs, traces and metrics — all through \`vastde\` and all tied together by the trace id the runtime stamps on each event. This lesson is how to use them, and the four rough edges found while building labs 08–10.`,
    },
    {
      type: 'statline',
      stats: [
        { value: '4', label: 'runtime metrics', hint: 'event reception latency, events total, invocations, invoke duration' },
        { value: '2', label: 'log scopes', hint: 'user (your ctx.logger) and vast-runtime (the platform)' },
        { value: '1 + N', label: 'traces', hint: 'one for init per pod, one per event' },
        { value: '20', label: 'threads per copy', hint: '"Sync handler detected, concurrency limited to 20 via middleware"' },
      ],
    },
    {
      type: 'prose',
      md: `## Logs: did it run?

\`vastde logs get <pipeline>\` returns log records from every function in the pipeline. Each record has a **scope** — \`user\` for your \`ctx.logger\` lines, \`vast-runtime\` for the platform's — and a JSON form (\`-o json\`) with a \`resource\` block naming the function, its revision id and the **host** (pod) that wrote it.

The runtime writes a predictable sequence per event, which makes "did it run" a grep:

\`\`\`
START EventId: <id>, TraceId: <trace>, EventType: <type>, EventSource: <trigger>
[user] … your lines …
Function returned: … with duration <ms> milliseconds      (or: Error in handler execution: …)
END / No sink URL configured / CloudEvent sent to sink
\`\`\``,
    },
    {
      type: 'callout',
      variant: 'segfault',
      title: 'The 100-line window',
      md: `Without flags, \`vastde logs get <p> --since 60m\` returned **exactly 100** records on the reference cluster — the **oldest** 100 in the window. The event from two minutes ago was simply not in the output; lab 10's first verify script failed on this. Always ask for what you mean: \`--order-by desc --limit 1000\`, and \`--scope user\` for your own lines.`,
    },
    {
      type: 'callout',
      variant: 'warning',
      title: '--scope runtime matches nothing',
      md: `\`vastde logs get --help\` lists the scopes as \`user\` and \`runtime\`. \`--scope runtime\` returned **zero** records; the records' scope is actually **\`vast-runtime\`**, and \`--scope vast-runtime\` returned them all. An empty result is not evidence that nothing happened — check the filter first.`,
    },
    {
      type: 'prose',
      md: `## Traces: how long, and where?

\`vastde traces list <pipeline> --since 1h\` lists traces: one when each pod runs \`init\`, and one per event. \`vastde traces get <trace-id>\` shows the spans with their function, pod and timing. The trace id also appears in the \`START\` log line and on every log record, so you can go from a log line to its trace and back.

A pipeline with a single trace in the last hour — the \`init\` one — has received **no events**; that is how the silent schedule triggers in lab 08 were diagnosed.`,
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'µs that are really ms',
      md: `\`traces get\` printed \`Duration: 2.716µs\` for a span whose start and end (in microseconds) were 2,716 apart: **2.7 ms**. Compute durations from the Start/End timestamps.`,
    },
    {
      type: 'prose',
      md: `## Metrics: how many, how fast, over time

The runtime exports four metrics (\`vastde metrics names\`):

| metric | type | unit | answers |
|---|---|---|---|
| \`dataengine.event.reception_latency\` | Histogram | ms | how long events took to reach the function |
| \`dataengine.event.total\` | Counter | 1 | how many events were processed |
| \`dataengine.function.invocations\` | Counter | 1 | how many times the handler ran |
| \`dataengine.function.invoke_duration\` | Histogram | ms | how long the handler took |

Query with a pipeline or function filter, an aggregation (\`sum\`, \`avg\`, \`p50\`, \`p95\`, \`p99\`…) and a window. One metric **type** per call: asking for a Counter and a Histogram together returned \`422 … All metrics must have the same type\`.`,
    },
    {
      type: 'code',
      filename: 'reference cluster, lab 09–10 uploads',
      lang: 'bash',
      code: `vastde metrics get -p alice-uploads-pipeline -m dataengine.function.invocations -a sum -w 1h -n 5
# per 12-minute bucket: 1, 11, 1          ← matches the uploads made

vastde metrics get -p alice-uploads-pipeline -m dataengine.event.reception_latency -a p95 -w 1h -n 3
# per 20-minute bucket: 612.5 ms (11 events), 72.5 ms (2 events)`,
    },
    {
      type: 'prose',
      md: `Note what each value carries: the aggregation, the bucket, and the **count** of events behind it. "p95 612 ms over 11 events" is a fact; "612 ms latency" is not.`,
    },
    {
      type: 'diagram',
      caption: 'fig 1 — one event, three instruments',
      height: 62,
      nodes: [
        { id: 'ev', x: 2, y: 22, w: 16, h: 14, label: 'event', sub: 'id + trace id' },
        { id: 'logs', x: 30, y: 4, w: 22, h: 12, label: 'logs', sub: 'START / user / returned' },
        { id: 'tr', x: 30, y: 24, w: 22, h: 12, label: 'trace', sub: 'spans, pod, timing' },
        { id: 'met', x: 30, y: 44, w: 22, h: 12, label: 'metrics', sub: 'counts, latency' },
        { id: 'q', x: 66, y: 22, w: 32, h: 14, label: 'the incident question', sub: 'ran? how long? why?' },
      ],
      edges: [
        { from: 'ev', to: 'logs' },
        { from: 'ev', to: 'tr' },
        { from: 'ev', to: 'met' },
        { from: 'logs', to: 'q', label: 'why' },
        { from: 'tr', to: 'q', label: 'where' },
        { from: 'met', to: 'q', label: 'how many' },
      ],
      steps: [
        { caption: 'Every event gets an id and a trace id from the runtime; both appear in the START log line and on every record it produces.', active: ['ev'] },
        { caption: 'Logs answer "did it run and why did it fail": START, your ctx.logger lines, and Function returned or Error in handler execution.', active: ['ev', 'logs', 'q'], edges: ['ev->logs', 'logs->q'] },
        { caption: 'Traces answer "where and how long" for one event: which pod, which spans — and a pipeline with only an init trace received nothing.', active: ['ev', 'tr', 'q'], edges: ['ev->tr', 'tr->q'] },
        { caption: 'Metrics answer "how many and how fast, over time": invocation counts and latency percentiles, each with its sample count.', active: ['ev', 'met', 'q'], edges: ['ev->met', 'met->q'] },
      ],
    },
    {
      type: 'prose',
      md: `## Two runtime lines worth reading once

At startup the runtime logs how it will run your code. On the reference cluster a plain \`def handler\` produced:

\`\`\`
Sync handler detected, concurrency limited to 20 via middleware
Configured private thread pool executor with 20 workers
\`\`\`

So one copy of a synchronous handler processes up to **20 events concurrently**, on threads. That is the per-copy concurrency *c* in X1.L2's sizing formula — and a reason to make handlers thread-safe even though you wrote "one function".`,
    },
    {
      type: 'vendor',
      snapshot: '2026-09',
      title: 'DataEngine telemetry via vastde v5.5.0-sp2',
      systems: ['vast-dataengine'],
      sources: [
        'https://github.com/vast-data/dataengine-cli/blob/main/docs/references/commands/vastde_logs_get.md',
        'https://github.com/vast-data/dataengine-cli/blob/main/docs/references/commands/vastde_metrics_get.md',
        'https://github.com/vast-data/dataengine-cli/blob/main/docs/references/commands/vastde_traces_list.md',
      ],
      md: `**Documented**: \`logs get/tail\` with \`--since\`, \`--function\`, \`--scope\`, \`--severity\`, \`--trace-id\`, \`--order-by\`, \`--limit\`; \`metrics names/get\` with aggregations and group-by; \`traces list/get\`. **Observed** on the reference cluster: the four metric names and types; the 100-record oldest-first default; \`--scope runtime\` returning nothing and \`vast-runtime\` being the real scope; the 422 when mixing metric types; the µs/ms label; one \`init\` trace per pod; the 20-thread limit for synchronous handlers.`,
    },
    {
      type: 'lab',
      lab: 'de-revisions-observability',
      brief: 'After rolling out revision 2, prove it three ways: the handler log line, a trace for the upload, and the invocation count and reception-latency percentile from vastde metrics.',
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'On-call runs vastde logs get <pipeline> --since 2h | grep <event-id> for an event from 5 minutes ago and finds nothing. What is the most likely explanation?',
          options: [
            'The event was never delivered',
            'The default output is the oldest 100 records in the window; over 2 hours the recent ones are cut off — use --order-by desc --limit 1000 (or --trace-id)',
            'Logs are delayed by 2 hours',
            'The event id is not logged',
          ],
          correct: [1],
          explanation: 'An absent line is not absence of the event until the query can actually return it. This exact truncation broke a verify script while building lab 10.',
        },
        {
          q: 'A pipeline is Ready, but no handler lines appear. vastde traces list shows one trace in the last hour. What does that tell you?',
          options: [
            'The handler is failing silently',
            'That trace is the init span for the pod; no events have reached the function — look at the trigger, not the code',
            'Traces are sampled at 1%',
            'The pipeline is overloaded',
          ],
          correct: [1],
          explanation: 'One trace per init, one per event. A single trace means the function started and received nothing — how the non-firing schedule triggers were diagnosed.',
        },
        {
          q: 'Which figure belongs in a design document about upload-to-processing latency?',
          options: [
            'The time between running aws s3 cp and seeing a log line on your laptop',
            'dataengine.event.reception_latency at a stated percentile, with the event count and load it was measured under',
            'The traces get Duration field as printed',
            'The pipeline deploy time',
          ],
          correct: [1],
          explanation: 'The platform metric is measured in one place, so no cross-machine clock skew; stating percentile and sample size makes it defensible. The printed trace duration has a unit bug.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'Going deeper',
      md: `- \`vastde logs tail <pipeline>\` — follow logs live during a test.
- \`vastde metrics get … -g function_deployment_name\` — split a pipeline's metrics per deployment.
- \`ctx.tracer\`, \`ctx.meter\` and friends (D1.L4) — add your own spans and metrics next to the runtime's.`,
    },
  ],
}

export default lesson
