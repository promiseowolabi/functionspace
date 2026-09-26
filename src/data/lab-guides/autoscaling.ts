import type { LabGuide } from './types'

const guide: LabGuide = {
  id: 'autoscaling',
  requires: ['the kind cluster from lab 00', 'kn', 'kubectl'],
  blocks: [
    {
      type: 'prose',
      md: `## What you will see

The Knative autoscaler (KPA) is arithmetic, not magic. You will set a concurrency target, predict how many pods a given load needs, run the load, and compare. Then you will stop the load and time how long the revision takes to disappear — and account for every second of it.

The load generator is **fortio**, run as a short-lived pod inside the cluster, so you install nothing.`,
    },
    {
      type: 'prose',
      md: `## 1. A service that is slow on purpose

\`autoscale-go\` is a Knative sample that sleeps for as long as you ask. A request that sleeps 100 ms occupies one slot of concurrency for 100 ms — which makes the arithmetic easy to check.`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `export PREFIX=alice
kn service create $PREFIX-sleepy \\
  --image ghcr.io/knative/autoscale-go:latest \\
  --annotation autoscaling.knative.dev/target=10 \\
  --scale-max 10

curl "http://$PREFIX-sleepy.default.127.0.0.1.sslip.io?sleep=100"
# Slept for 100.25 milliseconds.`,
    },
    {
      type: 'prose',
      md: `Two annotations are now on the revision template. \`target=10\` says "aim for 10 requests in flight per pod". \`max-scale=10\` caps the pod count. \`kn\` wrote the second one for you from \`--scale-max\`:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `kubectl get ksvc $PREFIX-sleepy -o jsonpath='{.spec.template.metadata.annotations}' ; echo`,
    },
    {
      type: 'prose',
      md: `## 2. Predict before you measure

The autoscaler does not aim for the target itself. It multiplies it by \`container-concurrency-target-percentage\`, which defaults to **70%**, to leave headroom for bursts. So each pod is sized for **10 × 0.7 = 7** concurrent requests.

The load in the next step keeps **50** requests in flight. Write down how many pods you expect before you run it.`,
    },
    {
      type: 'callout',
      variant: 'isomorphism',
      title: 'The formula',
      md: `desired pods = ⌈ observed concurrency ÷ (target × utilisation) ⌉, clamped to [min-scale, max-scale]. For 50 in flight: ⌈50 ÷ 7⌉ = ⌈7.14⌉ = **8**.`,
    },
    {
      type: 'prose',
      md: `## 3. Measure

\`measure.sh\` starts fortio with 50 connections for 30 s against the service's **cluster-local** address (\`$PREFIX-sleepy.default.svc.cluster.local\`), samples the Running pod count every second, then keeps watching until the count reaches zero.`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `./measure.sh          # = ./measure.sh 50 30s 100`,
    },
    {
      type: 'code',
      filename: 'output (from the run this lab was written on)',
      lang: 'text',
      code: `t(s)  pods
   1  1
   3  1
   4  2
   5  2
   7  5
   8  7
  10  8
  …   8
  33  8
  fortio: Ended after 30.07s : 14459 calls. qps=480.85
  fortio: # target 50% 0.110359
  fortio: # target 99% 0.119914
  fortio: Code 200 : 14459 (100.0 %)
load finished after 34s; peak pods: 8. waiting for zero…
reached zero 89s after the last request.
wrote results.env`,
    },
    {
      type: 'prose',
      md: `Three things to notice:

- **The peak is exactly 8.** Your prediction should match. If your laptop is slow, you may see 9 — the autoscaler measures concurrency including requests queued in queue-proxy, and queueing inflates it.
- **It got to 8 in under ten seconds.** The normal (stable) window is 60 s — far too slow to react to a burst. What you saw is **panic mode**: when concurrency over the 6-second panic window exceeds 200% of what the current pods can take, the autoscaler scales on the short window and refuses to scale down until the panic ends.
- **qps ≈ 481.** 50 requests in flight, each taking ~0.104 s, gives 50 ÷ 0.104 ≈ 481 per second. That is Little's law, and X1.L2 is built on it.`,
    },
    {
      type: 'prose',
      md: `## 4. Account for the 89 seconds

After the load stopped, the revision took **89 s** to reach zero pods. It is not a timeout; it is two windows added together:

1. The autoscaler averages concurrency over the **60 s stable window**. Only when that average says "0 pods needed" does it decide to scale to zero.
2. It then waits out the **30 s scale-to-zero grace period**, so the activator is back in the request path before the last pod goes away.
3. The remaining few seconds are pod termination.

60 + 30 is 90. You measured 89 — the windows overlap slightly with the last second of load. Now look at the objects that carried the decision:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `kubectl get podautoscaler | grep $PREFIX-sleepy     # DESIREDSCALE / ACTUALSCALE
kubectl get sks | grep $PREFIX-sleepy               # MODE flips Serve → Proxy at zero`,
    },
    {
      type: 'prose',
      md: `## 5. Predict once more

Run a lighter load — 20 in flight — and predict the peak first. (⌈20 ÷ 7⌉ = ?)`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `./measure.sh 20 30s 100
./measure.sh 50 30s 100     # run the 50-connection test last: verify.sh reads results.env`,
    },
    {
      type: 'prose',
      md: `On the reference run, 20 connections peaked at **3** pods (⌈20 ÷ 7⌉ = ⌈2.86⌉ = 3) and moved **192** requests per second (20 ÷ 0.104). Scale-to-zero again took **89 s**: the windows do not depend on how hard the service was working.`,
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'results.env is overwritten on every run',
      md: `\`verify.sh\` checks the last run against the configuration (target 10, max 10). Finish with a run at 50 connections so the numbers it checks are the ones this guide explains.`,
    },
    {
      type: 'prose',
      md: `## 6. Verify`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `./verify.sh`,
    },
    {
      type: 'deepdive',
      title: 'Troubleshooting',
      md: `- **Peak pods is 1** — the load never reached the service. \`kubectl logs $PREFIX-load\` while it runs; the URL must be the cluster-local one.
- **Peak is 10 and stays there** — your machine is CPU-starved and requests are queueing, which the autoscaler sees as extra concurrency. Close some applications, or give Docker more CPU.
- **Zero takes far longer than 90 s** — something is still calling the service (a \`curl\` loop in another terminal, a browser tab).
- **\`fortio/fortio\` image pull is slow** — the first run pulls it into the kind node; later runs are instant.`,
    },
  ],
  cleanup: [
    {
      type: 'code',
      lang: 'bash',
      code: `kn service delete $PREFIX-sleepy`,
    },
  ],
}

export default guide
