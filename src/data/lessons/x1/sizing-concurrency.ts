import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'x1.l2',
  slug: 'sizing-concurrency',
  trackId: 'x1',
  index: 2,
  title: 'Sizing Concurrency',
  minutes: 16,
  hook: 'Lab 02 predicted 481 requests per second from two numbers before fortio measured 480.85. The same one-line law sizes a DataEngine pipeline\'s max_concurrency, a Knative target, and the bill.',
  exercise: 'read+quiz',
  takeaway: {
    number: '481 vs 480.85 req/s',
    claim: 'Concurrency in flight equals arrival rate times time in the system — 50 in flight at 0.104 s gave 481/s predicted and 480.85/s measured — so the copies you need are ⌈λ × W ÷ per-copy concurrency⌉, sized on the burst rate and the slow percentile, not the averages.',
  },
  blocks: [
    {
      type: 'prose',
      md: `Every scaling knob in this course — Knative's \`target\` and \`max-scale\`, DataEngine's \`max_concurrency\` — is a statement about how many events are being handled *at the same time*. Little's law connects that number to the two numbers you can actually measure:

\`\`\`
L = λ × W

L  average number in the system (in flight)
λ  average arrival rate (events per second)
W  average time each spends in the system (seconds)
\`\`\`

It holds for any stable system, whatever the distribution of arrivals or service times. That generality is why it is the only formula in this lesson.`,
    },
    {
      type: 'statline',
      stats: [
        { value: '481 /s', label: 'predicted', hint: '50 in flight ÷ 0.104 s per request (lab 02)' },
        { value: '480.85 /s', label: 'measured', hint: 'fortio, 50 connections, 30 s, autoscale-go sleeping 100 ms' },
        { value: '192 /s', label: 'predicted and measured at 20', hint: '20 ÷ 0.104 = 192; fortio reported 192.1' },
        { value: '8 pods', label: '⌈50 ÷ 7⌉', hint: 'per-pod concurrency 10 × 0.7' },
      ],
    },
    {
      type: 'prose',
      md: `## From the law to a pod count

Two steps:

1. **Concurrency needed** \`L = λ × W\`.
2. **Copies needed** \`N = ⌈L ÷ c⌉\`, where \`c\` is how many events one copy handles at once — the Knative per-pod budget (\`target × 0.7\`, K1.L3), or 1 for a DataEngine function that processes one event at a time.

Lab 02 checked both: 50 in flight (L), 0.104 s each (W) → λ = 481/s; 50 ÷ 7 → 8 pods. The autoscaler did this arithmetic for you. Now do it before deploying.`,
    },
    {
      type: 'prose',
      md: `## A DataEngine example

An ingest bucket receives **15 uploads per second** at the busy hour. The element-trigger handler takes **0.8 s** on median objects and **3 s** at p99. Each copy handles one event at a time.

| question | arithmetic | answer |
|---|---|---|
| average concurrency | 15 × 0.8 | **12** in flight |
| copies to keep up on average | ⌈12 ÷ 1⌉ | **12** |
| copies if every event were p99 | 15 × 3 | **45** |
| capacity with max_concurrency 12 | 12 ÷ 0.8 s | **15 events/s** |
| backlog after a 5-minute burst at 30/s | (30 − 15) × 300 s | **4,500 events** |
| time to drain it once arrivals fall back to 15/s | 4,500 ÷ (15 − 15) | **never**, until the busy hour ends |

The last three rows are the ones that matter. A system sized for the average **cannot absorb a burst**: with \`max_concurrency: 12\` and a burst to 30/s, the backlog grows by 15 events every second, and there is no spare capacity left to drain it afterwards. Size \`max_concurrency\` on the burst rate and a slow percentile, then check the cost of that ceiling with the cold-start and resource numbers from F0.L3 and K1.L6.`,
    },
    {
      type: 'diagram',
      caption: 'fig 1 — the sizing chain',
      height: 62,
      nodes: [
        { id: 'lam', x: 2, y: 22, w: 16, h: 14, label: 'λ', sub: 'events / s (burst)' },
        { id: 'w', x: 22, y: 22, w: 16, h: 14, label: 'W', sub: 's per event (p95)' },
        { id: 'l', x: 44, y: 22, w: 16, h: 14, label: 'L = λ × W', sub: 'in flight' },
        { id: 'c', x: 44, y: 46, w: 16, h: 12, label: 'c', sub: 'per copy' },
        { id: 'n', x: 66, y: 22, w: 14, h: 14, label: '⌈L ÷ c⌉', sub: 'copies' },
        { id: 'knob', x: 84, y: 22, w: 14, h: 14, label: 'knob', sub: 'max-scale / max_concurrency' },
      ],
      edges: [
        { from: 'lam', to: 'l' },
        { from: 'w', to: 'l' },
        { from: 'l', to: 'n' },
        { from: 'c', to: 'n' },
        { from: 'n', to: 'knob' },
      ],
      steps: [
        { caption: 'Start from the arrival rate you must survive — the burst, not the daily average. For uploads, count objects per second at the busiest minute.', active: ['lam'] },
        { caption: 'Multiply by time in the system per event. Use a slow percentile: the handler that takes 3 s on big objects dominates the in-flight count.', active: ['lam', 'w', 'l'], edges: ['lam->l', 'w->l'] },
        { caption: 'Divide by how many events one copy handles concurrently — 1 for a synchronous handler, the per-pod budget for a Knative service with a target.', active: ['l', 'c', 'n'], edges: ['l->n', 'c->n'] },
        { caption: 'That is the ceiling your scaling knob must allow. Set it lower and the backlog grows by λ − capacity every second; set it much higher and a bug can spend it.', active: ['n', 'knob'], edges: ['n->knob'] },
      ],
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'W includes waiting',
      md: `W is time *in the system*, not time in your code. When copies are saturated, events queue, W grows, and L grows with it — the autoscaler sees higher concurrency and adds copies, which is correct. But a cold start is also time in the system: during scale-up, the first events on each new copy carry the cold-start seconds (F0.L3) in their W.`,
    },
    {
      type: 'callout',
      variant: 'isomorphism',
      title: 'Throughput is concurrency divided by latency',
      md: `Rearranged: **λ = L ÷ W**. With max_concurrency fixed, the only way to raise throughput is to make each event faster. With latency fixed, the only way is more concurrency. Every "we need more throughput" conversation is choosing one of those two, whether or not anyone says so.`,
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'A DataEngine pipeline has max_concurrency 10. Events arrive at 8/s and the handler takes 2 s. What happens?',
          options: [
            'It keeps up — 8 is less than 10',
            'It falls behind: L = 8 × 2 = 16 in flight is needed but only 10 are allowed, so the backlog grows by 3 events every second (capacity = 10 ÷ 2 = 5/s)',
            'It keeps up because of retries',
            'Events are dropped immediately',
          ],
          correct: [1],
          explanation: 'The comparison is concurrency needed (λ × W) against concurrency allowed, not λ against the knob. Capacity is L_max ÷ W = 5 events/s; arrivals are 8/s.',
        },
        {
          q: 'A finance partner asks why raising max_concurrency from 10 to 40 did not quadruple the bill. What is the best explanation?',
          options: [
            'Billing is broken',
            'max_concurrency is a ceiling, not a reservation; copies run in proportion to actual λ × W, so cost follows the workload until the ceiling binds',
            'Only 10 copies can ever run',
            'The extra copies are free',
          ],
          correct: [1],
          explanation: 'With scale-to-zero-style platforms the ceiling caps risk and burst capacity; the steady-state cost is set by arrivals and service time. The floor (min) is what you pay regardless.',
        },
        {
          q: 'Handler median latency is 200 ms, p99 is 4 s, arrival rate 50/s. Which W should you use to set the ceiling, and why?',
          options: [
            'Median — it is the typical case',
            'A slow percentile (e.g. p95–p99), because slow events hold copies longest and dominate how many are in flight during the busy period',
            'The minimum latency',
            'W does not matter for ceilings',
          ],
          correct: [1],
          explanation: '50 × 0.2 = 10 in flight on medians, but a stretch of slow objects pushes it toward 50 × 4 = 200. Sizing on the median guarantees a backlog exactly when the expensive objects arrive.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'Going deeper',
      md: `- J. D. C. Little, "A Proof for the Queuing Formula: L = λW", Operations Research 9(3), 1961 — the original, and short.
- Lab 02's \`measure.sh\` output: rerun with other \`sleep\` values and check L = λ × W each time.
- The capstone asks you to measure λ and W for the same function on both platforms and size both ceilings from them.`,
    },
  ],
}

export default lesson
