import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'k1.l3',
  slug: 'the-autoscaler',
  trackId: 'k1',
  index: 3,
  title: 'The Autoscaler',
  minutes: 20,
  hook: 'You asked for 10 requests per pod and got pods sized for 7. Fifty requests in flight became exactly 8 pods in under ten seconds. Every one of those numbers is arithmetic you can do before you deploy.',
  exercise: 'lab+quiz',
  takeaway: {
    number: '⌈50 ÷ 7⌉ = 8',
    claim: 'The KPA sizes each pod at target × 70%, so desired pods = ⌈concurrency ÷ (target × 0.7)⌉ — measured 8 pods for 50 in flight and 3 for 20 — and it reacts on a 6-second panic window, not the 60-second stable one, when load doubles.',
  },
  blocks: [
    {
      type: 'prose',
      md: `Knative's default autoscaler — the **KPA**, Knative Pod Autoscaler — scales on **requests in flight**, not CPU. That single choice is why it can scale from zero (there is no CPU to measure on zero pods, but there are requests waiting at the activator) and why it reacts to I/O-bound work that barely moves a CPU graph.

It runs one control loop per revision, every couple of seconds:

\`\`\`
observed   = average concurrency over the window (from queue-proxies + activator)
per_pod    = target × target-utilisation            # 10 × 0.70 = 7
desired    = ceil(observed ÷ per_pod)
desired    = clamp(desired, min-scale, max-scale)   # and rate-limited
\`\`\``,
    },
    {
      type: 'statline',
      stats: [
        { value: '70%', label: 'target utilisation', hint: 'container-concurrency-target-percentage: pods are sized at 70% of the target, leaving burst headroom' },
        { value: '60 s', label: 'stable window', hint: 'normal decisions average concurrency over the last 60 seconds' },
        { value: '6 s', label: 'panic window', hint: '10% of the stable window; used when load exceeds 200% of current capacity' },
        { value: '8 pods', label: 'measured for 50 in flight', hint: 'lab 02 reference run, target 10: ⌈50 ÷ 7⌉ = 8' },
      ],
    },
    {
      type: 'prose',
      md: `## Two windows

A single averaging window cannot be both calm and quick. The KPA keeps two:

- **Stable window — 60 s.** Normal operation. Decisions are made on the average concurrency over the last minute, which smooths out noise and stops the pod count from twitching.
- **Panic window — 6 s** (10% of stable). If the concurrency over the last 6 seconds is more than **200%** of what the current pods can handle, the autoscaler enters **panic mode**: it scales on the short window instead, it **does not scale down** while panicking, and it stays in panic for at least one stable window after entering it.

In lab 02 the service went from 1 pod to 8 in under ten seconds. The stable window could not have done that — the minute-long average was still low. That was panic mode.`,
    },
    {
      type: 'code',
      filename: 'lab 02 reference run (target 10, max-scale 10, fortio -c 50 for 30 s)',
      lang: 'text',
      code: `t(s)  pods
   1  1
   4  2
   7  5
   8  7
  10  8      ← ⌈50 ÷ 7⌉ = 8, reached inside the 6 s panic logic
  …   8
  33  8
fortio: 14459 calls, qps=480.85, p50 110 ms, p99 120 ms, 100% 200
load finished after 34s; peak pods: 8.
reached zero 89s after the last request.`,
    },
    {
      type: 'code',
      filename: 'the autoscaler said so itself (kubectl logs -n knative-serving deploy/autoscaler | grep -i panic)',
      lang: 'text',
      code: `11:35:41  scaling/autoscaler.go:224  "PANICKING."     default/alice-sleepy-00001
11:36:45  scaling/autoscaler.go:232  "Un-panicking."  default/alice-sleepy-00001`,
    },
    {
      type: 'prose',
      md: `Panic lasted **64 seconds** — just over one stable window from the moment it began — even though the load itself ran for only 30. For that whole minute the autoscaler refused to scale down, which is exactly what you want when the next burst might be seconds away.`,
    },
    {
      type: 'diagram',
      caption: 'fig 1 — one pass of the KPA loop',
      height: 66,
      nodes: [
        { id: 'qp', x: 2, y: 6, w: 18, h: 12, label: 'queue-proxies', sub: 'in-flight counts' },
        { id: 'act', x: 2, y: 34, w: 18, h: 12, label: 'activator', sub: 'held requests' },
        { id: 'win', x: 28, y: 20, w: 20, h: 12, label: 'windows', sub: '60 s and 6 s' },
        { id: 'calc', x: 54, y: 20, w: 20, h: 12, label: '⌈c ÷ (t × 0.7)⌉', sub: 'desired pods' },
        { id: 'clamp', x: 80, y: 6, w: 18, h: 12, label: 'clamp', sub: 'min / max / rate' },
        { id: 'dep', x: 80, y: 34, w: 18, h: 12, label: 'Deployment', sub: 'replicas' },
      ],
      edges: [
        { from: 'qp', to: 'win' },
        { from: 'act', to: 'win' },
        { from: 'win', to: 'calc', label: 'observed c' },
        { from: 'calc', to: 'clamp' },
        { from: 'clamp', to: 'dep', label: 'set N' },
      ],
      steps: [
        { caption: 'Every pod\'s queue-proxy reports how many requests it has in flight; the activator reports requests it is holding for pods that do not exist yet.', active: ['qp', 'act'] },
        { caption: 'The autoscaler averages that concurrency over two windows: the last 60 seconds and the last 6. Which one it acts on depends on whether it is panicking.', active: ['qp', 'act', 'win'], edges: ['qp->win', 'act->win'] },
        { caption: 'It divides by the per-pod budget — target times 70% — and rounds up. Fifty in flight at target 10 is 50 ÷ 7 = 7.14, so 8 pods.', active: ['win', 'calc'], edges: ['win->calc'] },
        { caption: 'It clamps to min-scale and max-scale and to rate limits: at most 1000× up per step and 2× down per step by default.', active: ['calc', 'clamp'], edges: ['calc->clamp'] },
        { caption: 'Finally it writes the replica count onto the revision\'s Deployment. Kubernetes does the rest: schedule, pull, start — the cold-start terms of F0.L3.', active: ['clamp', 'dep'], edges: ['clamp->dep'] },
      ],
    },
    {
      type: 'prose',
      md: `## Target versus containerConcurrency

Two settings sound alike and are completely different:

| | \`autoscaling.knative.dev/target\` | \`containerConcurrency\` |
|---|---|---|
| kind | **soft** — a goal for the autoscaler | **hard** — a limit enforced by queue-proxy |
| effect | how many pods the KPA asks for | how many requests one pod may process at once; extras queue |
| default | 100 (\`container-concurrency-target-default\`) | 0 = unlimited |
| set it when | you know roughly what one pod handles | your code genuinely cannot handle more than N at once |

If you set \`containerConcurrency\` and not \`target\`, the KPA uses the hard limit as its target too. A Python handler that is not async and holds the GIL is the classic case for \`containerConcurrency: 1\`; a Go HTTP server usually wants neither and a sensible \`target\`.`,
    },
    {
      type: 'prose',
      md: `## KPA or HPA

Knative can also delegate to the Kubernetes **HPA**, scaling on CPU or memory (\`autoscaling.knative.dev/class: hpa.autoscaling.knative.dev\`). The trade is simple: HPA gives you CPU-based scaling that platform teams already understand, and **cannot scale to zero** — there is no CPU signal from zero pods. Choose HPA for CPU-bound work with steady traffic; KPA for request-driven work, bursty traffic, or anything that should idle at zero.`,
    },
    {
      type: 'vendor',
      snapshot: '2026-09',
      title: 'KPA defaults on Knative v1.23',
      systems: ['knative'],
      sources: [
        'https://knative.dev/docs/serving/autoscaling/kpa-specific/',
        'https://knative.dev/docs/serving/autoscaling/autoscaling-targets/',
        'https://knative.dev/docs/serving/autoscaling/autoscaler-types/',
      ],
      md: `From the \`config-autoscaler\` ConfigMap on the reference cluster: \`container-concurrency-target-default: 100\`, \`container-concurrency-target-percentage: 70\`, \`stable-window: 60s\`, \`panic-window-percentage: 10.0\`, \`panic-threshold-percentage: 200.0\`, \`max-scale-up-rate: 1000.0\`, \`max-scale-down-rate: 2.0\`, \`requests-per-second-target-default: 200\` (used with \`autoscaling.knative.dev/metric: rps\`). Per-revision annotations override all of these. The 8-pod and 3-pod peaks, and ~481/192 qps, were measured in lab 02 with \`autoscale-go\` sleeping 100 ms.`,
    },
    {
      type: 'callout',
      variant: 'isomorphism',
      title: 'Little\'s law is hiding in the qps number',
      md: `50 requests in flight, each taking ~0.104 s, gives 50 ÷ 0.104 ≈ **481 requests/s** — fortio measured 480.85. At 20 in flight: 20 ÷ 0.104 ≈ 192; measured 192.1. Concurrency = throughput × latency is the one equation that connects what the autoscaler measures to what your users experience. X1.L2 builds a sizing method on it.`,
    },
    {
      type: 'lab',
      lab: 'autoscaling',
      brief: 'Predict the peak pod count from the target and the 70% factor, drive the service with 50 and then 20 connections, and check the autoscaler agrees with you.',
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'A service has target 20 and max-scale 5. Load holds at 100 concurrent requests. How many pods run, and what happens to the excess?',
          options: [
            '5 pods; 100 ÷ (20 × 0.7) ≈ 7.1 would need 8, but max-scale caps it and each pod carries ~20 in flight — above target, so latency rises',
            '8 pods — max-scale is only a hint',
            '5 pods, and requests over 100 are rejected with 503',
            '1 pod, because target is per service not per pod',
          ],
          correct: [0],
          explanation: '⌈100 ÷ 14⌉ = 8 desired, clamped to 5. With no containerConcurrency limit the pods simply take more load than the target; latency grows. If a hard containerConcurrency were set, the excess would queue in queue-proxy/activator instead.',
        },
        {
          q: 'Traffic jumps from 10 to 200 concurrent requests in two seconds. What mostly determines how fast pods appear?',
          options: [
            'The 60-second stable window — nothing happens for a minute',
            'Panic mode: the 6-second window sees more than 200% of capacity and scales on it, then cold-start time per pod',
            'The HPA sync period of 15 seconds',
            'max-scale-down-rate',
          ],
          correct: [1],
          explanation: 'A 20× jump crosses the 200% panic threshold immediately; the KPA acts on the 6 s window. After that, the limiting factor is how fast pods become Ready — schedule, pull, start, init — which is why image size shows up in scale-up behaviour.',
        },
        {
          q: 'Finance asks why a CPU-light, I/O-heavy service runs 12 pods when CPU utilisation is 5%. What is the honest explanation?',
          options: [
            'The autoscaler is broken; it should follow CPU',
            'The KPA scales on requests in flight, not CPU. Each pod is sized for target × 70% concurrent requests; if requests wait on I/O, concurrency is high while CPU is idle. Raise the target if each pod can safely take more',
            'Knative always runs 12 pods minimum',
            'The pods are stuck and should be restarted',
          ],
          correct: [1],
          explanation: 'Concurrency-based scaling is the point: I/O-bound work holds requests open without burning CPU. The lever is the target (or switching to HPA/CPU if CPU really is the constraint). Folklore fix "switch to HPA" would under-provision this service, since CPU never gets high.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'Going deeper',
      md: `- Knative "Configuring the autoscaler", "Concurrency", "Targets" and "KPA-specific" pages (knative.dev/docs/serving/autoscaling/).
- \`kubectl get podautoscaler -w\` during lab 02 — watch DESIREDSCALE move ahead of ACTUALSCALE.
- The autoscaler's own logs: \`kubectl logs -n knative-serving deploy/autoscaler | grep -i panic\` during the load shows it entering and leaving panic mode.
- Serving source: \`pkg/autoscaler/scaling/autoscaler.go\` — the loop above, including the panic logic.`,
    },
  ],
}

export default lesson
