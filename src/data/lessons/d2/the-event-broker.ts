import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'd2.l1',
  slug: 'the-event-broker',
  trackId: 'd2',
  index: 1,
  title: 'The Event Broker',
  minutes: 15,
  hook: 'DataEngine\'s event broker speaks the Kafka API and lives on the VAST cluster as a view — the same kind of object as a bucket. Every trigger publishes into it, every pipeline link reads from it, and its partition key decides what stays in order.',
  exercise: 'read+quiz',
  takeaway: {
    number: '1 object = 1 partition key',
    claim: 'DataEngine carries events on a Kafka-compatible broker hosted on the VAST cluster; an element event\'s partition key is its bucket/object path, so events about one object stay ordered while different objects spread across partitions — the K2.L5 model, applied.',
  },
  blocks: [
    {
      type: 'prose',
      md: `Between a trigger and a function there is always a topic (D1.L2). This lesson is about what carries it. VAST documents the **VAST Event Broker** as "compatible with the Kafka API" and "the backbone for all asynchronous communication inside the platform". K2.L5 already taught you the model — partitions, ordering, consumer groups — so this lesson is mostly about where DataEngine puts it and which knobs you see.`,
    },
    {
      type: 'prose',
      md: `## Internal and external brokers

Every trigger names a broker type:

- **Internal** — a VAST Event Broker on the cluster itself. The \`setup-dataengine\` documentation describes its broker name as "Bucket (View) name for internal": the broker is a **view** on the VAST cluster, just as a bucket is. In \`vastde buckets list\` on the reference tenant, the broker's view appears alongside ordinary buckets, with a Kafka protocol enabled.
- **External** — any Kafka elsewhere, given with \`--broker-url\`. Useful when events originate outside VAST or other consumers already live on that Kafka.

A DataEngine installation is set up (by an administrator, with \`vastde setup-dataengine\`) with a broker, a **default topic** and a **dead-letter topic**. The labs use the broker and topic your tenant's existing triggers already use.`,
    },
    {
      type: 'diagram',
      caption: 'fig 1 — the broker between triggers and functions',
      height: 70,
      nodes: [
        { id: 'et', x: 2, y: 6, w: 20, h: 12, label: 'element trigger', sub: 'bucket events' },
        { id: 'st', x: 2, y: 40, w: 20, h: 12, label: 'schedule trigger', sub: 'cron' },
        { id: 'p0', x: 32, y: 6, w: 18, h: 10, label: 'partition', sub: 'key: bucket/a.csv' },
        { id: 'p1', x: 32, y: 24, w: 18, h: 10, label: 'partition', sub: 'key: bucket/b.csv' },
        { id: 'p2', x: 32, y: 42, w: 18, h: 10, label: 'partition', sub: 'key: …' },
        { id: 'link', x: 60, y: 22, w: 18, h: 14, label: 'link', sub: 'events_order' },
        { id: 'fn', x: 84, y: 22, w: 14, h: 14, label: 'function', sub: 'copies' },
        { id: 'dlq', x: 60, y: 50, w: 18, h: 12, label: 'dead-letter topic', sub: 'setup-dataengine' },
      ],
      edges: [
        { from: 'et', to: 'p0' },
        { from: 'et', to: 'p1' },
        { from: 'st', to: 'p2' },
        { from: 'p0', to: 'link' },
        { from: 'p1', to: 'link' },
        { from: 'p2', to: 'link' },
        { from: 'link', to: 'fn' },
        { from: 'link', to: 'dlq', label: 'exhausted' },
      ],
      steps: [
        { caption: 'Triggers publish CloudEvents onto a topic on the broker. An element event\'s partition key is its bucket/key path, so all events about one object land in one partition.', active: ['et', 'st', 'p0', 'p1', 'p2'], edges: ['et->p0', 'et->p1', 'st->p2'] },
        { caption: 'Within a partition events are totally ordered; across partitions there is no order at all — the Kafka rule from K2.L5, unchanged.', active: ['p0', 'p1', 'p2'] },
        { caption: 'A pipeline link consumes the topic for its deployments. events_order chooses between parallel delivery (unordered) and in-order-per-partition delivery.', active: ['p0', 'p1', 'p2', 'link', 'fn'], edges: ['p0->link', 'p1->link', 'p2->link', 'link->fn'] },
        { caption: 'Events that exhaust their retries have a place to go: the installation\'s dead-letter topic. Make sure someone reads it (D2.L5).', active: ['link', 'dlq'], edges: ['link->dlq'] },
      ],
    },
    {
      type: 'prose',
      md: `## What ordering means here

From the runtime's own event model (D1.L4): an element event's \`partition_key\` **is** its \`elementpath\` — \`<bucket>/<object key>\`. So:

- Two events about **the same object** (created, then tagged, then removed) share a partition and can be delivered in order.
- Events about **different objects** have different keys and no ordering relationship at all.

That is usually exactly right for storage events: you care that "created" is processed before "removed" for one object, and you want a thousand uploads processed in parallel. The link's \`events_order\` decides whether the ordering is enforced. The arithmetic from K2.L5 applies unchanged: ordered delivery allows one in-flight event per partition, so throughput per partition is capped at 1 ÷ handler time.`,
    },
    {
      type: 'isomorphism',
      title: 'the Knative Kafka broker, again',
      pairs: [
        { os: 'Knative Kafka broker', osLine: 'A topic per broker; triggers consume it via consumer groups; delivery.order annotation.', llm: 'VAST Event Broker', llmLine: 'Kafka-compatible topics on the cluster; pipeline links consume them; events_order in the link config.' },
        { os: 'partitionkey extension', osLine: 'Chooses the partition; events with one key stay ordered.', llm: 'elementpath', llmLine: 'Is the partition key for object events: one object, one ordering domain.' },
      ],
    },
    {
      type: 'vendor',
      snapshot: '2026-09',
      title: 'The DataEngine event broker',
      systems: ['vast-dataengine'],
      sources: [
        'https://www.vastdata.com/blog/automation-with-vast-serverless-functions-in-dataengine',
        'https://github.com/vast-data/dataengine-cli/blob/main/docs/references/commands/vastde_setup-dataengine.md',
        'https://github.com/vast-data/dataengine-cli/blob/main/docs/references/commands/vastde_topics_list.md',
      ],
      md: `**Documented**: Kafka-API-compatible event broker; \`setup-dataengine\` configures an External or Internal broker ("Bucket (View) name for internal"), a default topic and a dead-letter topic. **Observed** on the reference tenant: the internal broker's view listed by \`vastde buckets list\` with a Kafka protocol; \`vastde topics list\` requires \`--database-name\` and returned \`503 Service Unavailable\` at the time of testing. **Read in the runtime source**: element events use \`elementpath\` as \`partition_key\`; output events carry the input's \`partitionkey\`. **Installer**: the DataEngine chart grants its controller access to Knative Kafka consumer groups (X1.L1).`,
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'A pipeline processes uploads with events_order set to ordered. One very large object takes 5 minutes to process. What happens to other uploads?',
          options: [
            'Everything waits 5 minutes',
            'Only events that share its partition wait; other objects\' events, in other partitions, keep flowing — with elementpath as the key, that is usually just events about the same object and anything hashed to the same partition',
            'Nothing is ordered on DataEngine',
            'The large object is skipped',
          ],
          correct: [1],
          explanation: 'Ordering is per partition. The partition key is the object path, so a slow object blocks its own partition — including unrelated keys that hash there — not the whole topic.',
        },
        {
          q: 'Your events originate in an application that already writes to a corporate Kafka. How can DataEngine consume them?',
          options: [
            'It cannot — only bucket events are supported',
            'A trigger with broker type External and --broker-url pointing at that Kafka',
            'Copy the events into a bucket first',
            'Use a schedule trigger to poll Kafka',
          ],
          correct: [1],
          explanation: 'Triggers can name an external Kafka broker. Whether to use it or the internal broker is an operational choice: who runs the Kafka, and who else consumes it.',
        },
        {
          q: 'Why does it matter that the internal broker is a view on the VAST cluster?',
          options: [
            'It does not matter',
            'Its availability, capacity and access control are the storage platform\'s — the event path shares a failure domain and a management plane with the data it describes',
            'It means events are stored as files you can edit',
            'It means there are no partitions',
          ],
          correct: [1],
          explanation: 'Consolidation is the point and the risk (D1.L1). Knowing the broker lives on the cluster tells you who to call and what an outage takes with it.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'Going deeper',
      md: `- K2.L5 for partitions, ordering and the throughput arithmetic.
- \`vastde triggers get <name> -o json\` — the \`broker\` block (type, name, URL) of any trigger.
- The public CLI reference for \`setup-dataengine\` — the administrator side of the broker.`,
    },
  ],
}

export default lesson
