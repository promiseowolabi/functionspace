/**
 * GENERATED FILE — do not edit by hand.
 *   npx tsx scripts/gen-manifest.ts
 *
 * Lesson METADATA only, as literal data with no imports of the lesson files.
 * This is what the curriculum list, the track pages and the lesson rows read,
 * so those routes cost kilobytes instead of the whole 35-lesson corpus.
 * The corpus itself is imported only by the lesson route, through
 * src/data/lessons/index.ts.
 *
 * tests/manifest.test.ts fails if this drifts from the registry.
 */

import type { ContentBlock, ExerciseKind, LabId, Takeaway, TrackId } from './types'

export interface LessonMeta {
  id: string
  slug: string
  trackId: TrackId
  index: number
  title: string
  minutes: number
  hook: string
  exercise: ExerciseKind
  /** Hands-on labs the lesson links to. */
  labs?: LabId[]
  exam?: boolean
  takeaway: Takeaway
  /** Distinct block types present, sorted. Lets a row show chips without the blocks. */
  blockKinds: ContentBlock['type'][]
}

export const LESSON_META: LessonMeta[] = [
  {
    id: "f0.l1",
    slug: "what-a-function-is",
    trackId: "f0",
    index: 1,
    title: "What a Function Is",
    minutes: 14,
    hook: "\"Serverless\" is a billing model and a marketing word. Underneath, every platform — Lambda, Knative, VAST DataEngine — is the same three mechanisms, and every problem you will debug lives in exactly one of them.",
    exercise: "read+quiz",
    takeaway: { number: "3 mechanisms", claim: "A function is an image, an event contract and a scaler; when something breaks, the first question is which of the three it is." },
    blockKinds: ["callout", "deepdive", "diagram", "isomorphism", "prose", "quiz", "statline"],
  },
  {
    id: "f0.l2",
    slug: "cloudevents-the-envelope",
    trackId: "f0",
    index: 2,
    title: "CloudEvents, the Envelope",
    minutes: 15,
    hook: "Four required attributes, two ways to put them on the wire, and one pair of them — source and id — that is the only honest deduplication key you will ever get.",
    exercise: "read+quiz",
    takeaway: { number: "4 required attributes", claim: "Every CloudEvent carries id, source, specversion and type; routing reads type, and source + id together are the event's identity for deduplication." },
    blockKinds: ["callout", "code", "deepdive", "diagram", "isomorphism", "prose", "quiz", "vendor"],
  },
  {
    id: "f0.l3",
    slug: "cold-start-arithmetic",
    trackId: "f0",
    index: 3,
    title: "Cold Start Arithmetic",
    minutes: 16,
    hook: "A cold start is not one number. It is five terms added together, and the biggest one — pulling the image — is usually the one you chose when you picked a builder.",
    exercise: "read+quiz",
    takeaway: { number: "~1 s vs ~10 ms", claim: "On the reference cluster a cold request took about a second with the image already cached and a warm one about ten milliseconds; an uncached image adds its pull time on top, and that term scales with image size." },
    blockKinds: ["callout", "deepdive", "diagram", "prose", "quiz", "statline"],
  },
  {
    id: "f0.l4",
    slug: "kubernetes-for-functions",
    trackId: "f0",
    index: 4,
    title: "Kubernetes for Functions",
    minutes: 18,
    hook: "You need five Kubernetes ideas to read everything that follows — and the most important one is not a resource at all. It is a loop that never stops comparing what you asked for with what exists.",
    exercise: "lab+quiz",
    labs: ["kind-knative"],
    takeaway: { number: "1 loop", claim: "Every Knative object is desired state reconciled by a controller loop; you change a platform by editing desired state, and anything you delete that the desired state still implies comes straight back." },
    blockKinds: ["callout", "code", "deepdive", "diagram", "isomorphism", "lab", "prose", "quiz"],
  },
  {
    id: "k1.l1",
    slug: "service-configuration-revision-route",
    trackId: "k1",
    index: 1,
    title: "Service, Configuration, Revision, Route",
    minutes: 16,
    hook: "One object in, four objects out. Knative splits \"what to run\" from \"where traffic goes\" — and that split is the entire reason a rollback costs nothing.",
    exercise: "lab+quiz",
    labs: ["first-service"],
    takeaway: { number: "1 → 4 objects", claim: "A Knative Service is a convenience wrapper over a Configuration (which stamps immutable Revisions) and a Route (which splits traffic across them); every template change creates a Revision, and traffic moves only when the Route says so." },
    blockKinds: ["code", "deepdive", "diagram", "lab", "prose", "quiz", "statline", "vendor"],
  },
  {
    id: "k1.l2",
    slug: "the-request-path",
    trackId: "k1",
    index: 2,
    title: "The Request Path",
    minutes: 18,
    hook: "Your request passes through Envoy, maybe the activator, and always a sidecar before it reaches your code. Whether the activator is in the path is decided by one number most people have never heard of: 211.",
    exercise: "read+quiz",
    takeaway: { number: "211", claim: "With default settings the activator stays in the request path until a revision's spare capacity exceeds a target burst capacity of 211 concurrent requests — so on small services every request takes the extra hop, by design." },
    blockKinds: ["callout", "code", "deepdive", "diagram", "prose", "quiz", "vendor"],
  },
  {
    id: "k1.l3",
    slug: "the-autoscaler",
    trackId: "k1",
    index: 3,
    title: "The Autoscaler",
    minutes: 20,
    hook: "You asked for 10 requests per pod and got pods sized for 7. Fifty requests in flight became exactly 8 pods in under ten seconds. Every one of those numbers is arithmetic you can do before you deploy.",
    exercise: "lab+quiz",
    labs: ["autoscaling"],
    takeaway: { number: "⌈50 ÷ 7⌉ = 8", claim: "The KPA sizes each pod at target × 70%, so desired pods = ⌈concurrency ÷ (target × 0.7)⌉ — measured 8 pods for 50 in flight and 3 for 20 — and it reacts on a 6-second panic window, not the 60-second stable one, when load doubles." },
    blockKinds: ["callout", "code", "deepdive", "diagram", "lab", "prose", "quiz", "statline", "vendor"],
  },
  {
    id: "k1.l4",
    slug: "scale-to-zero",
    trackId: "k1",
    index: 4,
    title: "Scale to Zero",
    minutes: 17,
    hook: "The last pod disappeared 89 to 92 seconds after the last request, run after run. That is not a timeout anyone chose — it is two windows added together, and each one is a knob with a price.",
    exercise: "lab+quiz",
    labs: ["autoscaling"],
    takeaway: { number: "60 + 30 ≈ 90 s", claim: "An idle revision reaches zero after the 60 s stable window says \"no demand\" plus the 30 s scale-to-zero grace period — measured 89–92 s — and every knob that shortens or lengthens that trades idle cost against cold starts." },
    blockKinds: ["callout", "deepdive", "diagram", "isomorphism", "lab", "prose", "quiz", "statline", "vendor"],
  },
  {
    id: "k1.l5",
    slug: "traffic-and-rollouts",
    trackId: "k1",
    index: 5,
    title: "Traffic and Rollouts",
    minutes: 17,
    hook: "A rollout in Knative is an edit to a table of percentages. The table can follow \"latest\" automatically, pin named revisions, give each one its own URL, or walk from 0 to 100% over sixty seconds on its own.",
    exercise: "lab+quiz",
    labs: ["traffic-split"],
    takeaway: { number: "7 → 27 → 55 → 87 → 100%", claim: "With rollout-duration set to 60 s, the new revision's share was measured at 7%, 27%, 55% and 87% at 5, 15, 30 and 45 seconds and 100% by 70 — a canary without a controller — while named traffic targets never move on their own." },
    blockKinds: ["code", "deepdive", "diagram", "lab", "prose", "quiz", "vendor"],
  },
  {
    id: "k1.l6",
    slug: "tuning-a-service",
    trackId: "k1",
    index: 6,
    title: "Tuning a Service",
    minutes: 16,
    hook: "Out of the box your container has no CPU or memory request at all, a 300-second timeout, and no concurrency limit. Those three defaults are fine for a demo and wrong for almost every production function.",
    exercise: "read+quiz",
    takeaway: { number: "0 requests, 300 s, ∞", claim: "A default Knative revision runs your container with no resource requests, a 300 s request timeout and unlimited per-pod concurrency; a production service sets all three deliberately — and the error you get when the timeout fires is a 504 from the activator, not from your code." },
    blockKinds: ["callout", "code", "deepdive", "prose", "quiz", "statline", "vendor"],
  },
  {
    id: "k2.l1",
    slug: "sources-sinks-addressables",
    trackId: "k2",
    index: 1,
    title: "Sources, Sinks, Addressables",
    minutes: 14,
    hook: "Knative Eventing has one idea underneath all its object types: anything with a URL in its status can receive events, and anything with a sink field can send them. Everything else is composition.",
    exercise: "read+quiz",
    takeaway: { number: "1 field: status.address.url", claim: "An Addressable is any object that publishes status.address.url; a source is anything that POSTs CloudEvents to a sink it resolves to such a URL — so sources, brokers, channels and services compose without knowing each other's types." },
    blockKinds: ["callout", "code", "deepdive", "diagram", "isomorphism", "prose", "quiz"],
  },
  {
    id: "k2.l2",
    slug: "broker-and-trigger",
    trackId: "k2",
    index: 2,
    title: "Broker and Trigger",
    minutes: 18,
    hook: "A broker is not a process you run — every broker in the cluster shares one ingress and one filter deployment. A trigger is a filter plus a subscriber, and one event can match any number of them.",
    exercise: "lab+quiz",
    labs: ["broker-trigger"],
    takeaway: { number: "202 ≠ processed", claim: "A 202 from the broker never means an event was processed — a dead-lettered event still gets one — and on the default in-memory broker it is not even immediate: measured 3.03 s when one trigger was retrying, 5 ms when no trigger matched." },
    blockKinds: ["callout", "code", "deepdive", "diagram", "lab", "prose", "quiz", "statline", "vendor"],
  },
  {
    id: "k2.l3",
    slug: "channels-and-subscriptions",
    trackId: "k2",
    index: 3,
    title: "Channels and Subscriptions",
    minutes: 14,
    hook: "Under every broker in lab 04 was a channel you never created and a subscription per trigger. The default channel keeps events in memory — so the durability of your whole event system is one ConfigMap line, and a graceful restart will hide that from you.",
    exercise: "read+quiz",
    takeaway: { number: "0 bytes on disk", claim: "The default InMemoryChannel keeps undelivered events only in the dispatcher's memory, so a crash or node loss loses them; the channel implementation, not the Broker API, decides whether your events are durable." },
    blockKinds: ["callout", "code", "deepdive", "diagram", "isomorphism", "prose", "quiz", "vendor"],
  },
  {
    id: "k2.l4",
    slug: "delivery-and-dead-letters",
    trackId: "k2",
    index: 4,
    title: "Delivery and Dead Letters",
    minutes: 18,
    hook: "With the defaults on the reference cluster, a failing subscriber is retried 10 times over about 205 seconds — and then the event is simply dropped, because nobody configured a dead-letter sink.",
    exercise: "lab+quiz",
    labs: ["broker-trigger"],
    takeaway: { number: "10 retries ≈ 205 s", claim: "The default broker delivery policy retries 10 times with exponential backoff from 0.2 s — 0.2 × (2¹⁰ − 1) ≈ 205 s of retrying — and without a dead-letter sink the event is then gone; a 400 is not retried at all, while 404, 429 and 5xx are." },
    blockKinds: ["code", "deepdive", "diagram", "lab", "prose", "quiz", "statline", "vendor"],
  },
  {
    id: "k2.l5",
    slug: "kafka-backed-eventing",
    trackId: "k2",
    index: 5,
    title: "Kafka-Backed Eventing",
    minutes: 17,
    hook: "Swap the channel for a Kafka topic and the Broker API does not change at all — but now events survive a crash, can be replayed, and can be delivered in order. Ordering costs you something most people only notice in production.",
    exercise: "read+quiz",
    takeaway: { number: "1 partition = 1 in flight", claim: "An ordered Kafka-backed trigger blocks each partition until the subscriber succeeds, so throughput per partition is bounded by 1 ÷ handler latency — at 200 ms that is 5 events/s per partition, however many pods you run." },
    blockKinds: ["callout", "deepdive", "diagram", "prose", "quiz", "vendor"],
  },
  {
    id: "k2.l6",
    slug: "replies-sequences-parallel",
    trackId: "k2",
    index: 6,
    title: "Replies, Sequences, Parallel",
    minutes: 17,
    hook: "A function that answers an event emits a new one. That is how you build pipelines without a workflow engine — and how, on the reference cluster, one order turned into 255 hops before the broker's TTL stopped it.",
    exercise: "read+quiz",
    takeaway: { number: "255 hops", claim: "A subscriber's reply becomes a new event on the broker; a reply that matches its own trigger loops until the knativebrokerttl extension (255) runs out — measured 255 hops — so every reply type must be distinct from every type its producer consumes." },
    blockKinds: ["callout", "code", "deepdive", "diagram", "prose", "quiz", "vendor"],
  },
  {
    id: "k3.l1",
    slug: "func-create",
    trackId: "k3",
    index: 1,
    title: "func create",
    minutes: 14,
    hook: "Seven languages, two templates each, and one decision that matters more than the language: does your function answer HTTP requests, or consume CloudEvents?",
    exercise: "lab+quiz",
    labs: ["knative-functions"],
    takeaway: { number: "7 × 2 = 14 templates", claim: "func ships 7 languages × 2 templates (http, cloudevents); the template fixes the contract your code implements, and func.yaml — not the cluster — is the record of what the function is and where it was deployed." },
    blockKinds: ["code", "deepdive", "isomorphism", "lab", "prose", "quiz", "vendor"],
  },
  {
    id: "k3.l2",
    slug: "builders",
    trackId: "k3",
    index: 2,
    title: "Builders",
    minutes: 15,
    hook: "The same 50-line Python function, built three ways: 18 seconds or four minutes, a 50 MB image or a 1.4 GB one — and Python 3.14 or Python 3.11, depending only on a flag you may never have set.",
    exercise: "read+quiz",
    takeaway: { number: "18 s vs 239 s", claim: "On the reference machine the host builder built the lab 05 function in 18 s and pack in 239 s cold, and s2i shipped a different Python (3.11) from the other two (3.14) — the builder decides your image size, your cold-start pull and your runtime version." },
    blockKinds: ["callout", "deepdive", "diagram", "prose", "quiz", "vendor"],
  },
  {
    id: "k3.l3",
    slug: "cloudevent-functions",
    trackId: "k3",
    index: 3,
    title: "CloudEvent Functions",
    minutes: 17,
    hook: "Your handler's HTTP status is its vote on whether the platform should retry. Raise the wrong exception in func-python 0.8.1 and a bad event you meant to reject comes back as a 500 — and gets retried.",
    exercise: "read+quiz",
    takeaway: { number: "400 vs 500", claim: "In a CloudEvent function the status code is the retry decision: reply with an explicit 400 (send.structured(event, 400)) for events that can never succeed, an explicit 204 when there is nothing to reply, and let genuine faults surface as 500 — measured, both a ValueError and a silent return became 500s in func-python 0.8.1." },
    blockKinds: ["callout", "code", "deepdive", "diagram", "prose", "quiz", "vendor"],
  },
  {
    id: "k3.l4",
    slug: "from-func-to-ksvc",
    trackId: "k3",
    index: 4,
    title: "From func to ksvc",
    minutes: 14,
    hook: "Someone raised max-scale on a function by hand to survive a traffic spike. The next routine func deploy, 2.4 seconds long, quietly put it back. func.yaml is the source of truth, whether or not your team agreed to that.",
    exercise: "read+quiz",
    takeaway: { number: "2.4 s to undo a hand edit", claim: "func deploy regenerates the Knative Service from func.yaml — measured, it removed a hand-added env var and max-scale annotation in 2.4 s and stamped a new revision — so every setting that must survive belongs in func.yaml, including the triggers func subscribe declares." },
    blockKinds: ["code", "deepdive", "diagram", "prose", "quiz", "vendor"],
  },
  {
    id: "d1.l1",
    slug: "compute-next-to-data",
    trackId: "d1",
    index: 1,
    title: "Compute Next to Data",
    minutes: 14,
    hook: "On most platforms an object upload has to leave the storage system — as a notification, then as a download — before any function can touch it. DataEngine's premise is that the storage system is where the event starts and where the function runs.",
    exercise: "read+quiz",
    takeaway: { number: "2 hops removed", claim: "An upload-driven function on a generic platform pays a notification hop out of storage and a data hop back in; DataEngine removes the platform boundary between them — but your function still reads the object over a protocol, so the data hop shrinks, it does not vanish." },
    blockKinds: ["callout", "deepdive", "diagram", "prose", "quiz", "vendor"],
  },
  {
    id: "d1.l2",
    slug: "the-object-model",
    trackId: "d1",
    index: 2,
    title: "The Object Model",
    minutes: 16,
    hook: "You can create a function, publish it, attach a trigger that fires every minute — and nothing runs. In DataEngine exactly one object causes compute to exist, and it is the one people create last.",
    exercise: "read+quiz",
    takeaway: { number: "1 of 7 objects runs code", claim: "Of the seven DataEngine object types — function, trigger, pipeline, topic, compute cluster, container registry, bucket — only a deployed pipeline puts pods on a cluster; a function is a pointer to an image and a trigger is a source of events." },
    blockKinds: ["deepdive", "diagram", "prose", "quiz", "vendor"],
  },
  {
    id: "d1.l3",
    slug: "the-vastde-cli",
    trackId: "d1",
    index: 3,
    title: "The vastde CLI",
    minutes: 14,
    hook: "The CLI's own README tells you to pass --tenant and edit ~/.vastde/config.yaml. The v5.5 binary rejects the flag and ignores the file. Trust the binary, and learn the three commands that tell you what it is really doing.",
    exercise: "lab+quiz",
    labs: ["de-setup"],
    takeaway: { number: "0 --tenant flags", claim: "vastde v5.5 scopes every call to the tenant in ~/.vast/config.toml (or VAST_TENANT) — there is no --tenant flag despite the README — and \"config view\", \"-o json\" and \"-v 5\" are how you confirm what it will do before it does it." },
    blockKinds: ["callout", "code", "deepdive", "lab", "prose", "quiz", "vendor"],
  },
  {
    id: "d1.l4",
    slug: "the-function-runtime",
    trackId: "d1",
    index: 4,
    title: "The Function Runtime",
    minutes: 20,
    hook: "Your DataEngine handler returned a dict and the caller got 204 No Content. The return value did not vanish — it went somewhere else, if anywhere was configured. Everything about the runtime makes sense once you see where.",
    exercise: "lab+quiz",
    labs: ["de-local-function"],
    takeaway: { number: "204", claim: "The DataEngine runtime answers every successfully handled event with 204 and delivers the handler's return value, as a new CloudEvent reusing the input id, only to a configured sink (K_SINK); exceptions become 500." },
    blockKinds: ["callout", "code", "deepdive", "diagram", "lab", "prose", "quiz", "statline", "vendor"],
  },
  {
    id: "d1.l5",
    slug: "triggers",
    trackId: "d1",
    index: 5,
    title: "Triggers",
    minutes: 15,
    hook: "A DataEngine trigger does exactly one thing: turn something happening on the cluster into CloudEvents on a topic. Two kinds, four object events, and prefix and suffix filters that decide how much of your bucket wakes your function up.",
    exercise: "read+quiz",
    takeaway: { number: "2 kinds, 4 events", claim: "DataEngine has schedule triggers (cron) and element triggers (ObjectCreated, ObjectRemoved, ObjectTagging:Put, ObjectTagging:Delete on one bucket), filtered by name and tag prefix/suffix — and every event a filter lets through is one handler invocation you pay for." },
    blockKinds: ["callout", "code", "deepdive", "diagram", "prose", "quiz", "vendor"],
  },
  {
    id: "d1.l6",
    slug: "pipelines",
    trackId: "d1",
    index: 6,
    title: "Pipelines",
    minutes: 18,
    hook: "A pipeline manifest is three lists — what to deploy, what triggers exist, and which events go where — plus the knobs that decide how many copies of your function run and how long each may take.",
    exercise: "lab+quiz",
    labs: ["de-schedule-pipeline"],
    takeaway: { number: "3 lists", claim: "A DataEngine pipeline manifest is function_deployments (which revision, with what resources and min/max concurrency), triggers, and links (trigger → deployment over a topic, with ordering and retries); deploying it is the only step that creates compute." },
    blockKinds: ["callout", "code", "deepdive", "diagram", "lab", "prose", "quiz", "vendor"],
  },
  {
    id: "d2.l1",
    slug: "the-event-broker",
    trackId: "d2",
    index: 1,
    title: "The Event Broker",
    minutes: 15,
    hook: "DataEngine's event broker speaks the Kafka API and lives on the VAST cluster as a view — the same kind of object as a bucket. Every trigger publishes into it, every pipeline link reads from it, and its partition key decides what stays in order.",
    exercise: "read+quiz",
    takeaway: { number: "1 object = 1 partition key", claim: "DataEngine carries events on a Kafka-compatible broker hosted on the VAST cluster; an element event's partition key is its bucket/object path, so events about one object stay ordered while different objects spread across partitions — the K2.L5 model, applied." },
    blockKinds: ["deepdive", "diagram", "isomorphism", "prose", "quiz", "vendor"],
  },
  {
    id: "d2.l2",
    slug: "element-triggers-end-to-end",
    trackId: "d2",
    index: 2,
    title: "Element Triggers, End to End",
    minutes: 16,
    hook: "You subscribe to ObjectCreated, the CLI's test events say Element.ObjectCreated, and the cluster sends Element.ElementCreated. One upload, followed from the S3 PUT to your handler, shows every name and field that actually crosses the wire.",
    exercise: "lab+quiz",
    labs: ["de-element-trigger"],
    takeaway: { number: "0 events outside the prefix", claim: "An S3 PUT under a trigger's prefix produced exactly one vastdata.com:Element.ElementCreated event carrying the bucket and key in elementpath, and a PUT outside the prefix produced none — so the trigger filter, not your handler, is where unwanted objects should die." },
    blockKinds: ["callout", "code", "deepdive", "diagram", "lab", "prose", "quiz", "vendor"],
  },
  {
    id: "d2.l3",
    slug: "revisions-and-rollouts",
    trackId: "d2",
    index: 3,
    title: "Revisions and Rollouts",
    minutes: 16,
    hook: "Publishing revision 2 changed nothing. Updating the pipeline to revision 2 changed nothing either. Only a deploy did — and when it did, the pod name went from -00001 to -00002, exactly like a Knative revision.",
    exercise: "lab+quiz",
    labs: ["de-revisions-observability"],
    takeaway: { number: "3 steps to roll out", claim: "A DataEngine rollout is three separate steps — publish a function revision, update the pipeline manifest to it, deploy the pipeline — and on the reference cluster only the third changed running code, stamping a new -00002 Knative revision." },
    blockKinds: ["callout", "code", "deepdive", "diagram", "lab", "prose", "quiz", "vendor"],
  },
  {
    id: "d2.l4",
    slug: "observability",
    trackId: "d2",
    index: 4,
    title: "Observability",
    minutes: 17,
    hook: "vastde logs returned exactly 100 lines — the oldest 100 in the window — so the event you were looking for was not there. The scope the help text told you to filter on matched nothing. Telemetry is only evidence once you know how the tools lie.",
    exercise: "lab+quiz",
    labs: ["de-revisions-observability"],
    takeaway: { number: "100 records, oldest first", claim: "DataEngine answers \"did it run, how long, why did it fail\" with logs, traces and four runtime metrics — but vastde logs defaults to 100 records oldest-first, --scope runtime matches nothing (the value is vast-runtime), and trace durations are labelled µs when they are ms." },
    blockKinds: ["callout", "code", "deepdive", "diagram", "lab", "prose", "quiz", "statline", "vendor"],
  },
  {
    id: "d2.l5",
    slug: "failure-retries-idempotency",
    trackId: "d2",
    index: 5,
    title: "Failure, Retries, Idempotency",
    minutes: 16,
    hook: "A handler that raised on purpose ran four times in fourteen seconds — 2, 4 and 8 seconds apart — with the same event id every time. If that handler had written a row before it raised, you would now have four rows.",
    exercise: "read+quiz",
    takeaway: { number: "4 attempts: +2 s, +4 s, +8 s", claim: "With retries: 3 on the link, a failing DataEngine handler ran 4 times with exponential backoff from 2 s and the same event id each time — so every side effect must be keyed on something stable (event id, or bucket/key/version) to survive redelivery." },
    blockKinds: ["callout", "code", "deepdive", "diagram", "prose", "quiz", "statline", "vendor"],
  },
  {
    id: "x1.l1",
    slug: "the-mapping",
    trackId: "x1",
    index: 1,
    title: "The Mapping",
    minutes: 18,
    hook: "The DataEngine runtime reads K_SINK, answers Knative queue-proxy's HTTP/2 probe, and the installer embedded in the public CLI ships the Knative Operator and grants DataEngine's controller the right to create Knative Services, Brokers, Triggers and SinkBindings. Nobody has to tell you what is underneath — the artefacts do.",
    exercise: "read+quiz",
    takeaway: { number: "7 objects, 7 cousins", claim: "Every DataEngine object has a Knative cousin, and the public artefacts show why: the v5.5 installer ships the Knative Operator (v1.20) and lets the DataEngine controller create Knative Services, Brokers, Triggers and SinkBindings, and the runtime reads K_SINK — so K1 and K2 are the model of the plumbing, confirmed on your own cluster with kubectl rather than assumed." },
    blockKinds: ["callout", "code", "deepdive", "diagram", "isomorphism", "prose", "quiz", "vendor"],
  },
  {
    id: "x1.l2",
    slug: "sizing-concurrency",
    trackId: "x1",
    index: 2,
    title: "Sizing Concurrency",
    minutes: 16,
    hook: "Lab 02 predicted 481 requests per second from two numbers before fortio measured 480.85. The same one-line law sizes a DataEngine pipeline's max_concurrency, a Knative target, and the bill.",
    exercise: "read+quiz",
    takeaway: { number: "481 vs 480.85 req/s", claim: "Concurrency in flight equals arrival rate times time in the system — 50 in flight at 0.104 s gave 481/s predicted and 480.85/s measured — so the copies you need are ⌈λ × W ÷ per-copy concurrency⌉, sized on the burst rate and the slow percentile, not the averages." },
    blockKinds: ["callout", "deepdive", "diagram", "prose", "quiz", "statline"],
  },
  {
    id: "x1.l3",
    slug: "exactly-once-is-a-design",
    trackId: "x1",
    index: 3,
    title: "Exactly-Once Is a Design",
    minutes: 15,
    hook: "Knative redelivered a failing event 3 times; DataEngine redelivered one 4 times. Neither platform promised otherwise. \"Exactly once\" is not a setting you find — it is a property you build into the handler, and it costs one stable key.",
    exercise: "read+quiz",
    takeaway: { number: "3 and 4 deliveries", claim: "Both platforms deliver at least once — measured, 3 attempts on Knative (retry: 2) and 4 on DataEngine (retries: 3), same event id each time — so exactly-once effects come from idempotent handlers keyed on source + id or on the object, never from the transport." },
    blockKinds: ["callout", "deepdive", "diagram", "isomorphism", "prose", "quiz"],
  },
  {
    id: "x1.l4",
    slug: "architecture-patterns",
    trackId: "x1",
    index: 4,
    title: "Architecture Patterns",
    minutes: 17,
    hook: "Four patterns cover almost every event-driven data design you will be asked to review. Pick the pattern first; the platform choice usually falls out of where the events start and where the data lives.",
    exercise: "read+quiz",
    takeaway: { number: "4 patterns, 2 questions", claim: "Enrich-on-ingest, fan-out, inference-next-to-data and scheduled sweeps cover most event-driven data designs; choose between Knative and DataEngine by asking where the event originates and where the bytes live — and name what each choice costs." },
    blockKinds: ["callout", "deepdive", "diagram", "prose", "quiz"],
  },
]

export const TOTAL_LESSON_COUNT = LESSON_META.length

/** Canonical ids in curriculum order. */
export const ORDERED_LESSON_IDS: string[] = LESSON_META.map((l) => l.id)

const byId = new Map<string, LessonMeta>()
for (const l of LESSON_META) {
  byId.set(l.id, l)
  byId.set(l.slug, l)
}

/** Resolve metadata by canonical id (`k1.l1`) or slug. */
export const lessonMeta = (idOrSlug: string | undefined): LessonMeta | undefined =>
  idOrSlug ? byId.get(idOrSlug) : undefined

export const metaForTrack = (trackId: string): LessonMeta[] =>
  LESSON_META.filter((l) => l.trackId === trackId)

/** Route helper — canonical lesson URL. */
export const lessonPath = (l: { id: string }) => `/lesson/${l.id}`

/** Every takeaway, in curriculum order. This list is the real syllabus. */
export const takeaways = (): { id: string; title: string; number: string; claim: string }[] =>
  LESSON_META.map((l) => ({
    id: l.id,
    title: l.title,
    number: l.takeaway.number,
    claim: l.takeaway.claim,
  }))

export const nextMeta = (l: LessonMeta): LessonMeta | undefined =>
  LESSON_META[LESSON_META.findIndex((x) => x.id === l.id) + 1]

export const prevMeta = (l: LessonMeta): LessonMeta | undefined => {
  const i = LESSON_META.findIndex((x) => x.id === l.id)
  return i > 0 ? LESSON_META[i - 1] : undefined
}
