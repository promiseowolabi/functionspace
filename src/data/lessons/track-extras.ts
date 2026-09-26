/**
 * Track-level prose: the pitch, the outcomes, the prerequisite line and the
 * side note for each track. Hand-written, and deliberately NOT in the
 * generated manifest — a generator must never own copy.
 *
 * Split out of index.ts so the curriculum and track pages can read it without
 * importing the lesson corpus.
 */

import type { TrackId } from './types'

export interface TrackExtras {
  pitch: string
  outcomes: string[]
  requires: string
  sideNote: string
}

export const TRACK_EXTRAS: Record<TrackId, TrackExtras> = {
  f0: {
    pitch:
      '"Serverless" hides three concrete mechanisms: an image that holds your code, a contract for how events reach it, and a scaler that decides how many copies exist. This track names all three, puts a number on the cold start, and gives you just enough Kubernetes to read everything that follows.',
    outcomes: [
      'Decompose any function platform into image, event contract and scaler — and say which one a given problem lives in.',
      'Read a CloudEvent in binary and structured mode and name its four required attributes.',
      'Estimate a cold start from its parts: image pull, scheduling, container start, init, first request.',
      'Explain the reconcile loop well enough to predict what a controller does when you edit a custom resource.',
    ],
    requires: 'base of the stack · you have built and run a container',
    sideNote: '// lab 00 builds the kind cluster every Knative lab runs on',
  },
  k1: {
    pitch:
      'Knative Serving turns a container into something that scales with traffic, including down to zero. You will follow a request through the ingress, the activator and the queue-proxy into your container, watch the autoscaler react to load, and split traffic between revisions without a redeploy.',
    outcomes: [
      'Explain what a Service creates — Configuration, Revision, Route — and why revisions are immutable.',
      'Trace a request through Kourier, the activator and queue-proxy, and say when the activator leaves the path.',
      'Predict the autoscaler\'s decision from a concurrency target, the 70% utilisation factor and the stable and panic windows.',
      'Roll out a revision gradually with traffic percentages and tags, and roll it back in one command.',
    ],
    requires: 'requires F0 · the function contract',
    sideNote: '// labs 01–03 run against the kind cluster from lab 00',
  },
  k2: {
    pitch:
      'Serving answers requests. Eventing decides where events go when nobody is waiting for a response. Sources, brokers, triggers, channels and dead-letter sinks — the plumbing that lets a producer stay ignorant of every consumer.',
    outcomes: [
      'Wire a source to a sink directly and through a broker, and say what the broker buys you.',
      'Filter events with trigger attributes, and explain why filters match on CloudEvent attributes rather than on the payload.',
      'Configure retry, backoff and a dead-letter sink, and compute the worst-case time before an event is dead-lettered.',
      'Choose between the in-memory broker and a Kafka-backed one from an ordering and durability requirement.',
    ],
    requires: 'requires K1 · knative serving',
    sideNote: '// lab 04: PingSource → broker → trigger → sink, with a DLS',
  },
  k3: {
    pitch:
      'Knative Functions is the developer layer on top of Serving: `func create`, a template, a builder, and a deploy that writes a Knative Service for you. This track opens up everything the tool does so none of it is magic.',
    outcomes: [
      'Scaffold a function in a chosen language and template, and name every file the scaffold writes.',
      'Choose a builder — host, pack or s2i — and say what ends up in the image.',
      'Write a CloudEvents handler that consumes one event and returns another.',
      'Read the Knative Service `func deploy` created and change it by hand without breaking the tool.',
    ],
    requires: 'requires K1 · knative serving (K2 recommended)',
    sideNote: '// lab 05: func create → deploy → invoke',
  },
  d1: {
    pitch:
      'VAST DataEngine runs functions on the VAST cluster, next to the data the events come from. It has its own object model — functions, triggers, pipelines, topics — and its own CLI. This track makes you fluent in both, from a local build to a pipeline running on your cluster.',
    outcomes: [
      'Explain why running compute next to storage changes the event path, and what it does not change.',
      'Name every DataEngine object, the VRN that identifies it, and which of them actually cause compute to run.',
      'Configure `vastde` against a tenant and read any object with `get` and `-o json`.',
      'Write, build, run locally and invoke a function with `init(ctx)` and `handler(ctx, event)`.',
      'Create schedule and element triggers and a pipeline manifest that links them to a function.',
    ],
    requires: 'requires F0 · K1 recommended · access to a VAST cluster with DataEngine enabled',
    sideNote: '// labs 06–08 run against your own VAST tenant',
  },
  d2: {
    pitch:
      'A pipeline that runs is not a pipeline you can operate. This track goes under the object model: how the event broker carries events, what an S3 element event actually contains, how revisions roll out, where the logs, metrics and traces are — and how to write a handler that survives being called twice.',
    outcomes: [
      'Trace an S3 PUT from the bucket to your handler, and read the event the handler receives.',
      'Publish a new function revision and move a pipeline onto it deliberately.',
      'Answer "did it run, how long did it take, and why did it fail" from logs, metrics and traces.',
      'Design an idempotent handler for at-least-once delivery with retries.',
    ],
    requires: 'requires D1 · dataengine foundations',
    sideNote: '// labs 09–10: element triggers, revisions, observability',
  },
  x1: {
    pitch:
      'Two platforms, one set of ideas. This track maps DataEngine onto Knative concept by concept (and says plainly where the mapping is inferred), sizes concurrency with arithmetic instead of guesswork, and ends on the patterns that decide an architecture before a platform is chosen.',
    outcomes: [
      'Map every DataEngine object to its closest Knative concept, and name the places the analogy breaks.',
      'Size pods and concurrency from an arrival rate and a service time using Little\'s law.',
      'Explain why exactly-once is a property of the handler, not the transport.',
      'Pick between enrich-on-ingest, fan-out and inference-next-to-data from a workload description.',
    ],
    requires: 'requires K2 · D2',
    sideNote: '// then the capstone: the same function on both platforms',
  },
}
