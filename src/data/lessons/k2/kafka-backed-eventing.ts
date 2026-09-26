import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'k2.l5',
  slug: 'kafka-backed-eventing',
  trackId: 'k2',
  index: 5,
  title: 'Kafka-Backed Eventing',
  minutes: 17,
  hook: 'Swap the channel for a Kafka topic and the Broker API does not change at all — but now events survive a crash, can be replayed, and can be delivered in order. Ordering costs you something most people only notice in production.',
  exercise: 'read+quiz',
  takeaway: {
    number: '1 partition = 1 in flight',
    claim: 'An ordered Kafka-backed trigger blocks each partition until the subscriber succeeds, so throughput per partition is bounded by 1 ÷ handler latency — at 200 ms that is 5 events/s per partition, however many pods you run.',
  },
  blocks: [
    {
      type: 'prose',
      md: `K2.L3 left you with a problem: the default channel keeps events in memory. The production answer on most Knative clusters is a **Kafka-backed** broker — the \`Kafka\` broker class — where every broker is backed by a Kafka topic. The YAML you write barely changes:

\`\`\`yaml
apiVersion: eventing.knative.dev/v1
kind: Broker
metadata:
  name: orders
  annotations:
    eventing.knative.dev/broker.class: Kafka
spec:
  config: { apiVersion: v1, kind: ConfigMap, name: kafka-broker-config, namespace: knative-eventing }
\`\`\`

Triggers, filters, delivery specs and dead-letter sinks work exactly as in K2.L2 and K2.L4. What changes is what sits under them: a replicated, append-only log.`,
    },
    {
      type: 'prose',
      md: `## What the log buys you

- **Durability.** An accepted event is a record in a replicated topic. A dispatcher crash no longer loses it; the consumer resumes from its committed offset.
- **Replay.** Events are retained for the topic's retention period. A new consumer — or a fixed one — can re-read history rather than wait for new events.
- **Ordering, if you ask for it.** Records in one partition have a total order. A trigger can be told to deliver that order.
- **Decoupled throughput.** Producers write at the rate the log accepts; consumers read at the rate they can process. A slow subscriber builds consumer lag instead of pushing back on producers.

It also costs you something: a Kafka cluster to run (or buy), and a new operational number — **consumer lag** — that becomes the most important dashboard in your event system.`,
    },
    {
      type: 'diagram',
      caption: 'fig 1 — a Kafka-backed broker',
      height: 70,
      nodes: [
        { id: 'prod', x: 2, y: 28, w: 14, h: 12, label: 'producer', sub: 'POST' },
        { id: 'recv', x: 20, y: 28, w: 18, h: 12, label: 'receiver', sub: 'writes records' },
        { id: 'p0', x: 44, y: 8, w: 16, h: 10, label: 'partition 0', sub: 'ordered log' },
        { id: 'p1', x: 44, y: 30, w: 16, h: 10, label: 'partition 1', sub: 'ordered log' },
        { id: 'p2', x: 44, y: 52, w: 16, h: 10, label: 'partition 2', sub: 'ordered log' },
        { id: 'disp', x: 66, y: 28, w: 16, h: 12, label: 'dispatcher', sub: 'per trigger' },
        { id: 'sub', x: 86, y: 28, w: 12, h: 12, label: 'handler', sub: 'your code' },
      ],
      edges: [
        { from: 'prod', to: 'recv' },
        { from: 'recv', to: 'p0' },
        { from: 'recv', to: 'p1' },
        { from: 'recv', to: 'p2' },
        { from: 'p0', to: 'disp' },
        { from: 'p1', to: 'disp' },
        { from: 'p2', to: 'disp' },
        { from: 'disp', to: 'sub' },
      ],
      steps: [
        { caption: 'The producer POSTs to the broker URL as before. The kafka-broker-receiver turns the CloudEvent into a Kafka record — attributes as record headers, data as the value.', active: ['prod', 'recv'], edges: ['prod->recv'] },
        { caption: 'The record lands in one partition of the broker\'s topic. Within a partition there is a total order; across partitions there is none.', active: ['recv', 'p0', 'p1', 'p2'], edges: ['recv->p0', 'recv->p1', 'recv->p2'] },
        { caption: 'For each trigger, the kafka-broker-dispatcher consumes the topic, applies the filter, and delivers matches to the subscriber — committing offsets as it goes.', active: ['p0', 'p1', 'p2', 'disp'], edges: ['p0->disp', 'p1->disp', 'p2->disp'] },
        { caption: 'Unordered (default): many records per partition in flight at once — fast, no ordering. Ordered: one record per partition in flight, the next waits for success.', active: ['disp', 'sub'], edges: ['disp->sub'] },
      ],
    },
    {
      type: 'prose',
      md: `## The ordering trade, in numbers

A trigger on a Kafka broker delivers **unordered** by default: the dispatcher sends many records from each partition concurrently. Annotate the trigger with \`kafka.eventing.knative.dev/delivery.order: ordered\` and it becomes a blocking consumer **per partition**: record n+1 is not sent until record n succeeded (or exhausted its retries).

That makes per-partition throughput a function of one number:

\`\`\`
max events/s per partition = 1 ÷ handler latency

handler 20 ms   →  50 /s per partition
handler 200 ms  →   5 /s per partition
handler 2 s     → 0.5 /s per partition
\`\`\`

Adding pods does not help: only one event per partition is ever in flight. To go faster you need **more partitions** — and events that must stay ordered relative to each other must share a partition, which is what the CloudEvents \`partitionkey\` extension controls. Order *per customer* is cheap (key by customer id, many partitions). Order *globally* means one partition and a hard ceiling.`,
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'Ordered + a poison event = a stopped partition',
      md: `In ordered mode, an event that keeps failing blocks every event behind it in its partition until its retries run out. A generous retry policy (K2.L4) on an ordered trigger can stall a partition for minutes. Pair ordered delivery with short retries and a dead-letter sink, or you have built a queue that one bad message can freeze.`,
    },
    {
      type: 'vendor',
      snapshot: '2026-09',
      title: 'The Knative Kafka broker',
      systems: ['knative', 'kafka'],
      sources: ['https://knative.dev/docs/eventing/brokers/broker-types/kafka-broker/'],
      md: `Documented: the Kafka broker stores CloudEvents as Kafka records in binary content mode (attributes and extensions as record headers, \`data\` as the record value); by default it creates an internal topic per Broker, or uses an existing topic via \`kafka.eventing.knative.dev/external.topic\`; topic defaults come from \`default.topic.partitions\`, \`default.topic.replication.factor\` and \`bootstrap.servers\` in its ConfigMap; the data plane is the \`kafka-broker-receiver\` and \`kafka-broker-dispatcher\` Deployments; triggers accept \`kafka.eventing.knative.dev/delivery.order\` = \`unordered\` (default) or \`ordered\`. Not run on the reference cluster, which has no Kafka — the throughput arithmetic above follows from the documented blocking semantics.`,
    },
    {
      type: 'callout',
      variant: 'info',
      title: 'Why this matters for DataEngine',
      md: `VAST describes its DataEngine event broker as Kafka-compatible, and DataEngine pipeline links carry an \`events_order\` setting. The partition and ordering arithmetic above is the model to bring to D2.L1 — and to test on your own cluster rather than assume.`,
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'An ordered Kafka trigger feeds a handler that takes 250 ms. The topic has 6 partitions. What is the maximum sustained throughput, and what change raises it?',
          options: [
            '6 ÷ 0.25 = 24 events/s; raise it with more partitions (or a faster handler), not more pods',
            '4 events/s; raise it with more pods',
            'Unlimited; ordering only affects latency',
            '24 events/s; raise it by increasing retries',
          ],
          correct: [0],
          explanation: 'Ordered delivery allows one in-flight event per partition: 1 ÷ 0.25 = 4 per partition, × 6 = 24. Extra pods sit idle because the dispatcher will not send them more. More partitions (with a partition key that preserves the ordering you need) is the lever.',
        },
        {
          q: 'A team asks for "exactly-once, globally ordered" processing of all payment events and also wants it to scale with traffic. What is the honest response?',
          options: [
            'Use an ordered Kafka trigger — it provides all three',
            'Global order implies one partition and a throughput ceiling of 1 ÷ latency; ask what actually needs ordering (per account is usually enough) and make the handler idempotent rather than rely on exactly-once delivery',
            'Use InMemoryChannel for speed',
            'Increase max-scale on the subscriber',
          ],
          correct: [1],
          explanation: 'The three requirements fight each other. Per-key ordering scales; global ordering does not. And the delivery layer is at-least-once, so exactly-once is a property you build in the handler (X1.L3).',
        },
        {
          q: 'Why might a platform team choose the Kafka broker over the default even for unordered workloads?',
          options: [
            'It is faster on a laptop',
            'Durability and replay: accepted events are records in a replicated log that survive dispatcher crashes and can be re-read',
            'It removes the need for dead-letter sinks',
            'It makes triggers filter on data fields',
          ],
          correct: [1],
          explanation: 'The Broker API is the same; the guarantee underneath is not. Filtering still reads attributes only, and dead-letter handling is still your job.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'Going deeper',
      md: `- Knative "Apache Kafka Broker" (knative.dev/docs/eventing/brokers/broker-types/kafka-broker/) — install, configuration, ordering, and the security settings for a real Kafka.
- The CloudEvents "Partitioning" extension (\`partitionkey\`) in the CloudEvents spec repository.
- Kafka's own documentation on consumer groups and offsets — the concepts under "consumer lag".`,
    },
  ],
}

export default lesson
