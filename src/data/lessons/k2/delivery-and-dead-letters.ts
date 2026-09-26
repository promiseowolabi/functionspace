import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'k2.l4',
  slug: 'delivery-and-dead-letters',
  trackId: 'k2',
  index: 4,
  title: 'Delivery and Dead Letters',
  minutes: 18,
  hook: 'With the defaults on the reference cluster, a failing subscriber is retried 10 times over about 205 seconds — and then the event is simply dropped, because nobody configured a dead-letter sink.',
  exercise: 'lab+quiz',
  takeaway: {
    number: '10 retries ≈ 205 s',
    claim: 'The default broker delivery policy retries 10 times with exponential backoff from 0.2 s — 0.2 × (2¹⁰ − 1) ≈ 205 s of retrying — and without a dead-letter sink the event is then gone; a 400 is not retried at all, while 404, 429 and 5xx are.',
  },
  blocks: [
    {
      type: 'prose',
      md: `Asynchronous delivery moves failure somewhere you are not looking. The producer got its 202 and left. The subscriber is down, or throwing, or returning garbage. What happens next is governed entirely by a **delivery spec** — on the trigger, the subscription, or the broker's defaults — with four knobs:

| field | meaning |
|---|---|
| \`retry\` | how many times to retry after the first failure |
| \`backoffPolicy\` | \`linear\` (the delay grows by a fixed step) or \`exponential\` (it doubles) |
| \`backoffDelay\` | the base delay, ISO-8601 (\`PT1S\` = 1 s, \`PT0.2S\` = 200 ms) |
| \`deadLetterSink\` | where the event goes when retries run out |`,
    },
    {
      type: 'statline',
      stats: [
        { value: '10', label: 'default retries', hint: 'config-br-defaults on the reference cluster' },
        { value: '0.2 s', label: 'default base delay', hint: 'exponential backoff: 0.2, 0.4, 0.8 … 102.4 s' },
        { value: '≈ 205 s', label: 'retrying before giving up', hint: '0.2 × (1 + 2 + … + 512) = 0.2 × 1023 = 204.6 s' },
        { value: '1 vs 3', label: 'attempts: 400 vs 404/429', hint: 'measured with retry: 2 — a 400 was not retried' },
      ],
    },
    {
      type: 'prose',
      md: `## The arithmetic of a retry policy

With exponential backoff the n-th retry waits \`backoffDelay × 2^(n−1)\`. Lab 04 used \`retry: 2, backoffDelay: PT1S\`, and the flaky subscriber logged attempts at **:06, :07, :09** — gaps of 1 s and 2 s. The total time from first failure to dead letter is a geometric series:

\`\`\`
total ≈ backoffDelay × (2^retry − 1)

lab 04        1 s × (2² − 1)  =   3 s
retry: 5      1 s × (2⁵ − 1)  =  31 s
defaults    0.2 s × (2¹⁰ − 1) = 204.6 s
\`\`\`

Do this sum for every trigger that matters. It is the worst-case delay before anyone can know an event failed, and it is how long a subscriber outage can last before events start landing in the DLS instead of being retried.`,
    },
    {
      type: 'code',
      filename: 'the broker-wide default on the reference cluster',
      lang: 'bash',
      code: `kubectl get cm config-br-defaults -n knative-eventing -o jsonpath='{.data.default-br-config}'
# clusterDefault:
#   brokerClass: MTChannelBasedBroker
#   delivery:
#     retry: 10
#     backoffPolicy: exponential
#     backoffDelay: PT0.2S`,
    },
    {
      type: 'prose',
      md: `Notice what is missing: **no \`deadLetterSink\`**. On a broker created with defaults, an event whose subscriber keeps failing is retried for three and a half minutes and then discarded. The delivery layer logs it; nothing tells your team.`,
    },
    {
      type: 'prose',
      md: `## What gets retried

Not every failure is worth retrying — a malformed event will be malformed on attempt ten too. Tested on the reference cluster with \`retry: 2\`, against subscribers that always return one status:

| subscriber returns | attempts observed |
|---|---|
| 503 | 3 (lab 04) |
| 429 Too Many Requests | 3 |
| 404 Not Found | 3 |
| 400 Bad Request | **1** — not retried |

So 5xx, 429 and 404 are treated as possibly-transient; 400 is treated as permanent. Useful consequence: **your handler chooses** whether an event is retried. Return a 5xx for "try again later" (a database is down) and a 400 for "this event will never work" (it fails validation). The 400 goes to the dead-letter sink — if you configured one — without burning retries; on the reference cluster it arrived there on the first failure with \`knativeerrorcode: 400\`.`,
    },
    {
      type: 'diagram',
      caption: 'fig 1 — the life of a failing event',
      height: 64,
      nodes: [
        { id: 'ev', x: 2, y: 24, w: 14, h: 12, label: 'event', sub: 'matched' },
        { id: 'try', x: 22, y: 24, w: 16, h: 12, label: 'attempt', sub: 'POST subscriber' },
        { id: 'code', x: 44, y: 24, w: 16, h: 12, label: 'response', sub: '2xx / 4xx / 5xx' },
        { id: 'wait', x: 44, y: 50, w: 16, h: 10, label: 'backoff', sub: '×2 each time' },
        { id: 'ok', x: 66, y: 4, w: 14, h: 12, label: 'done', sub: '2xx' },
        { id: 'dls', x: 84, y: 24, w: 14, h: 12, label: 'DLS', sub: '+ knativeerror*' },
        { id: 'drop', x: 84, y: 48, w: 14, h: 12, label: 'dropped', sub: 'no DLS set' },
      ],
      edges: [
        { from: 'ev', to: 'try' },
        { from: 'try', to: 'code' },
        { from: 'code', to: 'ok', label: '2xx' },
        { from: 'code', to: 'wait', label: '5xx/429/404' },
        { from: 'wait', to: 'try', label: 'retry' },
        { from: 'code', to: 'dls', label: 'give up' },
        { from: 'code', to: 'drop' },
      ],
      steps: [
        { caption: 'An event matches a trigger and is POSTed to the subscriber. A 2xx ends the story — including 2xx responses that carry a reply event.', active: ['ev', 'try', 'code', 'ok'], edges: ['ev->try', 'try->code', 'code->ok'] },
        { caption: 'A 5xx, 429 or 404 is treated as transient: wait the backoff delay, doubling each time for exponential, then try again, up to retry times.', active: ['code', 'wait', 'try'], edges: ['code->wait', 'wait->try'] },
        { caption: 'When retries run out — or immediately, for a non-retryable 400 — the event goes to the dead-letter sink with knativeerrorcode, knativeerrordest and knativeerrordata added.', active: ['code', 'dls'], edges: ['code->dls'] },
        { caption: 'If no dead-letter sink is configured, the event is discarded. The producer already got 202 long ago; nothing downstream will ever know.', active: ['code', 'drop'], edges: ['code->drop'] },
      ],
    },
    {
      type: 'prose',
      md: `## Reading a dead letter

The event that reaches the DLS is the **original** event — same \`id\`, same data — plus extensions describing the last failure. From lab 04:

\`\`\`
knativeerrorcode: 503
knativeerrordest: http://alice-flaky.default.svc.cluster.local
knativeerrordata: bm9wZQo=          # base64("nope\\n") — the subscriber's response body
\`\`\`

Because the id is unchanged, a DLS consumer can **replay** the event into the broker once the subscriber is fixed, and an idempotent subscriber (X1.L3) will handle it correctly even if an earlier attempt partly succeeded.`,
    },
    {
      type: 'vendor',
      snapshot: '2026-09',
      title: 'Delivery defaults and retry behaviour, Knative Eventing v1.23',
      systems: ['knative'],
      sources: ['https://knative.dev/docs/eventing/event-delivery/'],
      md: `\`config-br-defaults\` on the reference cluster: \`retry: 10\`, \`backoffPolicy: exponential\`, \`backoffDelay: PT0.2S\`, no \`deadLetterSink\`. The attempt counts per status code were measured on the reference cluster (MTChannelBasedBroker over InMemoryChannel) with \`retry: 2\`; check the event-delivery docs for the authoritative list of retryable responses on your version, and re-test if you run a different broker class — Kafka-backed brokers implement delivery in their own dispatcher.`,
    },
    {
      type: 'lab',
      lab: 'broker-trigger',
      brief: 'The failing trigger in lab 04 has retry 2 with exponential backoff from 1 s. Check the attempt timestamps against backoffDelay × 2^(n−1), and decode knativeerrordata from the dead letter.',
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'A trigger has retry: 6, exponential, backoffDelay PT0.5S and a DLS. The subscriber is down. Roughly how long after the first attempt does the event reach the DLS?',
          options: ['3 s', '0.5 × (2⁶ − 1) ≈ 31.5 s', '6 minutes', 'Immediately'],
          correct: [1],
          explanation: 'Delays 0.5, 1, 2, 4, 8, 16 s sum to 31.5 s. Being able to state this number is what lets you set alert thresholds and explain to a product owner how long "it retries" actually means.',
        },
        {
          q: 'A handler receives an event that fails schema validation. What should it return, and why?',
          options: [
            '500, so the platform retries it',
            '400, so it is treated as permanent: not retried, sent to the DLS for a human to look at',
            '200, and log the error',
            '429, to slow the producer down',
          ],
          correct: [1],
          explanation: 'Retrying a malformed event wastes the whole retry budget and delays the dead letter. 400 skips the retries (observed: 1 attempt). Returning 200 hides the failure entirely — the folklore fix that turns bugs into silent data loss.',
        },
        {
          q: 'A platform team runs brokers on defaults. An auditor asks what happens to an event whose only subscriber is broken for an hour. What is the accurate answer?',
          options: [
            'It is queued until the subscriber recovers',
            'It is retried 10 times over about 205 s and then discarded, because the default policy has no dead-letter sink',
            'It is sent back to the producer',
            'It goes to a cluster-wide dead-letter topic',
          ],
          correct: [1],
          explanation: 'Defaults retry for roughly three and a half minutes and then drop. For an hour-long outage every event in that hour is lost. The fix is a DLS on every trigger that matters (or a broker-level default), plus a replay procedure.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'Going deeper',
      md: `- Knative "Handling delivery failure" (knative.dev/docs/eventing/event-delivery/) — delivery spec fields, where they can be set, and the retryable status codes.
- Set a broker-level default: \`spec.delivery\` on the Broker applies to every trigger that does not set its own.
- Per-attempt timeouts and \`Retry-After\` handling are feature-flagged in \`config-features\`: on the reference cluster \`delivery-timeout\` was **enabled** (so \`delivery.timeout\` works) and \`delivery-retryafter\` was **disabled**. Check yours before relying on either.`,
    },
  ],
}

export default lesson
