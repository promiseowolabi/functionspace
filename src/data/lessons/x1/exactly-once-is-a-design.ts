import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'x1.l3',
  slug: 'exactly-once-is-a-design',
  trackId: 'x1',
  index: 3,
  title: 'Exactly-Once Is a Design',
  minutes: 15,
  hook: 'Knative redelivered a failing event 3 times; DataEngine redelivered one 4 times. Neither platform promised otherwise. "Exactly once" is not a setting you find — it is a property you build into the handler, and it costs one stable key.',
  exercise: 'read+quiz',
  takeaway: {
    number: '3 and 4 deliveries',
    claim: 'Both platforms deliver at least once — measured, 3 attempts on Knative (retry: 2) and 4 on DataEngine (retries: 3), same event id each time — so exactly-once effects come from idempotent handlers keyed on source + id or on the object, never from the transport.',
  },
  blocks: [
    {
      type: 'prose',
      md: `You have now watched the same thing happen twice:

- **Knative, lab 04**: a subscriber returning 503 received the event **3 times** (\`retry: 2\`), 1 s then 2 s apart, before it was dead-lettered with its original id.
- **DataEngine, D2.L5**: a handler raising an exception ran **4 times** (\`retries: 3\`), 2, 4 and 8 s apart, with the same event id.

That is **at-least-once delivery**, and it is what every practical event system gives you. The alternative — at-most-once — loses events whenever something fails at the wrong moment. There is no third transport setting that gives you "exactly once" end to end, because the transport cannot know whether your handler's database write happened before the pod died.`,
    },
    {
      type: 'diagram',
      caption: 'fig 1 — where duplicates come from',
      height: 64,
      nodes: [
        { id: 'broker', x: 2, y: 24, w: 18, h: 14, label: 'broker', sub: 'delivers' },
        { id: 'h', x: 28, y: 24, w: 18, h: 14, label: 'handler', sub: 'does work' },
        { id: 'db', x: 56, y: 6, w: 18, h: 12, label: 'side effect', sub: 'committed' },
        { id: 'ack', x: 56, y: 44, w: 18, h: 12, label: 'response', sub: 'lost / 500 / timeout' },
        { id: 'retry', x: 82, y: 24, w: 16, h: 14, label: 'redelivery', sub: 'same id' },
      ],
      edges: [
        { from: 'broker', to: 'h' },
        { from: 'h', to: 'db', label: '1. write' },
        { from: 'h', to: 'ack', label: '2. reply' },
        { from: 'ack', to: 'retry', label: 'not 2xx' },
        { from: 'retry', to: 'broker' },
      ],
      steps: [
        { caption: 'The broker delivers an event and the handler starts work.', active: ['broker', 'h'], edges: ['broker->h'] },
        { caption: 'The handler commits a side effect — a row, an object, a charge. That is now true in the world.', active: ['h', 'db'], edges: ['h->db'] },
        { caption: 'Then something fails before a 2xx reaches the broker: a later step raises, the pod is replaced, the timeout fires.', active: ['h', 'ack'], edges: ['h->ack'] },
        { caption: 'From the broker\'s side the event was not handled, so it is delivered again with the same id. The side effect happens twice — unless the handler recognises the repeat.', active: ['ack', 'retry', 'broker'], edges: ['ack->retry', 'retry->broker'] },
      ],
    },
    {
      type: 'prose',
      md: `## What the platforms give you to work with

| | Knative | DataEngine |
|---|---|---|
| delivery | at least once, per trigger | at least once, per link |
| retry policy | \`delivery.retry\`, \`backoffPolicy\`, \`backoffDelay\` (K2.L4) | link \`retries\`; observed exponential from 2 s (D2.L5) |
| permanent failure | 400 → no retry → dead-letter sink | exception → retried; dead-letter topic after the last attempt |
| stable identity | \`source\` + \`id\`, kept across retries and dead-lettering | same event \`id\` on every attempt; output events reuse the input id |
| object identity | whatever the producer puts in the event | \`elementpath\` = \`bucket/key\` (also the partition key) |

Everything in the last two rows is a key you can deduplicate on. That is the whole design.`,
    },
    {
      type: 'prose',
      md: `## Three idempotency patterns

**1. Deterministic outputs.** Derive every output from the input's identity and write it with overwrite semantics: \`processed/<key>.json\`. A repeat writes the same bytes to the same place. Cheapest, and right for most object pipelines.

**2. Conditional writes.** Insert with a unique constraint on the idempotency key and treat a conflict as success (\`INSERT … ON CONFLICT DO NOTHING\`), or use a conditional put where the store supports it. Right when the side effect is a row or a counter.

**3. A processed-set.** Record the key when work completes and check it first. Needed when the side effect is external and not itself idempotent — an email, a charge. The check-and-record must be atomic with the work, or you have moved the window, not closed it.

Choose the **key** before the pattern: \`source + id\` identifies a *delivery* and is right for "handle this event once"; \`bucket/key/version\` identifies the *thing* and is right for "process this object once" even if two events arrive about it.`,
    },
    {
      type: 'callout',
      variant: 'segfault',
      title: 'A key that changes on every attempt is not a key',
      md: `A UUID generated inside the handler, \`time.time()\`, the pod name, a random suffix — all differ per attempt, so every retry looks new. The key must come from the event.`,
    },
    {
      type: 'isomorphism',
      title: 'you already know this from HTTP APIs',
      pairs: [
        { os: 'Idempotency-Key header', osLine: 'Payment APIs let clients retry a POST safely by sending the same key.', llm: 'source + id / elementpath', llmLine: 'Event handlers retry safely by deduplicating on the event\'s own stable identity.' },
        { os: 'PUT vs POST', osLine: 'PUT to a known URL is repeatable; POST to a collection is not.', llm: 'deterministic output path', llmLine: 'Writing to a path derived from the input is repeatable; appending is not.' },
      ],
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'A vendor offers "exactly-once delivery" for its event broker. What should you still build into your handler, and why?',
          options: [
            'Nothing — exactly-once delivery means exactly-once effects',
            'Idempotency: the broker can at best guarantee delivery semantics inside itself; if your handler commits a side effect and then fails before acknowledging, the event is redelivered and the effect repeats',
            'A longer timeout',
            'More retries',
          ],
          correct: [1],
          explanation: 'End-to-end effects include your database and your crash points, which no broker controls. Measured on both platforms: redelivery with the same id after a failed attempt.',
        },
        {
          q: 'Two uploads of the same key arrive in quick succession (the object was overwritten). Your handler dedupes on source + event id. What happens?',
          options: [
            'The second upload is ignored',
            'Both are processed — they are different events with different ids. If "process each object version once" is the goal, key on bucket/key plus version or ETag instead',
            'The platform merges them',
            'The first is cancelled',
          ],
          correct: [1],
          explanation: 'source + id deduplicates deliveries of one event, not multiple events about one thing. Choose the key that matches the business rule.',
        },
        {
          q: 'A handler sends a notification email per uploaded invoice. Retries occasionally send duplicates. Which fix is correct?',
          options: [
            'Set retries to 0',
            'Record the invoice key in a processed-set atomically with sending, and check it before sending',
            'Catch all exceptions and return success',
            'Increase max_concurrency',
          ],
          correct: [1],
          explanation: 'Email is not idempotent, so pattern 3 applies. Retries 0 trades duplicates for lost notifications; swallowing exceptions hides failures.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'Going deeper',
      md: `- K2.L4 and D2.L5 — the retry arithmetic on each platform.
- The CloudEvents spec on \`id\` uniqueness and redelivery (F0.L2).
- Pat Helland, "Idempotence Is Not a Medical Condition" (ACM Queue, 2012) — the classic treatment.`,
    },
  ],
}

export default lesson
