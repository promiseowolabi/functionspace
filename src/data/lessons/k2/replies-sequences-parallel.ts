import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'k2.l6',
  slug: 'replies-sequences-parallel',
  trackId: 'k2',
  index: 6,
  title: 'Replies, Sequences, Parallel',
  minutes: 17,
  hook: 'A function that answers an event emits a new one. That is how you build pipelines without a workflow engine — and how, on the reference cluster, one order turned into 255 hops before the broker\'s TTL stopped it.',
  exercise: 'read+quiz',
  takeaway: {
    number: '255 hops',
    claim: 'A subscriber\'s reply becomes a new event on the broker; a reply that matches its own trigger loops until the knativebrokerttl extension (255) runs out — measured 255 hops — so every reply type must be distinct from every type its producer consumes.',
  },
  blocks: [
    {
      type: 'prose',
      md: `Everything so far delivered an event to a subscriber and cared only whether it returned 2xx. But a subscriber can return a **CloudEvent** in its response body — lab 05's pricing function returns \`order.priced\` for every \`order.created\`. What happens to that reply depends on who delivered the original:

- **Trigger on a broker** → the reply is posted **back into the broker** as a new event, where any trigger may match it.
- **Subscription on a channel** → the reply goes to the subscription's \`reply\` destination, if set.
- **Direct from a source, or a plain HTTP client** → the client just receives it (you saw that with \`curl\` in lab 05).

With that one rule you can build multi-step processing out of small functions that never call each other.`,
    },
    {
      type: 'prose',
      md: `## A reply chain through the broker

On the reference cluster, two triggers on \`alice-broker\`:

\`\`\`
alice-price   type = dev.functionspace.order.created  →  alice-fn       (replies order.priced)
alice-priced  type = dev.functionspace.order.priced   →  alice-display
\`\`\`

One \`order.created\` went in; the display logged:`,
    },
    {
      type: 'code',
      filename: 'alice-display',
      lang: 'text',
      code: `  type: dev.functionspace.order.priced
  source: /functions/alice-fn
  id: priced-order-1790424249
  datacontenttype: application/json
Data,
   {"order": "order-1790424249", "sku": "fs-001", "qty": 1, "known_sku": true, "total_pence": 1250, …}`,
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'Set datacontenttype on replies',
      md: `The first version of the pricing function did not set \`datacontenttype\`, and its reply arrived labelled \`text/plain; charset=utf-8\` — with a JSON body. Every consumer would have had to guess. The lab 05 solution now sets \`"datacontenttype": "application/json"\` explicitly; do the same in anything that emits events.`,
    },
    {
      type: 'prose',
      md: `## The loop

Now add a third trigger — \`type = order.priced\` → \`alice-fn\`. The pricing function consumes a priced event and replies with… another priced event. That is a loop, and on the reference cluster it ran for real. Each hop prefixed the event id with \`priced-\`, which makes the depth easy to read from the function's log:`,
    },
    {
      type: 'code',
      filename: 'alice-fn log, last line of the loop (trimmed)',
      lang: 'text',
      code: `pricing fs-001 x1 (event priced-priced-priced-…-priced-order-1790425161)
                         └──────── 254 × "priced-" ────────┘`,
    },
    {
      type: 'prose',
      md: `254 prefixes, plus the original: **255 hops**. The number is not a coincidence. The broker ingress stamps every event with a \`knativebrokerttl\` extension — you saw \`knativebrokerttl: 255\` on the dead letter in lab 04 — and decrements it on every trip back through the broker. At zero, the event is dropped. The TTL is the only thing that stopped this loop.

It was not harmless before it stopped. On the in-memory broker, reply forwarding is **nested**: the ingress waits for the channel, the channel waits for the subscriber, the subscriber's reply goes back to the ingress and waits again (K2.L2). The producer's request hung for minutes; the ingress and channel logged cascades of \`failed to forward reply … context canceled\` and 500s; and the function ran hundreds of times for one order.`,
    },
    {
      type: 'diagram',
      caption: 'fig 1 — chain vs loop',
      height: 70,
      nodes: [
        { id: 'broker', x: 36, y: 28, w: 28, h: 14, label: 'broker', sub: 'ttl − 1 per trip' },
        { id: 'fn', x: 72, y: 6, w: 26, h: 12, label: 'pricing fn', sub: 'created → priced' },
        { id: 'disp', x: 72, y: 50, w: 26, h: 12, label: 'display', sub: 'consumes priced' },
        { id: 'prod', x: 2, y: 28, w: 26, h: 14, label: 'producer', sub: 'order.created' },
      ],
      edges: [
        { from: 'prod', to: 'broker' },
        { from: 'broker', to: 'fn', label: 'created' },
        { from: 'fn', to: 'broker', label: 'reply: priced' },
        { from: 'broker', to: 'disp', label: 'priced' },
      ],
      steps: [
        { caption: 'A producer posts order.created. The ingress stamps knativebrokerttl: 255 on it and hands it to the triggers.', active: ['prod', 'broker'], edges: ['prod->broker'] },
        { caption: 'The pricing trigger matches and delivers to the function, which replies with order.priced. The reply goes back into the broker as a new event, TTL decremented.', active: ['broker', 'fn'], edges: ['broker->fn', 'fn->broker'] },
        { caption: 'A trigger on order.priced sends it to the display. The chain ends because nothing consumes priced and replies — each step\'s output type differs from its input type.', active: ['broker', 'disp'], edges: ['broker->disp'] },
        { caption: 'Point a priced trigger at the pricing function and the reply matches its own trigger: priced → fn → priced → fn… Only the TTL reaching zero, 255 hops later, breaks it.', active: ['broker', 'fn'], edges: ['broker->fn', 'fn->broker'] },
      ],
    },
    {
      type: 'prose',
      md: `The rule that prevents it is simple and worth writing into your event naming conventions: **a function's output types must never match the triggers on its own input.** Past-tense types help — \`order.created\` in, \`order.priced\` out, and nothing ever subscribes a pricing function to \`order.priced\`.`,
    },
    {
      type: 'prose',
      md: `## Sequence and Parallel: the same idea, declared

Knative Flows package these patterns as objects, built from channels and subscriptions (K2.L3).

A **Sequence** runs steps in order: each step's reply becomes the next step's input, and the last reply goes to \`spec.reply\`. On the reference cluster a one-step Sequence (the pricing function, reply to the display) created exactly one InMemoryChannel and one Subscription, and its address *was* that channel:`,
    },
    {
      type: 'code',
      filename: 'sequence.yaml',
      lang: 'yaml',
      code: `apiVersion: flows.knative.dev/v1
kind: Sequence
metadata: { name: alice-seq }
spec:
  channelTemplate: { apiVersion: messaging.knative.dev/v1, kind: InMemoryChannel }
  steps:
    - ref: { apiVersion: serving.knative.dev/v1, kind: Service, name: alice-fn }
  reply:
    ref: { apiVersion: serving.knative.dev/v1, kind: Service, name: alice-display }
# status.address.url → http://alice-seq-kn-sequence-0-kn-channel.default.svc.cluster.local`,
    },
    {
      type: 'prose',
      md: `A **Parallel** fans one event out to several **branches**, each with an optional filter (a service that returns the event to pass it, or nothing to drop it) and a subscriber; the branch replies go on to their own reply targets.

Use them when the shape is fixed and owned by one team. Prefer broker + triggers when the consumers are independent and change often — a Sequence hard-wires order; a broker lets anyone join.`,
    },
    {
      type: 'vendor',
      snapshot: '2026-09',
      title: 'Replies, TTL and flows on Knative Eventing v1.23',
      systems: ['knative'],
      sources: ['https://knative.dev/docs/eventing/flows/sequence/', 'https://knative.dev/docs/eventing/flows/parallel/'],
      md: `Observed on the reference cluster (MTChannelBasedBroker, InMemoryChannel): trigger subscriber replies are posted back into the broker; \`knativebrokerttl\` starts at 255 and the loop above terminated after 255 hops; reply forwarding through the in-memory channel is nested, so the original producer waited while the loop ran. A Sequence with one step created one \`<name>-kn-sequence-0\` InMemoryChannel and one Subscription. Kafka-backed brokers deliver replies through their own dispatcher and will not hold the producer the same way — re-test before assuming either behaviour.`,
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'An enrichment function consumes order.updated and emits order.updated with extra fields. After deploying it behind a trigger on type=order.updated, CPU spikes and producers time out. Why?',
          options: [
            'The function is too slow',
            'Its reply matches its own trigger, so every event loops back until the broker TTL (255 hops) expires — and on the in-memory broker the producer waits for the nested chain',
            'The broker is out of memory',
            'Triggers cannot deliver the same type twice',
          ],
          correct: [1],
          explanation: 'Same type in and out, behind a trigger on that type, is a reply loop. Emit a distinct type (order.enriched) or do not reply to the broker. Scaling the function up only makes the loop run faster.',
        },
        {
          q: 'Three teams each want to react to invoice.paid in their own way, and more teams will join. Sequence, Parallel, or broker + triggers?',
          options: [
            'A Sequence — run the teams one after another',
            'A Parallel owned by the first team',
            'A broker with one trigger per team, so teams join and leave without editing a shared object',
            'Have the producer call each team\'s service directly',
          ],
          correct: [2],
          explanation: 'Independent, changing consumers are exactly what brokers are for. Parallel and Sequence are single objects someone has to own and edit whenever a team joins; direct calls couple the producer to every consumer.',
        },
        {
          q: 'Why should a function that emits events set datacontenttype explicitly?',
          options: [
            'CloudEvents without it are invalid',
            'Otherwise the SDK may label a JSON body as text/plain (observed), and every consumer has to guess how to parse it',
            'Brokers reject events without it',
            'It controls the retry policy',
          ],
          correct: [1],
          explanation: 'datacontenttype is optional in the spec, which is exactly why it gets forgotten. The pricing reply was labelled text/plain; charset=utf-8 until the attribute was set.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'Going deeper',
      md: `- Knative "Sequence" and "Parallel" (knative.dev/docs/eventing/flows/) — the full specs, including Parallel branch filters.
- \`kubectl get sequence alice-seq -o yaml\` after creating one: read \`status.channelStatuses\` and \`status.subscriptionStatuses\` to see the plumbing it built.
- Event naming conventions: the CloudEvents primer's guidance on \`type\` — reverse-DNS, past tense, one meaning per type.`,
    },
  ],
}

export default lesson
