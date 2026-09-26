import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'k1.l6',
  slug: 'tuning-a-service',
  trackId: 'k1',
  index: 6,
  title: 'Tuning a Service',
  minutes: 16,
  hook: 'Out of the box your container has no CPU or memory request at all, a 300-second timeout, and no concurrency limit. Those three defaults are fine for a demo and wrong for almost every production function.',
  exercise: 'read+quiz',
  takeaway: {
    number: '0 requests, 300 s, ∞',
    claim: 'A default Knative revision runs your container with no resource requests, a 300 s request timeout and unlimited per-pod concurrency; a production service sets all three deliberately — and the error you get when the timeout fires is a 504 from the activator, not from your code.',
  },
  blocks: [
    {
      type: 'prose',
      md: `The previous five lessons explained what Knative does with your service. This one is the checklist of what you should tell it. Each setting is a line in the revision template; each one changes the scaler, the scheduler, or the contract.`,
    },
    {
      type: 'statline',
      stats: [
        { value: '{}', label: 'user-container resources', hint: 'observed on v1.23: no requests, no limits, unless you set them' },
        { value: '25m', label: 'queue-proxy CPU request', hint: 'the sidecar does get a small request by default' },
        { value: '300 s', label: 'request timeout', hint: 'revision-timeout-seconds; the cluster maximum defaults to 600 s' },
        { value: '504', label: 'what a timeout returns', hint: 'measured: "activator request timeout" after exactly the configured seconds' },
      ],
    },
    {
      type: 'prose',
      md: `## 1. Resources: the default is nothing

On the reference cluster, a revision created with no resource settings produced this pod:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `kubectl get pod <revision-pod> -o jsonpath='{range .spec.containers[*]}{.name}: {.resources}{"\\n"}{end}'
# user-container: {}
# queue-proxy: {"requests":{"cpu":"25m"}}`,
    },
    {
      type: 'callout',
      variant: 'segfault',
      title: 'The example block is not the defaults',
      md: `\`kubectl get cm config-defaults -n knative-serving -o yaml\` shows \`revision-cpu-request: "400m"\`, \`revision-memory-request: "100M"\` and more — inside the \`_example\` key. That key is documentation. Nothing in it is applied until an operator copies it into \`data\`. The pod above is what actually runs.`,
    },
    {
      type: 'prose',
      md: `A container with no requests is scheduled as if it needs nothing (\`BestEffort\` QoS). Ten of them land on one node, the node runs out of memory, and the kernel kills whichever is largest — often yours. Set at least a **request** for CPU and memory that reflects real use:

\`\`\`
kn service update alice-fn --request cpu=250m,memory=256Mi --limit memory=512Mi
\`\`\`

A memory **limit** protects the node. A CPU limit is more contentious: it throttles the container even when the node is idle, which shows up as mysterious latency. Many teams set CPU requests and memory limits, and no CPU limit.`,
    },
    {
      type: 'prose',
      md: `## 2. Concurrency: soft target, hard limit

From K1.L3: \`autoscaling.knative.dev/target\` (\`--scale-target\`) is what the autoscaler aims for; \`containerConcurrency\` (\`--concurrency-limit\`) is what queue-proxy enforces. The default hard limit is **0 — unlimited**.

Choose the hard limit from the code, not from a benchmark:

| handler | sensible containerConcurrency |
|---|---|
| synchronous Python/Ruby, one request at a time | 1 |
| thread pool of N workers | N |
| async server (Go, Node, asyncio) | 0 (unlimited) with a realistic \`target\` |
| wraps a GPU or a model that serialises | 1, and expect to scale out wide |

A hard limit makes the activator's capacity-aware routing (K1.L2) matter, and makes queueing visible as latency rather than as a crashed process.`,
    },
    {
      type: 'prose',
      md: `## 3. Timeouts: what the client sees

\`--timeout\` sets the revision's \`timeoutSeconds\`: how long the routing layer waits for your container to *begin* replying. Measured against \`autoscale-go\` with \`--timeout 3\`:`,
    },
    {
      type: 'code',
      filename: 'reference cluster',
      lang: 'text',
      code: `?sleep=1000  -> 200 in 1.03 s
?sleep=6000  -> 504 in 3.01 s    body: "activator request timeout"`,
    },
    {
      type: 'prose',
      md: `Three things to take from that:

- The **504 came from the activator**, not your code. Your handler may still be running — and still writing to a database — after the client has given up. Timeouts cut the *request*, not the *work*.
- A timeout that fires under load is often **queueing**, not slowness: with a hard concurrency limit, requests wait in queue-proxy or the activator, and the wait counts.
- The cluster caps per-revision timeouts at \`max-revision-timeout-seconds\` (**600 s** by default). Long work does not belong in a request/response function; put it behind an event (K2) and reply asynchronously.`,
    },
    {
      type: 'prose',
      md: `## 4. The rest of the checklist

- **min-scale / max-scale** (K1.L4) — max-scale is also a *blast-radius* control: a bug that loops calling itself cannot exceed it.
- **Readiness** — if your init is slow, give the container a readiness probe so traffic waits for it; Knative's queue-proxy honours it.
- **Graceful shutdown** — on scale-down your container gets SIGTERM; finish in-flight work within the pod's termination grace period.
- **Image by digest** — Knative pins tags anyway, but deploying by digest makes your YAML the record of what runs.`,
    },
    {
      type: 'code',
      filename: 'a production-shaped revision template',
      lang: 'yaml',
      code: `spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/target: "20"
        autoscaling.knative.dev/min-scale: "0"
        autoscaling.knative.dev/max-scale: "30"
        autoscaling.knative.dev/scale-down-delay: "2m"
    spec:
      containerConcurrency: 25
      timeoutSeconds: 30
      containers:
        - image: registry.example.com/team/pricing@sha256:…
          resources:
            requests: { cpu: 250m, memory: 256Mi }
            limits:   { memory: 512Mi }`,
    },
    {
      type: 'vendor',
      snapshot: '2026-09',
      title: 'Serving defaults that matter for tuning, v1.23',
      systems: ['knative'],
      sources: [
        'https://knative.dev/docs/serving/services/configure-requests-limits-services/',
        'https://knative.dev/docs/serving/autoscaling/concurrency/',
      ],
      md: `\`config-defaults\` documents \`revision-timeout-seconds: 300\`, \`max-revision-timeout-seconds: 600\`, \`revision-response-start-timeout-seconds: 300\`, \`container-concurrency: 0\`, \`container-concurrency-max-limit: 1000\`. The resource values in its \`_example\` block are not applied by default — observed: \`user-container\` had no requests or limits; \`queue-proxy\` had \`cpu: 25m\` (\`queue-sidecar-cpu-request\` in \`config-deployment\`). The 504 body text was observed with the activator in the path.`,
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'After moving 30 functions to Knative, nodes start OOM-killing pods at random. Nothing in the functions changed. What is the most likely cause?',
          options: [
            'Knative adds a memory leak through queue-proxy',
            'The revisions have no memory requests, so the scheduler packs them onto nodes as if they need nothing; real usage exceeds node memory',
            'The autoscaler is creating too many pods',
            'Kourier consumes node memory',
          ],
          correct: [1],
          explanation: 'With no requests every pod is BestEffort and invisible to the scheduler\'s bin-packing. Setting realistic memory requests (and a memory limit) is the fix. The example block in config-defaults did not apply them for you.',
        },
        {
          q: 'A report-generation function takes 8 minutes. Users get 504s after 5 minutes, but the reports still appear in storage later. What is going on, and what is the right design?',
          options: [
            'Raise timeoutSeconds to 3600',
            'The 300 s default timeout cut the HTTP request, not the work. Long work should be triggered by an event and report completion asynchronously, not held in a request',
            'The function is crashing at 5 minutes',
            'Kourier has a hard 5-minute limit that cannot change',
          ],
          correct: [1],
          explanation: 'The routing layer gave up; the container kept going. Raising the timeout is capped at 600 s by default and still ties a connection up for minutes. Move it to the event path (K2) — that is what brokers and DataEngine triggers are for.',
        },
        {
          q: 'A synchronous Python function (one request at a time) is deployed with default concurrency. Under load, latency explodes while CPU looks fine. What single setting most directly helps?',
          options: [
            'containerConcurrency: 1, so queue-proxy never sends a pod more than it can process and the autoscaler sizes for real capacity',
            'A CPU limit of 100m',
            'min-scale: 0',
            'timeoutSeconds: 600',
          ],
          correct: [0],
          explanation: 'With unlimited concurrency, many requests pile into a process that serves one at a time; they wait inside the container where nobody can see them. A hard limit of 1 makes the waiting happen in queue-proxy/activator and makes the autoscaler add pods for it.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'Going deeper',
      md: `- Knative "Configuring resource requests and limits" and "Concurrency" (knative.dev/docs/serving/).
- \`kubectl get cm config-defaults config-deployment -n knative-serving -o yaml\` — read the \`data\` keys, not just \`_example\`, to see what your operators actually set.
- Kubernetes "Pod Quality of Service Classes" — BestEffort vs Burstable vs Guaranteed, and who gets evicted first.`,
    },
  ],
}

export default lesson
