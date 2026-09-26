import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'k2.l1',
  slug: 'sources-sinks-addressables',
  trackId: 'k2',
  index: 1,
  title: 'Sources, Sinks, Addressables',
  minutes: 14,
  hook: 'Knative Eventing has one idea underneath all its object types: anything with a URL in its status can receive events, and anything with a sink field can send them. Everything else is composition.',
  exercise: 'read+quiz',
  takeaway: {
    number: '1 field: status.address.url',
    claim: 'An Addressable is any object that publishes status.address.url; a source is anything that POSTs CloudEvents to a sink it resolves to such a URL — so sources, brokers, channels and services compose without knowing each other\'s types.',
  },
  blocks: [
    {
      type: 'prose',
      md: `Serving is about requests someone is waiting for. **Eventing** is about events nobody is waiting for: an object was uploaded, a schedule fired, a row changed. The producer wants to announce it and move on; zero, one or many consumers may care.

Eventing is built on two duck types — contracts defined by *fields*, not by kind:

- **Addressable**: an object whose \`status.address.url\` says where to POST events. A Knative Service, a Broker, a Channel, even a plain Kubernetes Service (via its DNS name) all qualify.
- **Source**: an object with a \`spec.sink\` that points at an Addressable. The source's job is to turn something in the world into CloudEvents and POST them to whatever URL the sink resolves to.`,
    },
    {
      type: 'code',
      filename: 'every addressable, one field',
      lang: 'bash',
      code: `kubectl get broker alice-broker -o jsonpath='{.status.address.url}{"\\n"}'
# http://broker-ingress.knative-eventing.svc.cluster.local/default/alice-broker
kubectl get ksvc alice-display -o jsonpath='{.status.address.url}{"\\n"}'
# http://alice-display.default.svc.cluster.local
kubectl get inmemorychannel alice-broker-kne-trigger -o jsonpath='{.status.address.url}{"\\n"}'
# http://alice-broker-kne-trigger-kn-channel.default.svc.cluster.local`,
    },
    {
      type: 'prose',
      md: `A sink is written as a **reference** (\`apiVersion\`, \`kind\`, \`name\`), or as a bare \`uri\`. The source controller resolves the reference to the object's current URL and keeps it up to date. That indirection is why you can swap a Knative Service for a Broker behind a source without touching the source's code — it only ever sees a URL.`,
    },
    {
      type: 'prose',
      md: `## The sources that ship with Knative

| source | turns this into events | used in |
|---|---|---|
| **PingSource** | a cron schedule, with fixed data | lab 04 |
| **ApiServerSource** | Kubernetes API changes (pods created, …) | cluster automation |
| **ContainerSource** | whatever a container you supply emits — it gets \`K_SINK\` in its env | custom adapters |
| **SinkBinding** | nothing itself: it *injects* \`K_SINK\` into your existing Deployment or Job | making any app a source |

Beyond these, source adapters exist as separate installs for Kafka topics, GitHub webhooks, cloud queues and more. They all do the same two things: read from somewhere, POST CloudEvents to \`K_SINK\`.`,
    },
    {
      type: 'diagram',
      caption: 'fig 1 — direct delivery vs through a broker',
      height: 66,
      nodes: [
        { id: 'ping', x: 2, y: 6, w: 18, h: 12, label: 'PingSource', sub: 'spec.sink' },
        { id: 'svc', x: 40, y: 6, w: 20, h: 12, label: 'ksvc', sub: 'address.url' },
        { id: 'src2', x: 2, y: 40, w: 18, h: 12, label: 'any source', sub: 'spec.sink' },
        { id: 'broker', x: 40, y: 40, w: 20, h: 12, label: 'Broker', sub: 'address.url' },
        { id: 'a', x: 78, y: 30, w: 20, h: 10, label: 'consumer A', sub: 'via trigger' },
        { id: 'b', x: 78, y: 50, w: 20, h: 10, label: 'consumer B', sub: 'via trigger' },
      ],
      edges: [
        { from: 'ping', to: 'svc', label: 'POST' },
        { from: 'src2', to: 'broker', label: 'POST' },
        { from: 'broker', to: 'a' },
        { from: 'broker', to: 'b' },
      ],
      steps: [
        { caption: 'A source resolves its sink reference to a URL — here a Knative Service\'s status.address.url — and POSTs every event there. One producer, one consumer, hard-wired.', active: ['ping', 'svc'], edges: ['ping->svc'] },
        { caption: 'Swap the sink for a Broker and nothing about the source changes. It still POSTs to one URL; it just happens to belong to a broker.', active: ['src2', 'broker'], edges: ['src2->broker'] },
        { caption: 'The broker fans the event out to every trigger whose filter matches. Consumers can be added and removed without the producer ever knowing — the reason to pay for the extra hop.', active: ['broker', 'a', 'b'], edges: ['broker->a', 'broker->b'] },
      ],
    },
    {
      type: 'prose',
      md: `## Direct or through a broker?

Wiring a source straight to a service is simpler and one hop cheaper. It is right when there is exactly one consumer and there always will be. The moment a second team wants the same events, a direct wire means reconfiguring the producer. A broker in the middle decouples the two sides — producers post to the broker, consumers subscribe with triggers — at the cost of one hop and one more component to operate.

A source can only have **one** sink. That is the most common reason people introduce a broker: they wanted a second consumer and discovered they cannot add one.`,
    },
    {
      type: 'callout',
      variant: 'info',
      title: 'Adapters scale on demand too',
      md: `In lab 00 the \`pingsource-mt-adapter\` Deployment sat at **0/0** replicas. Creating the first PingSource in lab 04 scaled it to **1/1**. Knative runs one multi-tenant adapter for all PingSources in the cluster and only when there is at least one — the same "pay for nothing when idle" instinct as scale-to-zero.`,
    },
    {
      type: 'isomorphism',
      title: 'an old pattern with new names',
      pairs: [
        { os: 'webhook URL', osLine: 'You register a URL with a SaaS; it POSTs JSON there when something happens.', llm: 'sink', llmLine: 'You give a source a sink; it POSTs CloudEvents to its resolved URL.' },
        { os: 'Unix pipe', osLine: 'a | b: a writes to stdout, knows nothing about b.', llm: 'source → sink', llmLine: 'The source writes to K_SINK and knows nothing about who is behind it.' },
      ],
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'A PingSource sends nightly events to a report service. Now the audit team wants the same events. What is the cleanest change?',
          options: [
            'Add a second sink to the PingSource',
            'Create a second PingSource with the same schedule pointing at the audit service',
            'Point the PingSource at a Broker and give each consumer a Trigger',
            'Have the report service forward every event to the audit service',
          ],
          correct: [2],
          explanation: 'A source has exactly one sink. Duplicating sources doubles producers and lets them drift; chaining services couples two teams. A broker is built for fan-out: new consumers are new triggers, and the producer never changes.',
        },
        {
          q: 'Your existing app (a plain Deployment) should start emitting events into Knative without code changes to discover where to send them. Which object helps?',
          options: ['PingSource', 'SinkBinding — it injects the resolved sink URL as K_SINK into the pod spec', 'ApiServerSource', 'A second Knative Service'],
          correct: [1],
          explanation: 'SinkBinding resolves a sink and injects K_SINK into the target workload. The app only needs to POST CloudEvents to $K_SINK; the platform keeps the URL current if the sink moves.',
        },
        {
          q: 'Why can a Broker, a Channel and a Knative Service all be used as a sink interchangeably?',
          options: [
            'They are the same Kubernetes kind',
            'They all implement the Addressable duck type: each publishes status.address.url, and sinks only need a URL',
            'Knative converts them into Brokers internally',
            'Only Brokers can actually be sinks; the others are aliases',
          ],
          correct: [1],
          explanation: 'Eventing composes by field-level contracts. Anything with an address URL can receive; anything with a sink can send. That is also how third-party components plug in without Knative knowing their types.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'Going deeper',
      md: `- Knative "Event sources" (knative.dev/docs/eventing/sources/) — the list of maintained sources and the source spec.
- \`kubectl explain pingsource.spec\` and \`kubectl explain sinkbinding.spec.subject\` — the fields above, from the CRDs.
- Knative "Duck typing" in the eventing docs — how Addressable and Source are defined as field contracts.`,
    },
  ],
}

export default lesson
