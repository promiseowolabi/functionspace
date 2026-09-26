import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'd1.l1',
  slug: 'compute-next-to-data',
  trackId: 'd1',
  index: 1,
  title: 'Compute Next to Data',
  minutes: 14,
  hook: 'On most platforms an object upload has to leave the storage system — as a notification, then as a download — before any function can touch it. DataEngine\'s premise is that the storage system is where the event starts and where the function runs.',
  exercise: 'read+quiz',
  takeaway: {
    number: '2 hops removed',
    claim: 'An upload-driven function on a generic platform pays a notification hop out of storage and a data hop back in; DataEngine removes the platform boundary between them — but your function still reads the object over a protocol, so the data hop shrinks, it does not vanish.',
  },
  blocks: [
    {
      type: 'prose',
      md: `The Knative half of this course treated the event source as somebody else's problem: a PingSource, a producer calling \`curl\`, "some adapter" for S3. In real data pipelines the most important event source is the storage itself — *a file landed; do something with it*. How that event gets from storage to a function decides the latency, the number of systems to operate, and how many times the bytes cross a network.`,
    },
    {
      type: 'diagram',
      caption: 'fig 1 — the same "file landed" pipeline, two shapes',
      height: 76,
      nodes: [
        { id: 's3a', x: 2, y: 4, w: 18, h: 12, label: 'object store', sub: 'PUT lands' },
        { id: 'notif', x: 26, y: 4, w: 18, h: 12, label: 'notification', sub: 'webhook / queue' },
        { id: 'broker', x: 50, y: 4, w: 18, h: 12, label: 'event broker', sub: 'another system' },
        { id: 'fn', x: 74, y: 4, w: 24, h: 12, label: 'function', sub: 'downloads object' },
        { id: 'vast', x: 2, y: 46, w: 30, h: 14, label: 'VAST cluster', sub: 'storage + event broker' },
        { id: 'trig', x: 38, y: 46, w: 20, h: 14, label: 'element trigger', sub: 'on the bucket' },
        { id: 'defn', x: 64, y: 46, w: 34, h: 14, label: 'DataEngine function', sub: 'linked compute cluster' },
      ],
      edges: [
        { from: 's3a', to: 'notif' },
        { from: 'notif', to: 'broker' },
        { from: 'broker', to: 'fn' },
        { from: 'fn', to: 's3a', label: 'GET' },
        { from: 'vast', to: 'trig' },
        { from: 'trig', to: 'defn' },
        { from: 'defn', to: 'vast', label: 'read' },
      ],
      steps: [
        { caption: 'On a generic platform, the object store emits a notification to some other system — a webhook, a queue — which you have to operate and secure.', active: ['s3a', 'notif'], edges: ['s3a->notif'] },
        { caption: 'An adapter turns that into an event on a broker (a Knative broker, a Kafka topic), which finally delivers to the function: three systems before your code runs.', active: ['notif', 'broker', 'fn'], edges: ['notif->broker', 'broker->fn'] },
        { caption: 'The function then fetches the object back from the store — the data crosses the network again, often across a trust boundary.', active: ['fn', 's3a'], edges: ['fn->s3a'] },
        { caption: 'On VAST, the storage and the event broker are the same cluster. An element trigger on a bucket turns the write into an event without leaving the platform.', active: ['vast', 'trig'], edges: ['vast->trig'] },
        { caption: 'A pipeline delivers it to your function on compute linked to that cluster. The function still reads the object — over S3 or a file protocol — but from the same system, with one set of credentials and one place to observe.', active: ['trig', 'defn', 'vast'], edges: ['trig->defn', 'defn->vast'] },
      ],
    },
    {
      type: 'prose',
      md: `## What actually changes

**Fewer systems.** The notification service, the adapter and the separate broker collapse into the platform. That is fewer credentials, fewer network paths, fewer places for an event to be dropped silently (K2.L2).

**The event knows the data.** An element event carries the bucket and object key as first-class fields (D1.L4, D2.L2) and its ordering key *is* the object path — events about one object stay in order.

**One observability surface.** Triggers, pipelines, logs, metrics and traces are managed through the same control plane (VMS) and CLI.`,
    },
    {
      type: 'prose',
      md: `## What does not change

Be precise about this; it is where vendor pitches get vague.

- **Your function still runs in a container** on a Kubernetes compute cluster linked to the VAST cluster. It is not executing *inside* the storage process.
- **It still reads the object over a protocol.** The data hop is shorter and stays inside one platform; it is not zero. A function that reads a 10 GB object still moves 10 GB.
- **The three mechanisms from F0.L1 are all still there** — an image, an event contract (CloudEvents, again), and a scaler (pipeline concurrency). Everything you learned on Knative applies; D1 teaches the names.`,
    },
    {
      type: 'vendor',
      snapshot: '2026-09',
      title: 'How VAST describes DataEngine',
      systems: ['vast-dataengine'],
      sources: [
        'https://www.vastdata.com/platform/dataengine',
        'https://www.vastdata.com/blog/automation-with-vast-serverless-functions-in-dataengine',
        'https://github.com/vast-data/dataengine-cli',
      ],
      md: `**Documented** by VAST: DataEngine is "event-driven compute" that brings "intelligence directly to the data"; functions are containerised Python packaged into a container image pushed to a registry; the event broker is "compatible with the Kafka API" and "acts as the backbone for all asynchronous communication inside the platform"; triggers react to "new files, metadata changes, log messages"; "logs, metrics, and execution traces are automatically captured". The public \`vastde\` CLI manages functions, triggers, pipelines, compute clusters, container registries, buckets and topics. Performance claims on VAST's pages (e.g. latency) are VAST's own and are not measured in this course.`,
    },
    {
      type: 'callout',
      variant: 'isomorphism',
      title: 'The Knative picture, relocated',
      md: `Knative: *source → broker → trigger → service*. DataEngine: *element trigger on a bucket → event broker topic → pipeline link → function deployment*. Same shape; the difference is that the source and the broker live inside the storage platform. X1.L1 maps every object.`,
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'A vendor slide says running functions "next to the data" means "zero data movement". A function reads each uploaded 2 GB video to extract metadata. What is the accurate statement?',
          options: [
            'Correct — no bytes move',
            'The function still reads the 2 GB over a protocol from the cluster; what is removed is the notification/adapter path and the cross-platform hop, not the read itself',
            'Only the metadata moves, never the video',
            'The storage system runs the Python for you',
          ],
          correct: [1],
          explanation: 'Compute next to data shortens and simplifies the path; it does not make reads free. If your function reads the whole object, the bytes move. Saying so in a review is how you keep a design honest.',
        },
        {
          q: 'Which of these does DataEngine remove compared with S3 notifications → queue → adapter → Knative broker → function?',
          options: [
            'The need for a container image',
            'The separate notification and broker systems between the storage and the function',
            'The need for a scaler',
            'CloudEvents',
          ],
          correct: [1],
          explanation: 'Image, scaler and event contract are still there — the three mechanisms of F0.L1. The integration layer between storage and broker is what collapses into the platform.',
        },
        {
          q: 'A risk reviewer asks what new dependency a DataEngine pipeline introduces compared with a Knative one. Best answer?',
          options: [
            'None',
            'The pipeline\'s event path, control plane and observability now depend on the VAST cluster (and its linked compute cluster) rather than on separately operated components — fewer parts, but a larger shared failure domain',
            'It requires a public cloud account',
            'It depends on the kind cluster from lab 00',
          ],
          correct: [1],
          explanation: 'Consolidation cuts integration risk and concentrates it. Naming both halves of that trade is the professional answer.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'Going deeper',
      md: `- VAST's DataEngine blog posts (vastdata.com/blog) — the vendor's architecture description, to compare with what you observe in labs 06–10.
- The public CLI reference (github.com/vast-data/dataengine-cli, \`docs/references/commands/\`) — every object type and flag, straight from the tool.
- K2.L1 on sources and adapters — the moving parts DataEngine folds into the platform.`,
    },
  ],
}

export default lesson
