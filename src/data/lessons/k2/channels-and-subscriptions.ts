import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'k2.l3',
  slug: 'channels-and-subscriptions',
  trackId: 'k2',
  index: 3,
  title: 'Channels and Subscriptions',
  minutes: 14,
  hook: 'Under every broker in lab 04 was a channel you never created and a subscription per trigger. The default channel keeps events in memory — so the durability of your whole event system is one ConfigMap line, and a graceful restart will hide that from you.',
  exercise: 'read+quiz',
  takeaway: {
    number: '0 bytes on disk',
    claim: 'The default InMemoryChannel keeps undelivered events only in the dispatcher\'s memory, so a crash or node loss loses them; the channel implementation, not the Broker API, decides whether your events are durable.',
  },
  blocks: [
    {
      type: 'prose',
      md: `A **Channel** is the lowest-level transport in Knative Eventing: an addressable that accepts events and forwards each one to every **Subscription** attached to it. No filtering, no routing — pure fan-out. A Subscription names a channel, a **subscriber** to deliver to, an optional **reply** destination for whatever the subscriber answers, and a delivery policy.

You rarely create either directly any more. Brokers and flows (K2.L6) create them for you. But they are what is actually moving your events, and their implementation decides the properties you care about in production.`,
    },
    {
      type: 'code',
      filename: 'the plumbing lab 04 created, and a Sequence created',
      lang: 'bash',
      code: `kubectl get inmemorychannels,subscriptions
# inmemorychannel/alice-broker-kne-trigger                     ← backs alice-broker
# inmemorychannel/alice-seq-kn-sequence-0                      ← backs step 0 of a Sequence
# subscription/alice-broker-alice-heartbeat-4a07a920…          ← one per trigger
# subscription/alice-broker-alice-orders-fail-8ffdad92…
# subscription/alice-seq-kn-sequence-0                          ← one per Sequence step

kubectl get broker alice-broker -o jsonpath='{.status.annotations}'
# {"knative.dev/channelKind":"InMemoryChannel","knative.dev/channelName":"alice-broker-kne-trigger", …}`,
    },
    {
      type: 'diagram',
      caption: 'fig 1 — channel, subscriptions, replies',
      height: 64,
      nodes: [
        { id: 'in', x: 2, y: 24, w: 16, h: 12, label: 'producer', sub: 'POST' },
        { id: 'ch', x: 24, y: 24, w: 18, h: 12, label: 'channel', sub: 'fan-out only' },
        { id: 'sub1', x: 50, y: 6, w: 20, h: 12, label: 'subscription 1', sub: 'subscriber + reply' },
        { id: 'sub2', x: 50, y: 42, w: 20, h: 12, label: 'subscription 2', sub: 'subscriber' },
        { id: 'svc', x: 78, y: 6, w: 20, h: 12, label: 'subscriber', sub: 'returns an event' },
        { id: 'reply', x: 78, y: 42, w: 20, h: 12, label: 'reply target', sub: 'next channel / sink' },
      ],
      edges: [
        { from: 'in', to: 'ch' },
        { from: 'ch', to: 'sub1' },
        { from: 'ch', to: 'sub2' },
        { from: 'sub1', to: 'svc', label: 'deliver' },
        { from: 'svc', to: 'reply', label: 'reply' },
      ],
      steps: [
        { caption: 'A producer POSTs to the channel\'s address. The channel does no filtering; it exists only to hand each event to every subscription.', active: ['in', 'ch'], edges: ['in->ch'] },
        { caption: 'Each subscription gets its own copy and its own delivery attempts, exactly like triggers — because in a channel-based broker, each trigger is a subscription.', active: ['ch', 'sub1', 'sub2'], edges: ['ch->sub1', 'ch->sub2'] },
        { caption: 'The subscription delivers to its subscriber. If the subscriber responds with a CloudEvent, that response is not thrown away.', active: ['sub1', 'svc'], edges: ['sub1->svc'] },
        { caption: 'It is sent on to the subscription\'s reply target — another channel, a broker, a sink. Chaining replies is how Sequences and broker reply loops are built.', active: ['svc', 'reply'], edges: ['svc->reply'] },
      ],
    },
    {
      type: 'prose',
      md: `## The implementation is the guarantee

The Channel API is the same whichever implementation backs it. The guarantees are not:

| implementation | where undelivered events live | survives a crash / node loss? | ordering |
|---|---|---|---|
| **InMemoryChannel** (default) | the dispatcher process's memory | **no** | none promised |
| **KafkaChannel** | a Kafka topic | yes | per partition, if configured |
| other (NATS, RabbitMQ, …) | that system | depends on it | depends on it |

InMemoryChannel is for development and demos, and the Knative docs say so. It is what \`kn quickstart\` installs because it needs nothing else.

Here is the trap. On the reference cluster, an order was sent into lab 04's failing subscriber with a 5-retry policy, and 4 seconds later the \`imc-dispatcher\` pod was deleted — then, on a second try, force-deleted together with \`mt-broker-filter\`. **Both times the event still reached the dead-letter sink.** A pod delete is graceful: the process gets SIGTERM and time to finish in-flight work. So the obvious test says "durable". It is not. What memory cannot survive is the process dying without that chance — an OOM kill, a kernel panic, a node losing power — and none of those are tests you run casually. Durability you have not demonstrated under a crash is not durability you can promise.`,
    },
    {
      type: 'callout',
      variant: 'segfault',
      title: 'The demo default in production',
      md: `A predictable Knative Eventing incident is not a bug at all: a cluster that went to production with \`config-br-default-channel\` still pointing at InMemoryChannel. Check it on any cluster you inherit: \`kubectl get cm config-br-default-channel -n knative-eventing -o yaml\`.`,
    },
    {
      type: 'vendor',
      snapshot: '2026-09',
      title: 'Channel defaults on the reference cluster',
      systems: ['knative'],
      sources: ['https://knative.dev/docs/eventing/channels/'],
      md: `\`default-ch-webhook\` sets \`clusterDefault: InMemoryChannel\`; \`config-br-defaults\` gives the default broker class as \`MTChannelBasedBroker\` using the channel template in \`config-br-default-channel\`. The InMemoryChannel is served by the \`imc-controller\` and \`imc-dispatcher\` Deployments in \`knative-eventing\`. The Knative docs describe InMemoryChannel as not suitable for production because it has no persistence.`,
    },
    {
      type: 'isomorphism',
      title: 'you know this shape',
      pairs: [
        { os: 'pub/sub topic', osLine: 'Publishers write to a topic; each subscription receives every message.', llm: 'channel', llmLine: 'Producers POST to a channel; each subscription receives every event.' },
        { os: 'in-memory queue in a web app', osLine: 'Fast and simple until the process restarts and the queue is empty.', llm: 'InMemoryChannel', llmLine: 'Fast and simple until imc-dispatcher crashes and the pending events are gone.' },
      ],
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'A node running the eventing data plane loses power. Afterwards, a handful of orders sent just before are missing: never processed, never dead-lettered. The broker is the default kind. What is the most likely cause?',
          options: [
            'The functions rejected the events',
            'The broker was backed by InMemoryChannel; events awaiting delivery or retry lived only in the dispatcher\'s memory and died with the node',
            'The broker was deleted during the outage',
            'The trigger filters changed',
          ],
          correct: [1],
          explanation: 'No dead letters and no function errors point at loss below the delivery layer. The default channel has no persistence. The fix is a durable channel/broker implementation (Kafka-backed), which is a platform decision rather than a code change.',
        },
        {
          q: 'A subscriber returns a CloudEvent in its HTTP response. Where does it go?',
          options: [
            'It is discarded',
            'To the subscription\'s reply destination, if one is set (for a trigger on a broker, back into the broker)',
            'Back to the original producer',
            'Into the dead-letter sink',
          ],
          correct: [1],
          explanation: 'Replies are a first-class part of subscriptions. On a broker, a trigger subscriber\'s reply is posted back into the broker as a new event — which is how lab 05\'s priced event reached another trigger in K2.L6.',
        },
        {
          q: 'A risk review asks: "Is our event system durable?" What do you inspect to answer?',
          options: [
            'The Broker objects\' spec',
            'The channel or broker implementation actually in use (config-br-default-channel, broker class), because the Broker API itself makes no durability promise',
            'The function code',
            'The Kourier configuration',
          ],
          correct: [1],
          explanation: 'Durability is a property of the implementation behind the API. Two identical Broker YAMLs can be durable or not depending on a ConfigMap. Say which implementation you run, and what it guarantees.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'Going deeper',
      md: `- Knative "Channels" (knative.dev/docs/eventing/channels/) — including the list of channel implementations and their properties.
- \`kubectl get subscription <name> -o yaml\` — read \`spec.subscriber\`, \`spec.reply\` and \`spec.delivery\`: the whole contract in three fields.
- Repeat the experiment above: delete \`imc-dispatcher\` while lab 04's flaky subscriber is mid-retry and watch the event still arrive at the DLS. Then ask what would have happened with \`kill -9\` on the node — that gap is the whole lesson.`,
    },
  ],
}

export default lesson
