import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'k1.l4',
  slug: 'scale-to-zero',
  trackId: 'k1',
  index: 4,
  title: 'Scale to Zero',
  minutes: 17,
  hook: 'The last pod disappeared 89 to 92 seconds after the last request, run after run. That is not a timeout anyone chose — it is two windows added together, and each one is a knob with a price.',
  exercise: 'lab+quiz',
  takeaway: {
    number: '60 + 30 ≈ 90 s',
    claim: 'An idle revision reaches zero after the 60 s stable window says "no demand" plus the 30 s scale-to-zero grace period — measured 89–92 s — and every knob that shortens or lengthens that trades idle cost against cold starts.',
  },
  blocks: [
    {
      type: 'prose',
      md: `Scale-to-zero is the feature people choose Knative for and the one they then spend a week tuning. It is simple once you see its parts: the autoscaler must *decide* there is no demand, the activator must be *ready to catch* the next request, and only then does the last pod go.`,
    },
    {
      type: 'statline',
      stats: [
        { value: '89–92 s', label: 'last request → zero pods', hint: 'measured three times on the reference cluster: helloworld-go once, lab 02 at 50 and at 20 connections' },
        { value: '60 s', label: 'stable window', hint: 'concurrency averaged over the last minute must say 0 pods' },
        { value: '30 s', label: 'scale-to-zero grace period', hint: 'time for the activator to be back in the path before the last pod goes' },
        { value: '1.04–1.63 s', label: 'the next request', hint: 'measured cold requests afterwards, image cached' },
      ],
    },
    {
      type: 'prose',
      md: `## The sequence, second by second

1. **t = 0** — the last request completes. queue-proxy reports concurrency 0.
2. **t = 0…60** — the KPA keeps averaging over its 60-second stable window. The average falls but is not zero until the window contains only idle time. (If the service had been in panic, add the rest of that panic minute first.)
3. **t ≈ 60** — the average reaches 0; desired scale is 0.
4. **t = 60…90** — the **grace period**. The SKS is switched to **Proxy** so the activator is in the path, and the autoscaler waits 30 s so every Envoy has picked up the change. A request in this window reaches a live pod via the activator.
5. **t ≈ 90** — replicas set to 0; the pod terminates.

Measured on the reference cluster: **92 s** (an idle \`helloworld-go\`), **89 s** and **89 s** (lab 02, after 50- and 20-connection loads).`,
    },
    {
      type: 'diagram',
      caption: 'fig 1 — from last request to zero, and back',
      height: 66,
      nodes: [
        { id: 'last', x: 2, y: 6, w: 16, h: 12, label: 'last request', sub: 't = 0' },
        { id: 'stable', x: 22, y: 6, w: 18, h: 12, label: 'stable window', sub: '60 s average → 0' },
        { id: 'grace', x: 44, y: 6, w: 18, h: 12, label: 'grace period', sub: '30 s, Proxy mode' },
        { id: 'zero', x: 66, y: 6, w: 14, h: 12, label: '0 pods', sub: 't ≈ 90 s' },
        { id: 'next', x: 84, y: 6, w: 14, h: 12, label: 'next request', sub: 'any time' },
        { id: 'act', x: 60, y: 40, w: 22, h: 12, label: 'activator', sub: 'holds + signals' },
        { id: 'cold', x: 30, y: 40, w: 22, h: 12, label: 'new pod', sub: '~1 s cold start' },
      ],
      edges: [
        { from: 'last', to: 'stable' },
        { from: 'stable', to: 'grace' },
        { from: 'grace', to: 'zero' },
        { from: 'next', to: 'act' },
        { from: 'act', to: 'cold', label: 'scale 0→1' },
      ],
      steps: [
        { caption: 'The last request finishes. Nothing happens immediately: the autoscaler only trusts an average, and a minute of history is still full of load.', active: ['last'] },
        { caption: 'After 60 seconds of idleness the stable-window average reaches zero and the autoscaler decides the revision needs no pods.', active: ['last', 'stable'], edges: ['last->stable'] },
        { caption: 'Before removing the last pod it puts the activator back in the path (Proxy mode) and waits the 30-second grace period, so no request can arrive at nothing.', active: ['stable', 'grace', 'act'], edges: ['stable->grace'] },
        { caption: 'Replicas go to 0 about 90 seconds after the last request. The revision still exists, Ready, costing no pods.', active: ['grace', 'zero'], edges: ['grace->zero'] },
        { caption: 'The next request lands on the activator, which holds it, tells the autoscaler there is demand, and releases it to the new pod once it is Ready — a cold start of about a second here.', active: ['next', 'act', 'cold'], edges: ['next->act', 'act->cold'] },
      ],
    },
    {
      type: 'prose',
      md: `## The knobs, and what each one costs

| knob (annotation or ConfigMap key) | effect | you pay |
|---|---|---|
| \`autoscaling.knative.dev/min-scale: "1"\` | never go below one pod | one pod, always |
| \`autoscaling.knative.dev/scale-down-delay: "15m"\` | hold the current scale for 15 minutes after demand drops | idle pods for up to 15 min after each burst |
| \`scale-to-zero-pod-retention-period\` (ConfigMap, per revision via annotation) | keep the last pod this long after deciding zero | the same, for the last pod only |
| \`scale-to-zero-grace-period\` (ConfigMap) | the 30 s | shortening it risks requests racing the teardown |
| \`autoscaling.knative.dev/initial-scale\` | pods to create for a new revision | capacity before traffic arrives |
| \`enable-scale-to-zero: "false"\` (ConfigMap) | cluster-wide off switch | every idle revision keeps ≥ 1 pod |

The honest choice for a service with spiky traffic every few minutes is usually \`scale-down-delay\` rather than \`min-scale\`: it keeps pods through the gaps you *expect*, and still reaches zero overnight.`,
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'Zero is per revision, not per service',
      md: `In lab 01, revision 00001 went to zero pods while 00002 served traffic. Every old revision with no traffic scales to zero independently. That is what makes keeping old revisions for rollback free — and it is also why a rollback's first requests pay a cold start.`,
    },
    {
      type: 'vendor',
      snapshot: '2026-09',
      title: 'Scale-to-zero defaults on Knative v1.23',
      systems: ['knative'],
      sources: ['https://knative.dev/docs/serving/autoscaling/scale-to-zero/', 'https://knative.dev/docs/serving/autoscaling/scale-bounds/'],
      md: `\`config-autoscaler\` on the reference cluster: \`enable-scale-to-zero: "true"\`, \`scale-to-zero-grace-period: "30s"\`, \`scale-to-zero-pod-retention-period: "0s"\`, \`stable-window: "60s"\`, \`scale-down-delay: "0s"\`, \`min-scale: "0"\`, \`initial-scale: "1"\`, \`allow-zero-initial-scale: "false"\`. The 89–92 s measurements were taken with these defaults on a single-node kind cluster; on a busy multi-node cluster pod termination adds a little.`,
    },
    {
      type: 'isomorphism',
      title: 'you have tuned this trade before',
      pairs: [
        { os: 'connection pool idle timeout', osLine: 'Close idle DB connections after N minutes; the next query pays to reconnect.', llm: 'scale-down-delay', llmLine: 'Keep idle pods for N minutes; the next request after that pays a cold start.' },
        { os: 'pool minimum size', osLine: 'Keep K connections open forever so nobody waits.', llm: 'min-scale', llmLine: 'Keep K pods forever so nobody cold-starts.' },
      ],
    },
    {
      type: 'lab',
      lab: 'autoscaling',
      brief: 'measure.sh keeps watching after the load stops and records how long the revision takes to reach zero. Account for every second of it with the two windows.',
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'A webhook receiver gets one call roughly every 2 minutes. Users complain every call is slow. What is the most proportionate change?',
          options: [
            'min-scale: 10',
            'scale-down-delay of a few minutes, so a pod survives the expected gaps but the service still reaches zero during long idle periods',
            'Shorten scale-to-zero-grace-period to 5 s',
            'Disable scale-to-zero cluster-wide',
          ],
          correct: [1],
          explanation: 'With a 90 s path to zero and 120 s gaps, almost every call is cold. A scale-down-delay slightly longer than the gap keeps one pod warm between calls without paying for pods overnight. min-scale 10 and cluster-wide disable are huge over-corrections; shortening the grace period makes it worse.',
        },
        {
          q: 'Someone proposes setting scale-to-zero-grace-period to 1 s "to save money". What is the risk?',
          options: [
            'None — it just saves 29 seconds of one pod',
            'Requests can race the teardown: ingress replicas may still route to the pod after it is gone, before the activator is in the path everywhere, causing errors',
            'The revision is deleted',
            'The autoscaler stops working',
          ],
          correct: [1],
          explanation: 'The grace period exists so every ingress has switched to the activator before the last pod goes. The saving is at most 29 pod-seconds per scale-down; the risk is failed requests. That is a bad trade in any review.',
        },
        {
          q: 'After a rollback to an older revision, the first few requests take ~1 s and then everything is normal. Is something wrong?',
          options: [
            'Yes — the rollback corrupted the image',
            'No — the old revision had scaled to zero; the first requests paid a cold start while the activator held them',
            'Yes — Kourier needs to be restarted after a rollback',
            'No — rollbacks are always throttled for safety',
          ],
          correct: [1],
          explanation: 'Old revisions scale to zero independently. Rolling back routes traffic to a revision with no pods, so the first requests are cold. If that matters, scale the target revision up (min-scale or initial-scale) before moving traffic.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'Going deeper',
      md: `- Knative "Configuring scale to zero" and "Configuring scale bounds" (knative.dev/docs/serving/autoscaling/).
- Watch it happen: \`kubectl get sks -w\` in one terminal and \`kubectl get pods -w\` in another, then stop a load test.
- \`kubectl logs -n knative-serving deploy/activator\` while a cold request arrives — look for the request being queued until the revision has a ready endpoint.`,
    },
  ],
}

export default lesson
