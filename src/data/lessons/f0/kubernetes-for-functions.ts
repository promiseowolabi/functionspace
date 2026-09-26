import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'f0.l4',
  slug: 'kubernetes-for-functions',
  trackId: 'f0',
  index: 4,
  title: 'Kubernetes for Functions',
  minutes: 18,
  hook: 'You need five Kubernetes ideas to read everything that follows — and the most important one is not a resource at all. It is a loop that never stops comparing what you asked for with what exists.',
  exercise: 'lab+quiz',
  takeaway: {
    number: '1 loop',
    claim: 'Every Knative object is desired state reconciled by a controller loop; you change a platform by editing desired state, and anything you delete that the desired state still implies comes straight back.',
  },
  blocks: [
    {
      type: 'prose',
      md: `Knative is not a program that runs your functions. It is a set of **controllers** that extend Kubernetes with new resource types and then keep ordinary Kubernetes objects — Deployments, Services, Pods — in line with them. So you do not need all of Kubernetes to follow this course, but you do need the five ideas below, and you need the fifth one in your bones.`,
    },
    {
      type: 'prose',
      md: `## 1. Pods

A **Pod** is one or more containers scheduled together on one node, sharing a network namespace (they reach each other on \`localhost\`). It is the unit Kubernetes starts and stops. A Knative revision pod has two containers — your \`user-container\` and the \`queue-proxy\` sidecar — which is only possible because a pod can hold more than one.

## 2. Deployments and ReplicaSets

You almost never create pods directly. A **Deployment** says "I want N identical pods from this template"; it creates a **ReplicaSet**, which creates the pods and replaces any that die. Scaling a Deployment means changing one number, \`replicas\`. That number is what Knative's autoscaler turns.

## 3. Services

A Kubernetes **Service** is a stable virtual address in front of a changing set of pods, chosen by **label selector**. Pods come and go; the Service name and IP stay put. (Do not confuse it with a *Knative* Service — \`ksvc\` — which is a higher-level object that ends up creating several of these.)

## 4. Custom resources

Kubernetes lets anyone add new object types with a **CustomResourceDefinition** (CRD). After \`kn quickstart\`, your cluster knows about ~30 new kinds: \`services.serving.knative.dev\`, \`revisions\`, \`routes\`, \`brokers\`, \`triggers\`, \`pingsources\` and more. To \`kubectl\` they are exactly like built-in types: you can \`get\`, \`describe\`, \`edit\` and \`delete\` them.`,
    },
    {
      type: 'prose',
      md: `## 5. Controllers and the reconcile loop

A CRD on its own is inert — just a schema for storing YAML. What makes a Knative Service *do* anything is a **controller**: a program that watches objects of some kind and, whenever one changes (and periodically anyway), runs one function:

\`\`\`
reconcile(desired):
    actual = observe the world
    if actual != desired:
        create / update / delete things until it is
    write what you saw into desired.status
\`\`\`

Three properties of that loop explain most of the "surprising" behaviour you will meet:

- **It is level-triggered, not edge-triggered.** It does not replay a history of changes; it compares two states. So it recovers from anything, including its own crash, by looking again.
- **It owns what it creates.** Objects it creates carry an \`ownerReference\` back to their parent. Delete the parent and Kubernetes garbage-collects the children.
- **It undoes drift.** Delete something the desired state still implies and the next loop recreates it. In lab 03 you delete a revision the Configuration still wants — and it is back within a second.`,
    },
    {
      type: 'diagram',
      caption: 'fig 1 — one kn command, five controllers',
      height: 72,
      nodes: [
        { id: 'you', x: 2, y: 4, w: 16, h: 10, label: 'you', sub: 'kn service create' },
        { id: 'ksvc', x: 24, y: 4, w: 18, h: 10, label: 'Service', sub: 'serving.knative.dev' },
        { id: 'cfg', x: 50, y: 4, w: 18, h: 10, label: 'Configuration', sub: 'template' },
        { id: 'route', x: 76, y: 4, w: 20, h: 10, label: 'Route', sub: 'traffic table' },
        { id: 'rev', x: 50, y: 28, w: 18, h: 10, label: 'Revision', sub: 'immutable' },
        { id: 'dep', x: 24, y: 52, w: 18, h: 10, label: 'Deployment', sub: 'replicas: N' },
        { id: 'pa', x: 50, y: 52, w: 18, h: 10, label: 'PodAutoscaler', sub: 'decides N' },
        { id: 'ing', x: 76, y: 28, w: 20, h: 10, label: 'Ingress', sub: 'Kourier config' },
      ],
      edges: [
        { from: 'you', to: 'ksvc' },
        { from: 'ksvc', to: 'cfg' },
        { from: 'ksvc', to: 'route' },
        { from: 'cfg', to: 'rev' },
        { from: 'rev', to: 'dep' },
        { from: 'rev', to: 'pa' },
        { from: 'route', to: 'ing' },
      ],
      steps: [
        { caption: 'You create one object, a Knative Service. The API server stores it; nothing runs yet. A controller is watching for exactly this kind.', active: ['you', 'ksvc'], edges: ['you->ksvc'] },
        { caption: 'The service controller reconciles it into two children it owns: a Configuration (what to run) and a Route (where traffic goes).', active: ['ksvc', 'cfg', 'route'], edges: ['ksvc->cfg', 'ksvc->route'] },
        { caption: 'The configuration controller stamps the template into a Revision — an immutable snapshot, image pinned by digest. Every template change stamps a new one.', active: ['cfg', 'rev'], edges: ['cfg->rev'] },
        { caption: 'The revision controller creates plain Kubernetes machinery: a Deployment for the pods and a PodAutoscaler record the autoscaler uses to set replicas.', active: ['rev', 'dep', 'pa'], edges: ['rev->dep', 'rev->pa'] },
        { caption: 'The route controller turns the traffic table into an Ingress that net-kourier programs into Envoy. Five objects and five controllers, from one command.', active: ['route', 'ing'], edges: ['route->ing'] },
      ],
    },
    {
      type: 'code',
      filename: 'follow the owners yourself (after lab 01)',
      lang: 'bash',
      code: `kubectl get revision alice-hello-00001 \\
  -o jsonpath='{.metadata.ownerReferences[0].kind}/{.metadata.ownerReferences[0].name}{"\\n"}'
# Configuration/alice-hello
kubectl get configuration alice-hello \\
  -o jsonpath='{.metadata.ownerReferences[0].kind}/{.metadata.ownerReferences[0].name}{"\\n"}'
# Service/alice-hello`,
    },
    {
      type: 'isomorphism',
      title: 'you already run reconcile loops',
      pairs: [
        { os: 'terraform apply', osLine: 'Compares state to config and plans the difference — when you run it.', llm: 'a controller', llmLine: 'Compares actual to desired and fixes the difference — continuously, forever.' },
        { os: 'systemd Restart=always', osLine: 'A crashed process is restarted because the unit says it should run.', llm: 'ReplicaSet', llmLine: 'A deleted pod is replaced because replicas says N.' },
      ],
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'status is the controller talking back',
      md: `Every object has \`spec\` (what you asked for) and \`status\` (what the controller saw on its last pass). When something is wrong, read \`status.conditions\` before anything else — \`kubectl describe\` shows them. A Knative Service that is not Ready always says *which* child is not Ready and why.`,
    },
    {
      type: 'lab',
      lab: 'kind-knative',
      brief: 'Build the cluster every Knative lab runs on, then tour the controllers it installed — the serving controller, activator, autoscaler, Kourier, and the eventing brokers — and the 30 CRDs they brought with them.',
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'An engineer scales a Knative revision\'s Deployment to 5 with kubectl scale. A minute later it is back to 1. Why?',
          options: [
            'kubectl scale does not work on Deployments',
            'The Deployment is owned and reconciled from Knative\'s side: the autoscaler sets replicas from observed demand, and the next pass overwrites the manual change',
            'The pods crashed',
            'Kubernetes limits Deployments to 1 replica by default',
          ],
          correct: [1],
          explanation: 'Editing an object a controller owns is drift, and the loop undoes drift. To influence the count you change desired state where the controller reads it — min-scale / max-scale / target annotations on the revision template.',
        },
        {
          q: 'After deleting a Knative Service, its Configuration, Route, Revisions and Deployments disappear too. What mechanism did that?',
          options: [
            'The kn CLI deleted each object in turn',
            'Garbage collection via ownerReferences: the children were owned by the Service and are removed when it goes',
            'The Knative webhook cascades deletes',
            'A cron job cleans up orphans nightly',
          ],
          correct: [1],
          explanation: 'Kubernetes garbage-collects dependents whose owner is gone. That is also why deleting a child alone (a Revision the Configuration still wants) does not stick — the owner is still there, still wanting it.',
        },
        {
          q: 'A Service shows Ready: False. What should you read first?',
          options: [
            'The application logs',
            'status.conditions on the Service (kubectl describe), which names the child that is not Ready and the reason',
            'The node\'s kernel logs',
            'The CRD definition',
          ],
          correct: [1],
          explanation: 'Conditions are the controller reporting what it saw. They point at the failing layer — revision missing, image pull failure, ingress not reconciled — before you guess. Application logs are only useful once you know a pod actually started.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'Going deeper',
      md: `- Kubernetes docs, "Controllers" (kubernetes.io/docs/concepts/architecture/controller/) — the control-loop idea in the project's own words.
- Kubernetes docs, "Owners and Dependents" and "Garbage Collection" — the rules behind cascading deletes.
- The Knative Serving repository's \`pkg/reconciler/\` directory — each subfolder (service, configuration, revision, route, autoscaling) is one of the controllers in fig 1.`,
    },
  ],
}

export default lesson
