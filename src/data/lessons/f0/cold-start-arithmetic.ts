import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'f0.l3',
  slug: 'cold-start-arithmetic',
  trackId: 'f0',
  index: 3,
  title: 'Cold Start Arithmetic',
  minutes: 16,
  hook: 'A cold start is not one number. It is five terms added together, and the biggest one — pulling the image — is usually the one you chose when you picked a builder.',
  exercise: 'read+quiz',
  takeaway: {
    number: '~1 s vs ~10 ms',
    claim: 'On the reference cluster a cold request took about a second with the image already cached and a warm one about ten milliseconds; an uncached image adds its pull time on top, and that term scales with image size.',
  },
  blocks: [
    {
      type: 'prose',
      md: `"Cold start" gets quoted as if it were a property of a platform. It is not. It is the time between a request arriving for a service with no running copy and that request being answered, and it decomposes into terms you can measure and, mostly, control:

\`\`\`
cold start ≈ schedule + pull + container start + runtime init + readiness + first request
\`\`\`

Knative and DataEngine differ in who owns each term, but not in the terms themselves.`,
    },
    {
      type: 'statline',
      stats: [
        { value: '6.9 s', label: 'first ever Ready', hint: 'kn service create on the reference kind cluster, image not yet on the node (includes the pull)' },
        { value: '1.04–1.63 s', label: 'cold, image cached', hint: 'three measured cold requests after scale-to-zero, same cluster' },
        { value: '5–14 ms', label: 'warm', hint: 'the request right after each cold one' },
        { value: '~145×', label: 'cold ÷ warm', hint: '1.63 s ÷ 11 ms on the worst measured pair' },
      ],
    },
    {
      type: 'prose',
      md: `## The five terms

**1. Schedule.** The scaler decides "one pod", Kubernetes picks a node. On an idle cluster this is tens of milliseconds; on a full one it can be *forever* — if no node has room, the pod is Pending and your cold start becomes "cluster autoscaler adds a node", which is minutes.

**2. Pull.** If the image is not already on the chosen node, the container runtime downloads and unpacks it. This is the term with the widest range, because it is proportional to **compressed image size ÷ registry bandwidth**, plus decompression.

**3. Container start.** Create the sandbox and start the process — in Knative, *two* processes: your container and the queue-proxy sidecar. Hundreds of milliseconds.

**4. Runtime init.** Your language runtime boots and your initialisation code runs: importing libraries, loading a model, opening connections. This term is entirely yours, and it is where Python functions that \`import torch\` at the top lose seconds.

**5. Readiness.** The platform will not send traffic until a readiness probe passes. Knative's queue-proxy probes aggressively so this term stays small, but a slow \`ready()\` hook makes it large.

Then the request itself, which is the warm latency.`,
    },
    {
      type: 'diagram',
      caption: 'fig 1 — where the second goes',
      height: 66,
      nodes: [
        { id: 'req', x: 2, y: 4, w: 16, h: 10, label: 'request', sub: '0 pods' },
        { id: 'sched', x: 22, y: 4, w: 16, h: 10, label: 'schedule', sub: 'pick a node' },
        { id: 'pull', x: 42, y: 4, w: 16, h: 10, label: 'pull', sub: 'size ÷ bandwidth' },
        { id: 'start', x: 62, y: 4, w: 16, h: 10, label: 'start', sub: 'app + sidecar' },
        { id: 'init', x: 62, y: 30, w: 16, h: 10, label: 'init', sub: 'imports, clients' },
        { id: 'ready', x: 42, y: 30, w: 16, h: 10, label: 'ready', sub: 'probe passes' },
        { id: 'serve', x: 22, y: 30, w: 16, h: 10, label: 'serve', sub: 'warm path' },
        { id: 'held', x: 2, y: 52, w: 36, h: 10, label: 'request held', sub: 'activator / queue' },
      ],
      edges: [
        { from: 'req', to: 'sched' },
        { from: 'sched', to: 'pull' },
        { from: 'pull', to: 'start' },
        { from: 'start', to: 'init' },
        { from: 'init', to: 'ready' },
        { from: 'ready', to: 'serve' },
        { from: 'req', to: 'held' },
      ],
      steps: [
        { caption: 'A request arrives for a revision with zero pods. Someone must hold it — in Knative, the activator — while everything else happens.', active: ['req', 'held'], edges: ['req->held'] },
        { caption: 'The scaler asks for one pod and Kubernetes schedules it. Cheap on an idle cluster; unbounded if no node has room.', active: ['req', 'sched'], edges: ['req->sched'] },
        { caption: 'If the node has never run this image, it pulls it. This term is proportional to image size and is the one a builder choice changes by an order of magnitude.', active: ['sched', 'pull'], edges: ['sched->pull'] },
        { caption: 'The runtime starts your container and the platform sidecar, then your language runtime boots and your init code runs.', active: ['pull', 'start', 'init'], edges: ['pull->start', 'start->init'] },
        { caption: 'A readiness probe passes, the held request is released to the pod, and from now on requests take the warm path: milliseconds.', active: ['init', 'ready', 'serve'], edges: ['init->ready', 'ready->serve'] },
      ],
    },
    {
      type: 'prose',
      md: `## Reading the reference numbers

On the reference kind cluster (Knative v1.23, one node, the \`helloworld-go\` sample):

- \`kn service create\` reported **Ready after 6.9 s**. That included pulling the image, because the node had never seen it.
- After scale-to-zero, three cold requests took **1.63 s, 1.04 s and 1.06 s**, and the warm request right after each took **11 ms, 14 ms and 5 ms**. The image was cached, so the pull term was zero; what is left is schedule + start + init + readiness for a tiny Go binary.

So for a small image already on the node, about **one second** is the floor this setup imposes. Everything a real function adds — a bigger image, a heavier runtime, a model load — goes on top.`,
    },
    {
      type: 'prose',
      md: `## The pull term is a builder decision

In lab 05 the same Python function was built two ways. The \`host\` builder produced an image whose layers total **50.7 MB compressed** in the registry. The \`pack\` (buildpacks) builder produced an image of **1.06 GB** uncompressed on disk. Those are different measures — registry bytes versus unpacked bytes — so do not divide one by the other, but the order of magnitude is not in doubt.

The pull arithmetic is simple enough to do in a review. At an effective **100 MB/s** from registry to node (an order-of-magnitude estimate for a registry on the same network; yours may be far lower across a WAN):

| image (compressed) | pull ≈ size ÷ 100 MB/s |
|---|---|
| 50 MB | 0.5 s |
| 300 MB | 3 s |
| 1 GB | 10 s, plus decompression |

The pull only happens on a node that has not run that digest before — the first pod on each node, and every node after every new build. In a cluster that autoscales *nodes*, "first pod on this node" is common.`,
    },
    {
      type: 'callout',
      variant: 'segfault',
      title: 'The cold start you cannot see in your metrics',
      md: `If the only pod is gone and the node has no room, the new pod sits in **Pending** until the cluster autoscaler adds a node. Your function's latency dashboard shows one very slow request; the real cause is a capacity event two layers down. \`kubectl get events\` shows it; your function logs never will.`,
    },
    {
      type: 'prose',
      md: `## What you can do about each term

| term | lever | cost of the lever |
|---|---|---|
| schedule | headroom on nodes | paying for idle capacity |
| pull | smaller images; pre-pull on nodes; keep digests stable | build discipline |
| start + readiness | nothing much — it is the platform | — |
| init | lazy imports; move heavy work to first use or to a background thread | first request pays instead |
| all of them | keep one copy warm (**min-scale 1**) | one pod running 24 × 7 |

The last row is the only one that removes the cold start entirely, and it does so by giving up scale-to-zero for that service. That is a legitimate choice for a latency-sensitive path; make it deliberately and write down what it costs.`,
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'A function\'s cold start is 12 s on new nodes and 1.5 s on nodes that have run it before. What is the most likely dominant term, and the cheapest fix?',
          options: [
            'Runtime init — rewrite the handler in Go',
            'The image pull — shrink the image (different base or builder) so the first-pod-on-node cost falls',
            'Scheduling — add more nodes',
            'Readiness — lower the probe period',
          ],
          correct: [1],
          explanation: 'The difference between "new node" and "node that has seen it" is exactly the pull term: 10.5 s of it. Shrinking the image attacks that directly. Rewriting in another language changes init, which is the same on both kinds of node and therefore at most the 1.5 s part.',
        },
        {
          q: 'Your team wants to set min-scale to 1 on all 40 functions "to fix cold starts". What is the right response in a design review?',
          options: [
            'Agree — cold starts are always unacceptable',
            'Agree, and also set max-scale to 1 to save money',
            'Apply it only to the latency-sensitive functions and state the cost: one always-running pod each, i.e. giving up scale-to-zero for those services',
            'Refuse — min-scale has no effect on cold starts',
          ],
          correct: [2],
          explanation: 'min-scale 1 does remove cold starts, by paying for a copy that never goes away. Forty always-on pods is the non-serverless deployment with extra steps. The professional answer names the cost and scopes the fix to where latency matters.',
        },
        {
          q: 'Which term of a cold start is entirely under the function author\'s control?',
          options: ['Scheduling', 'Container start', 'Runtime init — imports, client setup, model loading', 'Registry bandwidth'],
          correct: [2],
          explanation: 'Init is your code running before the first request. Heavy imports and eager model loading live here. Scheduling, container start and bandwidth belong to the cluster and the platform.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'Going deeper',
      md: `- Measure it yourself in lab 02, and in K1.L4 read how the activator holds the request during all five terms.
- \`kubectl get events --sort-by=.lastTimestamp\` during a cold start shows Scheduled, Pulling/Pulled, Created, Started — the terms above, timestamped by Kubernetes.
- Knative's "Scale to zero" and "Configuring scale bounds" docs (knative.dev/docs/serving/autoscaling/) for min-scale, initial-scale and scale-down-delay — the three knobs that trade cold starts for idle cost.`,
    },
  ],
}

export default lesson
