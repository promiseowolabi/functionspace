import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'x1.l4',
  slug: 'architecture-patterns',
  trackId: 'x1',
  index: 4,
  title: 'Architecture Patterns',
  minutes: 17,
  hook: 'Four patterns cover almost every event-driven data design you will be asked to review. Pick the pattern first; the platform choice usually falls out of where the events start and where the data lives.',
  exercise: 'read+quiz',
  takeaway: {
    number: '4 patterns, 2 questions',
    claim: 'Enrich-on-ingest, fan-out, inference-next-to-data and scheduled sweeps cover most event-driven data designs; choose between Knative and DataEngine by asking where the event originates and where the bytes live — and name what each choice costs.',
  },
  blocks: [
    {
      type: 'prose',
      md: `Everything so far has been mechanism. This lesson is the design review: four patterns, what each is good and bad at, and the two questions that decide which platform should run it.`,
    },
    {
      type: 'prose',
      md: `## 1. Enrich on ingest

*An object lands; extract metadata, validate, convert, index; write the result elsewhere.* Labs 09–10 are a tiny version of it.

- **Shape**: element trigger (prefix-filtered) → function → output prefix/bucket or table.
- **Good at**: keeping derived data fresh within seconds of arrival; no batch windows.
- **Bad at**: bursts larger than \`max_concurrency\` allows (X1.L2); anything that needs *all* the data at once.
- **Must have**: idempotent writes keyed on the object (X1.L3); outputs outside the watched prefix (D1.L5).

## 2. Fan-out

*One event, several independent consumers* — index it, thumbnail it, notify someone, audit it.

- **Knative**: one broker, one trigger per consumer (K2.L2). Consumers come and go without touching the producer.
- **DataEngine**: one trigger linked to several function deployments in a pipeline (D1.L6), or several pipelines on the same trigger — the probe in the reference-cluster testing did exactly that without disturbing the original pipeline.
- **Bad at**: consumers that must see each other's results; that is a sequence, not a fan-out.

## 3. Inference next to data

*A new image, audio file or document arrives; run a model on it.* The pattern VAST markets DataEngine for.

- **Good at**: avoiding a copy of large objects to a separate compute estate; one control plane for data and processing.
- **Bad at**: cold starts. Model images are large (the pull term, F0.L3/K3.L2) and model loading is slow (the init term). Keep a warm floor (\`min_concurrency\`/\`min-scale\` ≥ 1) for latency-sensitive paths and price it; load models in \`init\`, never per event.
- **Must have**: per-copy concurrency that matches the model — often 1 per GPU, which makes X1.L2's ceiling arithmetic decisive.

## 4. Scheduled sweep

*Every N minutes, compact, reconcile, report.* Schedule trigger or PingSource.

- **Good at**: work that genuinely needs a window of data.
- **Bad at**: freshness, and — on the reference cluster — newly created schedule triggers that were Ready but never fired (lab 08). Monitor that the sweep *ran*, not just that it is configured.`,
    },
    {
      type: 'diagram',
      caption: 'fig 1 — the two questions',
      height: 66,
      nodes: [
        { id: 'q1', x: 2, y: 6, w: 30, h: 14, label: 'where does the event start?', sub: 'storage vs application' },
        { id: 'q2', x: 2, y: 40, w: 30, h: 14, label: 'where do the bytes live?', sub: 'VAST vs elsewhere' },
        { id: 'de', x: 64, y: 6, w: 34, h: 14, label: 'DataEngine', sub: 'object events, data on VAST' },
        { id: 'kn', x: 64, y: 40, w: 34, h: 14, label: 'Knative', sub: 'app events, APIs, portable' },
      ],
      edges: [
        { from: 'q1', to: 'de', label: 'a bucket' },
        { from: 'q1', to: 'kn', label: 'an app / API' },
        { from: 'q2', to: 'de', label: 'on VAST' },
        { from: 'q2', to: 'kn', label: 'anywhere' },
      ],
      steps: [
        { caption: 'Ask where the event originates. If it is an object landing in a VAST bucket, an element trigger produces it with no adapter at all.', active: ['q1', 'de'], edges: ['q1->de'] },
        { caption: 'If it is an application event, an HTTP request or a message from another system, Knative\'s sources and brokers are built for it.', active: ['q1', 'kn'], edges: ['q1->kn'] },
        { caption: 'Ask where the bytes live. Processing data already on VAST favours running next to it; data elsewhere removes that advantage.', active: ['q2', 'de'], edges: ['q2->de'] },
        { caption: 'Portability, synchronous APIs, traffic splitting and fine-grained autoscaling control point to Knative — which, per X1.L1, is also what DataEngine is built on.', active: ['q2', 'kn'], edges: ['q2->kn'] },
      ],
    },
    {
      type: 'prose',
      md: `## The comparison, honestly

| you need | Knative | DataEngine |
|---|---|---|
| object events from VAST buckets | an adapter you run | built in (element triggers) |
| synchronous HTTP API | yes (Serving) | not its purpose |
| percentage traffic splits, gradual rollout | yes (K1.L5) | one revision per deployment (D2.L3) |
| documented autoscaling knobs | yes (K1.L3/L4) | min/max concurrency; algorithm undocumented |
| logs/metrics/traces with no setup | bring your own stack | built in (D2.L4) |
| portability across clusters and clouds | high | tied to a VAST cluster |
| who operates the platform | you | VAST + your administrator |

Neither column wins. The review question is which row the workload lives in.`,
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'State the caveat first',
      md: `Every recommendation from this course should open with its weakest assumption: "DataEngine, assuming our burst stays under N uploads/s at p95 handler time T — above that we need max_concurrency ≥ N × T, which we have not load-tested." That sentence is worth more in a review than the diagram.`,
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'A media team wants thumbnails generated for every image uploaded to a VAST bucket, within a few seconds. Which pattern and platform fit best, and what is the first risk to size?',
          options: [
            'Scheduled sweep on Knative; risk: cron drift',
            'Enrich on ingest with a DataEngine element trigger; first risk: burst rate × handler time exceeding max_concurrency (X1.L2)',
            'Fan-out on Knative; risk: broker cost',
            'Inference on a laptop',
          ],
          correct: [1],
          explanation: 'The event starts in a VAST bucket and the bytes live there: element trigger, enrich on ingest. The sizing question is the one that breaks it in production.',
        },
        {
          q: 'A public-facing API must return a price within 50 ms and be rolled out with a 5% canary. Which platform?',
          options: [
            'DataEngine — it is next to the data',
            'Knative Serving — synchronous HTTP, revision traffic splits, and a warm floor via min-scale',
            'Either, identically',
            'A schedule trigger',
          ],
          correct: [1],
          explanation: 'Synchronous APIs and percentage canaries are Knative\'s home ground (K1). DataEngine\'s runtime answers 204 and routes results to a sink; it is not a request/response API platform.',
        },
        {
          q: 'An architect proposes running a large vision model per uploaded image with min_concurrency 0 "to save money". What do you raise?',
          options: [
            'Nothing',
            'Cold starts: a large image pull plus model load on every scale-from-zero; propose min ≥ 1 for the latency-sensitive path, load the model in init, and state the cost of the warm floor',
            'The bucket should be deleted',
            'Use more retries',
          ],
          correct: [1],
          explanation: 'Scale-to-zero plus heavy init is the worst combination for latency. The trade is explicit and priced, not assumed away.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'Going deeper',
      md: `- The capstone: build pattern 1 on both platforms, measure, and write the comparison.
- VAST's DataEngine blog posts — the vendor's own pattern catalogue, to test against this lesson.
- Knative's eventing samples repository — reference fan-out and sequence designs.`,
    },
  ],
}

export default lesson
