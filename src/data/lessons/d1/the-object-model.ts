import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'd1.l2',
  slug: 'the-object-model',
  trackId: 'd1',
  index: 2,
  title: 'The Object Model',
  minutes: 16,
  hook: 'You can create a function, publish it, attach a trigger that fires every minute — and nothing runs. In DataEngine exactly one object causes compute to exist, and it is the one people create last.',
  exercise: 'read+quiz',
  takeaway: {
    number: '1 of 7 objects runs code',
    claim: 'Of the seven DataEngine object types — function, trigger, pipeline, topic, compute cluster, container registry, bucket — only a deployed pipeline puts pods on a cluster; a function is a pointer to an image and a trigger is a source of events.',
  },
  blocks: [
    {
      type: 'prose',
      md: `DataEngine is managed through the VAST Management Service (VMS), and \`vastde\` is its CLI. Everything you work with is one of seven object types. Four are **infrastructure** that an administrator links to your tenant once; three are **yours**, and you create them in every lab.`,
    },
    {
      type: 'prose',
      md: `## The infrastructure (linked once, by an administrator)

| object | what it is | read it with |
|---|---|---|
| **compute cluster** | a Kubernetes cluster linked to the tenant, where function pods run | \`vastde compute-clusters list/get\` |
| **container registry** | a registry DataEngine pulls function images from | \`vastde container-registries list/get\` |
| **topic** | a topic on an event broker (Kafka-compatible) that carries events between triggers and functions | \`vastde topics list/get\` |
| **bucket** | an S3-enabled view that element triggers can watch | \`vastde buckets list/get\` |

In lab 06 you only *read* these, and record their names in \`de.env\`. Creating them is platform work (\`compute-clusters link\`, \`container-registries link\`, \`setup-dataengine\`).

## Yours (created in every lab)

| object | what it is | what it is **not** |
|---|---|---|
| **function** | a named pointer to a container image in a registry, with numbered **revisions**; publishing makes a revision usable | a running process. Creating a function starts nothing. |
| **trigger** | a source of events: a **schedule** (cron) or an **element** trigger (object events on a bucket), publishing to a topic | the thing that runs your code |
| **pipeline** | deploys function revisions onto a compute cluster and **links** triggers to them through a topic, with resources and concurrency | optional polish — without one, nothing runs |`,
    },
    {
      type: 'diagram',
      caption: 'fig 1 — who points at whom',
      height: 76,
      nodes: [
        { id: 'reg', x: 2, y: 4, w: 22, h: 12, label: 'container registry', sub: 'infrastructure' },
        { id: 'fn', x: 2, y: 30, w: 22, h: 12, label: 'function', sub: 'image + revisions' },
        { id: 'bucket', x: 76, y: 4, w: 22, h: 12, label: 'bucket', sub: 'infrastructure' },
        { id: 'trig', x: 76, y: 30, w: 22, h: 12, label: 'trigger', sub: 'schedule / element' },
        { id: 'topic', x: 76, y: 56, w: 22, h: 12, label: 'topic', sub: 'on the broker' },
        { id: 'pipe', x: 36, y: 30, w: 28, h: 12, label: 'pipeline', sub: 'the only thing that runs' },
        { id: 'k8s', x: 36, y: 56, w: 28, h: 12, label: 'compute cluster', sub: 'pods appear here' },
      ],
      edges: [
        { from: 'fn', to: 'reg', label: 'image from' },
        { from: 'trig', to: 'bucket', label: 'watches' },
        { from: 'trig', to: 'topic', label: 'publishes to' },
        { from: 'pipe', to: 'fn', label: 'deploys revision' },
        { from: 'pipe', to: 'trig', label: 'links' },
        { from: 'pipe', to: 'k8s', label: 'onto' },
      ],
      steps: [
        { caption: 'A function names an image in a linked container registry. Creating it, even publishing it, allocates no compute.', active: ['fn', 'reg'], edges: ['fn->reg'] },
        { caption: 'A trigger is a source: an element trigger watches a bucket for object events; a schedule trigger fires on cron. Either publishes events to a topic.', active: ['trig', 'bucket', 'topic'], edges: ['trig->bucket', 'trig->topic'] },
        { caption: 'On their own, those events go nowhere useful. Only a pipeline references a function revision and a trigger together.', active: ['pipe', 'fn', 'trig'], edges: ['pipe->fn', 'pipe->trig'] },
        { caption: 'Deploying the pipeline puts the function on the compute cluster and links the trigger\'s events to it through the topic. This is the moment pods can exist.', active: ['pipe', 'k8s', 'topic'], edges: ['pipe->k8s'] },
      ],
    },
    {
      type: 'prose',
      md: `## VRNs: how objects refer to each other

Objects are addressed by **VRN** (VAST resource name) strings of the form \`vast:dataengine:<kind>:<name>\`. You will write them in pipeline manifests (D1.L6):

\`\`\`
vast:dataengine:functions:alice-echo
vast:dataengine:triggers:alice-tick
vast:dataengine:container-registries:<REGISTRY>
vast:dataengine:kubernetes-clusters:<K8S_CLUSTER>
vast:dataengine:topics:<BROKER>/<TOPIC>
\`\`\`

Do not type them from memory — including from this page. Read them back from the objects (\`vastde <kind> get <name> -o json\`) and copy. The public CLI reference's own pipeline example spells one kind in the singular (\`kubernetes-cluster\`) where the objects observed in lab 08 use the plural; the object is the authority.`,
    },
    {
      type: 'prose',
      md: `## Tenants and names

Every object lives in a **tenant**. Names are unique per kind within the tenant, and a shared tenant is exactly like a shared Kubernetes namespace: if you and a colleague both create a function called \`echo\`, one of you updates the other's. Hence the \`PREFIX\` on every object in these labs, and the rule for shared tenants: never modify an object you did not create — read it with \`get\`, learn from it, leave it alone.`,
    },
    {
      type: 'vendor',
      snapshot: '2026-09',
      title: 'DataEngine object types in vastde v5.5',
      systems: ['vast-dataengine'],
      sources: [
        'https://github.com/vast-data/dataengine-cli/blob/main/docs/references/commands/vastde.md',
        'https://github.com/vast-data/dataengine-cli/blob/main/docs/references/commands/vastde_pipelines_create.md',
        'https://github.com/vast-data/dataengine-cli/blob/main/docs/references/commands/vastde_setup-dataengine.md',
      ],
      md: `**Documented** in the public CLI reference: management commands for buckets, compute clusters, container registries, functions, pipelines, topics and triggers; \`setup-dataengine\` configures the Kafka broker, a default topic and a **dead-letter topic**; \`pipelines create --deploy\` creates and deploys in one step. **Observed**: VRNs of the form \`vast:dataengine:<kind>:<name>\`, with topics as \`<broker>/<topic>\`; creating and publishing a function does not create pods; a pipeline deploy does.`,
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'A colleague created a function and a schedule trigger an hour ago and asks why no logs have appeared. What is missing?',
          options: [
            'The function has not been published',
            'A pipeline that deploys the function and links the trigger to it — until then nothing runs',
            'The trigger needs a second function',
            'Logs take an hour to appear',
          ],
          correct: [1],
          explanation: 'Functions and triggers are declarations. Only a deployed pipeline puts pods on the compute cluster and connects events to them. Publishing matters too, but a published function with no pipeline still never runs.',
        },
        {
          q: 'Two engineers in the same tenant each create a function named "resize". What happens?',
          options: [
            'DataEngine keeps both, namespaced by user',
            'Names are unique per kind in the tenant; the second create fails or, with update, changes the first engineer\'s function',
            'The second becomes revision 2 of the first automatically, safely',
            'Tenants cannot hold two engineers',
          ],
          correct: [1],
          explanation: 'Names collide within a tenant. That is why the labs prefix every object — and why "update" on a shared name is how people break each other\'s pipelines.',
        },
        {
          q: 'Where do function pods actually run?',
          options: [
            'Inside the VAST storage processes',
            'On the Kubernetes compute cluster linked to the tenant, in the namespace the pipeline names',
            'On the machine that ran vastde',
            'In the container registry',
          ],
          correct: [1],
          explanation: 'DataEngine schedules function containers onto a linked Kubernetes cluster. "Next to the data" means on compute attached to the storage platform, not inside it (D1.L1).',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'Going deeper',
      md: `- \`vastde <kind> get <name> -o json\` on any object — the JSON is the most complete reference to what the object holds.
- The public CLI reference (\`docs/references/commands/\`) for \`compute-clusters link\`, \`container-registries link\` and \`setup-dataengine\` — the administrator side of the model.
- K1.L1 — the Knative object model, whose split between "what to run" and "where traffic goes" rhymes with function vs pipeline.`,
    },
  ],
}

export default lesson
