import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'f0.l1',
  slug: 'what-a-function-is',
  trackId: 'f0',
  index: 1,
  title: 'What a Function Is',
  minutes: 14,
  hook: '"Serverless" is a billing model and a marketing word. Underneath, every platform — Lambda, Knative, VAST DataEngine — is the same three mechanisms, and every problem you will debug lives in exactly one of them.',
  exercise: 'read+quiz',
  takeaway: {
    number: '3 mechanisms',
    claim: 'A function is an image, an event contract and a scaler; when something breaks, the first question is which of the three it is.',
  },
  blocks: [
    {
      type: 'prose',
      md: `Strip the marketing off any serverless platform and you find three mechanisms, always the same three:

1. **An image.** Your code, its dependencies and a small runtime, frozen into a container image and addressed by digest. The platform never runs "your code"; it runs a copy of this artifact.
2. **An event contract.** A fixed agreement about how work arrives: which port, which protocol, which envelope, what counts as success. On Knative and on VAST DataEngine that envelope is a **CloudEvent** over HTTP (F0.L2).
3. **A scaler.** Something that watches demand and decides how many copies of the image are running right now — including, often, **zero**.

Everything else — triggers, brokers, pipelines, revisions, routes — is plumbing that feeds the contract or informs the scaler. This course takes both platforms apart along exactly these three lines.`,
    },
    {
      type: 'statline',
      stats: [
        { value: '3', label: 'mechanisms', hint: 'image, event contract, scaler — on every platform in this course' },
        { value: '0', label: 'pods when idle', hint: 'scale-to-zero: the scaler is allowed to run no copies at all' },
        { value: '~1 s', label: 'cold start, measured', hint: 'first request after zero on the reference kind cluster, image cached (K1.L4)' },
        { value: '~10 ms', label: 'warm request, measured', hint: 'same service, same cluster, a pod already running' },
      ],
    },
    {
      type: 'prose',
      md: `## Why the split matters

When something goes wrong, the three mechanisms fail in completely different ways, and knowing which one you are looking at halves the time to a fix:

| Symptom | Mechanism | Typical cause |
|---|---|---|
| Pod never becomes Ready; \`ImagePullBackOff\` | image | wrong registry, missing credentials, tag that does not exist |
| Pod is Ready but every event returns 4xx/5xx | event contract | handler expects a field the event does not carry; wrong content type |
| First request of the morning takes seconds | scaler | the service was at zero; you paid a cold start |
| Latency climbs under load, then recovers | scaler | the autoscaler is still adding pods; you are inside its reaction window |
| Events vanish with no error anywhere | event contract | nothing subscribed to that event type; nobody was listening |

Notice that "my function is slow" appears twice, under the scaler, for two different reasons — and neither of them is in your code.`,
    },
    {
      type: 'diagram',
      caption: 'fig 1 — the three mechanisms, on any platform',
      height: 64,
      nodes: [
        { id: 'src', x: 2, y: 8, w: 18, h: 12, label: 'event source', sub: 'upload, schedule, HTTP' },
        { id: 'contract', x: 28, y: 8, w: 22, h: 12, label: 'event contract', sub: 'CloudEvent over HTTP' },
        { id: 'pods', x: 60, y: 8, w: 18, h: 12, label: 'running copies', sub: '0…N pods' },
        { id: 'image', x: 60, y: 40, w: 18, h: 12, label: 'image', sub: 'pinned by digest' },
        { id: 'scaler', x: 28, y: 40, w: 22, h: 12, label: 'scaler', sub: 'watches demand' },
        { id: 'handler', x: 84, y: 8, w: 14, h: 12, label: 'handler', sub: 'your code' },
      ],
      edges: [
        { from: 'src', to: 'contract', label: 'emits' },
        { from: 'contract', to: 'pods', label: 'delivers' },
        { from: 'pods', to: 'handler' },
        { from: 'image', to: 'pods', label: 'copies of' },
        { from: 'scaler', to: 'pods', label: 'sets N' },
        { from: 'contract', to: 'scaler', label: 'demand signal' },
      ],
      steps: [
        { caption: 'Something happens — an object lands in a bucket, a cron fires, a client calls. That is an event, and on its own it is just a fact.', active: ['src'] },
        { caption: 'The event contract turns the fact into a request your code understands: a CloudEvent, POSTed over HTTP to a known port.', active: ['src', 'contract'], edges: ['src->contract'] },
        { caption: 'The contract delivers to a running copy of the image. If there is one, this is a warm request and costs milliseconds.', active: ['contract', 'pods', 'handler'], edges: ['contract->pods', 'pods->handler'] },
        { caption: 'Every running copy is an instance of one immutable image. The platform never edits code in place; it starts more copies or stops some.', active: ['image', 'pods'], edges: ['image->pods'] },
        { caption: 'The scaler watches the demand signal — requests in flight, events waiting — and sets how many copies exist, including zero. This is where cold starts come from.', active: ['scaler', 'pods', 'contract'], edges: ['contract->scaler', 'scaler->pods'] },
      ],
    },
    {
      type: 'prose',
      md: `## The two platforms in this course, on one line each

**Knative** is the open-source version of the three mechanisms, built as Kubernetes controllers. Serving is the scaler and the request contract; Eventing delivers events to it; Functions (\`func\`) builds the image. You will run all of it on a laptop in lab 00.

**VAST DataEngine** puts the same three mechanisms *on the storage platform*: the event source is often the storage itself (an object written to a bucket), and the function runs on compute attached to the same cluster. Same three boxes, different place.`,
    },
    {
      type: 'isomorphism',
      title: 'the same three mechanisms, twice',
      pairs: [
        { os: 'image', osLine: 'Knative: a container image; Serving pins the tag to a digest per Revision.', llm: 'image', llmLine: 'DataEngine: a container image built by the vastde builder, referenced by a Function.' },
        { os: 'event contract', osLine: 'Knative: HTTP on the container port; CloudEvents for eventing.', llm: 'event contract', llmLine: 'DataEngine: init(ctx) once, handler(ctx, event) per CloudEvent.' },
        { os: 'scaler', osLine: 'Knative: the KPA autoscaler, scaling on requests in flight.', llm: 'scaler', llmLine: 'DataEngine: pipeline min/max concurrency and resources.' },
      ],
    },
    {
      type: 'callout',
      variant: 'analogy',
      title: 'It is a process manager with a network in front',
      md: `If you have run a pool of workers behind a load balancer — gunicorn behind nginx, a Java thread pool behind an ELB — you already know two of the three. The new part is the scaler owning the pool size, and being allowed to take it to zero.`,
    },
    {
      type: 'prose',
      md: `## What "serverless" does not remove

The servers are still there; you just stopped naming them. What you gave up in exchange is worth stating up front, because every lesson after this one prices one of these:

- **Cold starts.** If the scaler may choose zero, some request eventually pays to start a copy.
- **Statelessness.** Copies come and go; anything in memory can vanish between two events. State lives in storage, never in the function.
- **At-least-once delivery.** Event systems retry. Your handler will sometimes see the same event twice (X1.L3).
- **Someone else's limits.** Timeouts, concurrency caps, payload sizes — each platform's defaults, which is why they live in vendor blocks in this course.`,
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'A team reports: "Our function is broken — the first upload each morning takes 3 seconds, the rest take 40 ms." Which mechanism do you investigate first?',
          options: [
            'The handler code — something must be slow on first run',
            'The scaler — the service was at zero overnight and the first event paid a cold start',
            'The event contract — the first event must be malformed',
            'The storage — the first read is uncached',
          ],
          correct: [1],
          explanation: 'A slow first request after an idle period, then normal latency, is the signature of scale-to-zero. The handler could contribute (heavy init), but you confirm the scaler behaviour first: were there zero pods before the request? "Rewrite the handler" is the folklore answer and often changes nothing.',
        },
        {
          q: 'Which of these is part of the event contract rather than the image or the scaler?',
          options: [
            'The Python dependencies in requirements.txt',
            'The maximum number of pods',
            'The HTTP port and the CloudEvent envelope the handler receives',
            'The registry the image is pushed to',
          ],
          correct: [2],
          explanation: 'The contract is how work arrives: port, protocol, envelope, success status. Dependencies and registry belong to the image; the pod count belongs to the scaler. Mixing them up is how people "fix" a contract bug by rebuilding the image.',
        },
        {
          q: 'A product owner asks why the serverless version of a service costs less but "sometimes feels slower". What is the honest one-line answer?',
          options: [
            'It does not — serverless is always faster',
            'Because it runs zero copies when idle, and the first request after idle pays to start one',
            'Because the cloud provider throttles serverless workloads',
            'Because containers are slower than VMs',
          ],
          correct: [1],
          explanation: 'Scale-to-zero is where both the saving and the latency come from — the same decision. Stating the trade-off in one sentence is more useful in a review than denying it, and it points at the fix (a min-scale of 1 for the latency-sensitive path, at a known cost).',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'Going deeper',
      md: `- The CloudEvents specification (github.com/cloudevents/spec) — read the "Design Goals" section; it states the problem this whole course is about.
- Knative's own overview of Serving and Eventing (knative.dev/docs) — check that the three boxes above are the three things it installs.
- "Serverless Computing: One Step Forward, Two Steps Back" (Hellerstein et al., CIDR 2019) — the classic critique; read it for the limits list and compare with what Knative and DataEngine chose to fix.`,
    },
  ],
}

export default lesson
