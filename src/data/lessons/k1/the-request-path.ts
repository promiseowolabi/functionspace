import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'k1.l2',
  slug: 'the-request-path',
  trackId: 'k1',
  index: 2,
  title: 'The Request Path',
  minutes: 18,
  hook: 'Your request passes through Envoy, maybe the activator, and always a sidecar before it reaches your code. Whether the activator is in the path is decided by one number most people have never heard of: 211.',
  exercise: 'read+quiz',
  takeaway: {
    number: '211',
    claim: 'With default settings the activator stays in the request path until a revision\'s spare capacity exceeds a target burst capacity of 211 concurrent requests — so on small services every request takes the extra hop, by design.',
  },
  blocks: [
    {
      type: 'prose',
      md: `Between \`curl\` and your handler there are four hops on a Knative cluster, and one of them comes and goes. Knowing which is which is the difference between "Knative is slow" and "the activator is buffering because we are at zero".

1. **Ingress** — Kourier's Envoy gateway, programmed from the Route. Matches the \`Host\` header and picks a revision by the traffic split.
2. **Activator** — a shared Knative component that can sit in front of a revision. It holds requests while a revision scales up from zero, and spreads load across pods when it is in the path.
3. **queue-proxy** — the sidecar in every revision pod. Counts requests in flight, enforces \`containerConcurrency\`, reports metrics to the autoscaler.
4. **Your container** — on the port you declared (8080 here).`,
    },
    {
      type: 'diagram',
      caption: 'fig 1 — the request path, both modes',
      height: 74,
      nodes: [
        { id: 'client', x: 2, y: 30, w: 14, h: 12, label: 'client', sub: 'Host: …sslip.io' },
        { id: 'envoy', x: 20, y: 30, w: 16, h: 12, label: 'Kourier', sub: 'Envoy gateway' },
        { id: 'act', x: 42, y: 6, w: 16, h: 12, label: 'activator', sub: 'Proxy mode' },
        { id: 'qp', x: 64, y: 30, w: 16, h: 12, label: 'queue-proxy', sub: ':8012 counts' },
        { id: 'app', x: 84, y: 30, w: 14, h: 12, label: 'your code', sub: ':8080' },
        { id: 'as', x: 42, y: 56, w: 16, h: 12, label: 'autoscaler', sub: 'reads metrics' },
      ],
      edges: [
        { from: 'client', to: 'envoy' },
        { from: 'envoy', to: 'act', label: 'Proxy' },
        { from: 'act', to: 'qp' },
        { from: 'envoy', to: 'qp', label: 'Serve' },
        { from: 'qp', to: 'app' },
        { from: 'qp', to: 'as', label: 'concurrency' },
        { from: 'act', to: 'as', label: 'demand at 0' },
      ],
      steps: [
        { caption: 'The client connects to Kourier on port 80. Envoy matches the Host header to a Route and picks a revision according to the traffic percentages.', active: ['client', 'envoy'], edges: ['client->envoy'] },
        { caption: 'In Proxy mode the revision\'s endpoints are the activator\'s. At zero pods it holds the request and tells the autoscaler there is demand.', active: ['envoy', 'act', 'as'], edges: ['envoy->act', 'act->as'] },
        { caption: 'Once pods exist, the activator forwards to a queue-proxy — and, crucially, may stay in the path, load-balancing with knowledge of each pod\'s free slots.', active: ['act', 'qp'], edges: ['act->qp'] },
        { caption: 'In Serve mode the revision\'s endpoints are the pods themselves and Envoy sends straight to queue-proxy. One hop fewer.', active: ['envoy', 'qp'], edges: ['envoy->qp'] },
        { caption: 'queue-proxy counts requests in flight, forwards to your container, and reports that concurrency to the autoscaler — the signal every scaling decision is made from.', active: ['qp', 'app', 'as'], edges: ['qp->app', 'qp->as'] },
      ],
    },
    {
      type: 'prose',
      md: `## Proxy mode and Serve mode

For every revision Knative creates a **ServerlessService** (SKS), and the SKS has a \`MODE\`:

- **Proxy** — the revision's public Kubernetes Service points at the **activator** pods.
- **Serve** — it points at the revision's own **pods**.

You can see the mode, and the endpoints that follow from it, directly:`,
    },
    {
      type: 'code',
      filename: 'reference cluster, one warm pod, default settings',
      lang: 'bash',
      code: `kubectl get sks alice-hello-00002
# NAME                MODE    ACTIVATORS   SERVICENAME         PRIVATESERVICENAME
# alice-hello-00002   Proxy   4            alice-hello-00002   alice-hello-00002-private

kubectl get endpointslices -l kubernetes.io/service-name=alice-hello-00002
# NAME                      ADDRESSTYPE   PORTS       ENDPOINTS
# alice-hello-00002-fbslk   IPv4          8112,8012   10.244.0.5      ← the activator's IP

kubectl get pods -n knative-serving -l app=activator -o wide
# activator-56d698c974-h9zxs   …   10.244.0.5`,
    },
    {
      type: 'prose',
      md: `The revision had a **warm pod** (\`10.244.0.53\`) — and traffic still went through the activator. That is not a bug. The switch between modes is governed by **target burst capacity** (TBC):

- The autoscaler computes the revision's *excess burst capacity*: total capacity of the ready pods, minus the TBC, minus the recent peak concurrency.
- While that is **negative**, the activator stays in the path (Proxy), so it can absorb a burst and queue requests rather than let pods overflow.
- Once it is positive, the SKS flips to Serve and the activator steps out.

The default TBC is **211**. Each pod counts at its full concurrency target of 100 — the 70% utilisation factor decides how many pods to scale to, not this sum. So an idle single-pod revision is 100 − 211 = 111 short, and stays in Proxy. The activator leaves the path only once you are running enough pods to absorb a 211-request burst on top of current load: three idle pods (300 − 211 = 89) would do it.`,
    },
    {
      type: 'code',
      filename: 'set TBC to 0 and watch the mode flip',
      lang: 'bash',
      code: `kn service update alice-hello --annotation autoscaling.knative.dev/target-burst-capacity=0
# … send a few requests …
kubectl get sks | grep alice-hello
# alice-hello-00003   Serve   2   alice-hello-00003   alice-hello-00003-private   True
kubectl get endpointslices -l kubernetes.io/service-name=alice-hello-00003
# alice-hello-00003-x7k2p   IPv4   8112,8012   10.244.0.54      ← now the pod's own IP`,
    },
    {
      type: 'vendor',
      snapshot: '2026-09',
      title: 'Target burst capacity and the activator',
      systems: ['knative'],
      sources: [
        'https://knative.dev/docs/serving/request-flow/',
        'https://knative.dev/docs/serving/autoscaling/kpa-specific/',
      ],
      md: `Knative v1.23 \`config-autoscaler\` defaults: \`target-burst-capacity: 211\`, \`activator-capacity: 100\`. The autoscaler's excess burst capacity is \`floor(readyPods × total − TBC − panicConcurrency)\`, where \`total\` is the concurrency target (or \`containerConcurrency\`) before the utilisation factor is applied. Per revision, override with the annotation \`autoscaling.knative.dev/target-burst-capacity\`: **0** means the activator is only in the path at zero, **-1** means always. The mode flip from Proxy to Serve on setting 0 was observed on the reference cluster. The docs' request-flow page describes the same two paths and why the activator stays in by default for small revisions: it load-balances with knowledge of how many requests each pod can still take, which kube-proxy's round-robin cannot.`,
    },
    {
      type: 'prose',
      md: `## Why you might *want* the activator in the path

It costs one extra hop, so it looks like pure overhead. It is not:

- **It knows pod capacity.** With \`containerConcurrency: 1\` (one request at a time per pod), round-robin will happily send a second request to a busy pod. The activator will not; it queues until a pod is free.
- **It absorbs bursts during scale-up.** New pods take ~a second to become ready (F0.L3). Without a buffer those requests hit an overloaded pod or fail.
- **It is always there at zero.** Scale-to-zero only works because some component can hold a request with no backend — the activator is that component.

Set TBC to 0 when you have many pods, a high concurrency limit and latency that matters to the millisecond. Leave it alone otherwise.`,
    },
    {
      type: 'callout',
      variant: 'info',
      title: 'Cluster-local traffic takes the same path',
      md: `The load in lab 02 went to \`alice-sleepy.default.svc.cluster.local\`. That name is an **ExternalName** Service pointing at \`kourier-internal\` — a second Envoy listener for in-cluster traffic. So cluster-local calls still go through Envoy, the Route's split and (in Proxy mode) the activator. \`kubectl get svc alice-hello\` shows the ExternalName.`,
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'A team measures an extra network hop on every request to a small Knative service with 1 pod and asks whether something is misconfigured. What is the explanation?',
          options: [
            'Kourier is misconfigured and double-proxying',
            'With default target burst capacity (211), a one-pod revision has negative excess burst capacity, so the activator deliberately stays in the path',
            'queue-proxy always forwards through the activator',
            'The service is actually at zero pods',
          ],
          correct: [1],
          explanation: 'Proxy mode is the default for small revisions: the activator buffers bursts and balances by pod capacity. It is configurable (TBC 0 removes it when pods exist) but it is not a misconfiguration.',
        },
        {
          q: 'A function processes one request at a time (containerConcurrency: 1). You set target-burst-capacity to 0 to "remove overhead", and error rates rise during traffic spikes. Why?',
          options: [
            'TBC 0 disables autoscaling',
            'Without the activator in the path, round-robin sends requests to pods that are already busy; the activator used to queue them until a slot was free',
            'TBC 0 reduces max-scale to 1',
            'queue-proxy is removed when TBC is 0',
          ],
          correct: [1],
          explanation: 'With concurrency 1, capacity-aware routing matters. In Serve mode, kube-proxy/Envoy balance without knowing which pod is free, so requests pile into queue-proxy queues or overflow. Removing the hop removed the buffer.',
        },
        {
          q: 'Where does the autoscaler get the concurrency number it scales on?',
          options: [
            'From Kourier access logs',
            'From queue-proxy in each pod (and from the activator for requests it is holding)',
            'From CPU usage via metrics-server',
            'From the application\'s own /metrics endpoint',
          ],
          correct: [1],
          explanation: 'queue-proxy sees every request that enters the pod and reports in-flight counts; the activator reports demand it is holding when there are no pods. That is why the KPA scales on requests, not CPU — the HPA option (K1.L3) is the CPU path.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'Going deeper',
      md: `- Knative "Request flow" (knative.dev/docs/serving/request-flow/) — the official walk through Proxy and Serve.
- \`kubectl get sks -w\` while running lab 02: watch the mode change as the pod count crosses the burst-capacity threshold.
- In the Serving source, \`pkg/activator/\` (the throttler that tracks per-pod capacity) and \`pkg/queue/\` (the sidecar's breaker and stats reporter).`,
    },
  ],
}

export default lesson
