import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'k2.l2',
  slug: 'broker-and-trigger',
  trackId: 'k2',
  index: 2,
  title: 'Broker and Trigger',
  minutes: 18,
  hook: 'A broker is not a process you run — every broker in the cluster shares one ingress and one filter deployment. A trigger is a filter plus a subscriber, and one event can match any number of them.',
  exercise: 'lab+quiz',
  takeaway: {
    number: '202 ≠ processed',
    claim: 'A 202 from the broker never means an event was processed — a dead-lettered event still gets one — and on the default in-memory broker it is not even immediate: measured 3.03 s when one trigger was retrying, 5 ms when no trigger matched.',
  },
  blocks: [
    {
      type: 'prose',
      md: `A **Broker** is an event bus with an address. Producers POST CloudEvents to its URL. A **Trigger** says "events on *that* broker whose attributes match *this* filter go to *that* subscriber". Producers and consumers never reference each other; they both reference the broker.

That decoupling is the reason to use one. The price is a hop, a component in the middle that must be up, and a new failure mode: events accepted by the bus that nobody handles.`,
    },
    {
      type: 'statline',
      stats: [
        { value: '1', label: 'ingress for every broker', hint: 'mt-broker-ingress: brokers differ only by URL path' },
        { value: '1', label: 'filter for every trigger', hint: 'mt-broker-filter evaluates trigger filters and delivers' },
        { value: '3.03 s vs 5 ms', label: 'time to 202', hint: 'measured on the default broker: an event one trigger kept failing (1 s + 2 s backoff) vs a type no trigger matched' },
        { value: 'N', label: 'triggers one event can match', hint: 'fan-out: every matching trigger gets its own copy' },
      ],
    },
    {
      type: 'prose',
      md: `## What a broker actually is

On the reference cluster both brokers had the same host:

\`\`\`
http://broker-ingress.knative-eventing.svc.cluster.local/default/alice-broker
http://broker-ingress.knative-eventing.svc.cluster.local/default/example-broker
\`\`\`

The default broker class, **MTChannelBasedBroker**, is multi-tenant: one \`mt-broker-ingress\` Deployment receives for every broker, keyed by path; one \`mt-broker-filter\` Deployment evaluates every trigger. Underneath, each broker is backed by a **channel** (an InMemoryChannel by default, K2.L3), and each trigger is a **subscription** to that channel:`,
    },
    {
      type: 'code',
      filename: 'what lab 04 created underneath',
      lang: 'bash',
      code: `kubectl get inmemorychannels,subscriptions
# inmemorychannel/alice-broker-kne-trigger                      True
# subscription/alice-broker-alice-heartbeat-4a07a920…            True
# subscription/alice-broker-alice-orders-fail-8ffdad92…          True`,
    },
    {
      type: 'diagram',
      caption: 'fig 1 — one event, two triggers',
      height: 72,
      nodes: [
        { id: 'prod', x: 2, y: 28, w: 16, h: 12, label: 'producer', sub: 'POST → 202' },
        { id: 'ing', x: 22, y: 28, w: 18, h: 12, label: 'broker-ingress', sub: 'by URL path' },
        { id: 'ch', x: 44, y: 28, w: 16, h: 12, label: 'channel', sub: 'fan-out' },
        { id: 'f1', x: 64, y: 6, w: 16, h: 12, label: 'filter A', sub: 'type = …ping' },
        { id: 'f2', x: 64, y: 50, w: 16, h: 12, label: 'filter B', sub: 'type = …order' },
        { id: 's1', x: 84, y: 6, w: 14, h: 12, label: 'display', sub: 'subscriber' },
        { id: 's2', x: 84, y: 50, w: 14, h: 12, label: 'flaky', sub: 'subscriber' },
      ],
      edges: [
        { from: 'prod', to: 'ing' },
        { from: 'ing', to: 'ch' },
        { from: 'ch', to: 'f1' },
        { from: 'ch', to: 'f2' },
        { from: 'f1', to: 's1', label: 'match' },
        { from: 'f2', to: 's2', label: 'match' },
      ],
      steps: [
        { caption: 'The producer POSTs to the broker URL. The shared ingress adds knativearrivaltime and hands the event to the channel — and, on the in-memory broker, holds the producer\'s request open while it does.', active: ['prod', 'ing'], edges: ['prod->ing'] },
        { caption: 'The ingress writes the event into the broker\'s channel. Every trigger on this broker is a subscription to that channel, so every one of them sees every event.', active: ['ing', 'ch'], edges: ['ing->ch'] },
        { caption: 'The shared filter component checks each trigger\'s filter against the event\'s attributes. An order event matches filter B and not filter A.', active: ['ch', 'f1', 'f2'], edges: ['ch->f1', 'ch->f2'] },
        { caption: 'Each match is delivered with that trigger\'s own retry and dead-letter policy, in parallel. Only when every delivery has finished — succeeded or dead-lettered — does the producer get its 202.', active: ['f2', 's2', 'f1', 's1'], edges: ['f2->s2'] },
      ],
    },
    {
      type: 'prose',
      md: `## What the 202 actually means

The tidy story is "the broker accepts, answers 202, and delivers later". Measure it on the default broker and it is not what happens. Posting to \`alice-broker\` from inside the cluster:

\`\`\`
type dev.functionspace.order.created  -> 202 in 3.03 s   # one matching trigger is failing: 1 s + 2 s backoff
type dev.functionspace.nobody         -> 202 in 0.005 s  # no trigger matches
\`\`\`

The in-memory channel fans out **synchronously**: the ingress waits for the channel, the channel waits until every subscription has finished — succeeded, or exhausted its retries and been dead-lettered — and only then does the producer get its 202. Two consequences:

- **202 still does not mean processed.** The order above was rejected by its subscriber three times and dead-lettered, and the producer got 202 anyway.
- **Producer latency includes your slowest subscriber's retry policy.** A trigger with the default 10 retries (K2.L4) can hold every producer on that broker for minutes. K2.L6 shows what that does to a reply loop.

A Kafka-backed broker (K2.L5) behaves the way the tidy story says: its 202 means "written to the log", and delivery happens afterwards, on the dispatcher's own schedule.

## Filters

The original \`filter.attributes\` does **exact** matching on attributes, ANDed together:

\`\`\`yaml
filter:
  attributes:
    type: dev.functionspace.order.created
    source: /labs/broker-trigger/alice
\`\`\`

The newer \`filters\` field adds \`prefix\`, \`suffix\`, \`all\`, \`any\`, \`not\` and **CESQL** (CloudEvents SQL) expressions. On the reference cluster a trigger with

\`\`\`yaml
filters:
  - prefix: { type: dev.functionspace.order. }
\`\`\`

received both \`order.created\` and \`order.priced\`. Either way, filters read **attributes** — never your JSON body. If routing depends on data, the producer must lift it into an attribute (F0.L2).`,
    },
    {
      type: 'callout',
      variant: 'segfault',
      title: 'Accepted, then dropped, silently',
      md: `If no trigger matches an event, the broker accepted it (202) and nobody will ever see it. There is no error, no log line in the producer, no dead letter — dead-letter sinks are per trigger, and there is no trigger. Before relying on a broker in production, decide how you will notice an event type nobody consumes: a catch-all trigger to an audit sink is the usual answer.`,
    },
    {
      type: 'vendor',
      snapshot: '2026-09',
      title: 'Broker class and filters on Knative Eventing v1.23',
      systems: ['knative'],
      sources: ['https://knative.dev/docs/eventing/brokers/', 'https://knative.dev/docs/eventing/triggers/'],
      md: `\`config-br-defaults\` on the reference cluster sets \`brokerClass: MTChannelBasedBroker\` backed by the channel type in \`config-br-default-channel\` (InMemoryChannel). \`kubectl explain trigger.spec.filters\` documents the SubscriptionsAPI filter dialects; per the CRD description, if both \`filter\` and \`filters\` are set, \`filters\` wins. The prefix match above was tested on the reference cluster. Other broker classes (Kafka, RabbitMQ) are separate installs with the same Broker/Trigger API.`,
    },
    {
      type: 'lab',
      lab: 'broker-trigger',
      brief: 'Create a broker, a PingSource and two triggers filtering on different types, then send an order into a subscriber that always fails and watch the retries and the dead-letter sink.',
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'A producer team says: "We get 202 from the broker, so the order was processed." What is wrong with that statement?',
          options: [
            'Nothing — 202 means the subscriber returned success',
            '202 means the broker accepted the event; delivery to subscribers happens later, may be retried, may be dead-lettered, and if no trigger matches, nothing happens at all',
            '202 means the event was rejected',
            'Brokers return 200 on success, so 202 means a partial failure',
          ],
          correct: [1],
          explanation: 'A dead-lettered event still gets 202 — measured on the reference cluster. Whatever the broker class, 202 says the broker took responsibility, not that a subscriber succeeded. If the producer needs to know an order was processed, that is a reply event, a status record, or a synchronous call.',
        },
        {
          q: 'Two triggers on the same broker both filter on type=order.created, pointing at the billing service and the email service. The email service is down for an hour. What happens to billing?',
          options: [
            'Billing also stops — the broker delivers in order',
            'Billing is still delivered — each trigger has its own delivery and retries — but on the default in-memory broker every producer POST now waits for email\'s retries before getting its 202',
            'The broker queues everything until email recovers',
            'The broker returns 500 to the producer',
          ],
          correct: [1],
          explanation: 'Deliveries are independent, so billing gets its events. But the in-memory channel fans out synchronously, so producers are held until email\'s retries finish (3 s per event with retry 2 and 1 s backoff on the reference cluster; minutes with the defaults). A Kafka-backed broker decouples producers from subscriber health entirely.',
        },
        {
          q: 'An auditor asks how you would know if a new event type is being produced that nothing consumes. What is the best answer?',
          options: [
            'The broker logs an error for unmatched events',
            'Producers get a 404 for unmatched events',
            'Add a catch-all trigger (or a prefix filter on your type namespace) to an audit sink, and alert on types you do not expect',
            'It cannot happen — brokers reject unknown types',
          ],
          correct: [2],
          explanation: 'Unmatched events are accepted and discarded silently. Visibility has to be designed in, and a catch-all audit subscription is the cheapest way.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'Going deeper',
      md: `- Knative "Brokers" and "Triggers" (knative.dev/docs/eventing/) — broker classes, the filters dialects, and CESQL.
- \`kubectl logs -n knative-eventing deploy/mt-broker-filter\` while running lab 04 — each retry against the flaky subscriber is a \`failed to send event\` line, one second then two seconds apart.
- The CESQL spec in the CloudEvents repository — the expression language behind \`filters.cesql\`.`,
    },
  ],
}

export default lesson
