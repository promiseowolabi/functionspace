/**
 * Hands-on labs — metadata only. The step-by-step guides live in
 * src/data/lab-guides/<id>.ts and are loaded by the lab route alone.
 *
 * Every lab has a folder under labs/<id>/ containing a README, any manifests
 * or source it needs, and a verify.sh. The folder ships to readers as
 * public/labs/<id>.zip (scripts/pack-labs.py), because the repository itself
 * is private.
 *
 * Check ids here MUST match the `check <id>` calls in labs/<id>/verify.sh —
 * tests/labs.test.ts enforces it.
 */

import type { LabId, TrackId } from '@/data/lessons/types'

export type LabPlatform = 'kind' | 'vast'

export interface LabCheck {
  id: string
  label: string
}

export interface HandsOnLab {
  id: LabId
  /** 0-based, matches the folder order and the "lab 00" naming in lessons. */
  index: number
  title: string
  hook: string
  platform: LabPlatform
  trackId: TrackId
  /** The lesson that introduces this lab. */
  lessonId: string
  minutes: number
  /** Relative to the deploy base; resolve with asset(). */
  zip: string
  /** Labs that must be done first (their state is reused). */
  after: LabId[]
  checks: LabCheck[]
}

export const PLATFORM_LABEL: Record<LabPlatform, string> = {
  kind: 'Knative on kind',
  vast: 'VAST DataEngine',
}

export const LABS: HandsOnLab[] = [
  {
    id: 'kind-knative',
    index: 0,
    title: 'A Knative Cluster You Own',
    hook: 'kind, Knative Serving, Kourier and Eventing on your laptop in about three minutes — and a look at every controller that just started.',
    platform: 'kind',
    trackId: 'f0',
    lessonId: 'f0.l4',
    minutes: 25,
    zip: 'labs/kind-knative.zip',
    after: [],
    checks: [
      { id: 'context', label: 'kubectl points at the kind-knative cluster' },
      { id: 'serving', label: 'Knative Serving controller, activator, autoscaler and webhook are Available' },
      { id: 'kourier', label: 'Kourier gateway is Available and is the configured ingress class' },
      { id: 'eventing', label: 'Knative Eventing controller and the multi-tenant broker are Available' },
      { id: 'domain', label: 'config-domain serves routes on 127.0.0.1.sslip.io' },
    ],
  },
  {
    id: 'first-service',
    index: 1,
    title: 'One Service, Two Revisions',
    hook: 'Deploy a Knative Service, change one environment variable, and find the three objects Knative created for you — twice.',
    platform: 'kind',
    trackId: 'k1',
    lessonId: 'k1.l1',
    minutes: 30,
    zip: 'labs/first-service.zip',
    after: ['kind-knative'],
    checks: [
      { id: 'ksvc-ready', label: 'Service <prefix>-hello is Ready' },
      { id: 'two-revisions', label: 'at least two Revisions exist for it' },
      { id: 'latest-serving', label: 'the latest Revision carries 100% of traffic' },
      { id: 'responds', label: 'the Route URL answers with the updated TARGET' },
    ],
  },
  {
    id: 'autoscaling',
    index: 2,
    title: 'Load, Panic, Zero',
    hook: 'Drive a Service with `hey`, watch the pod count follow the concurrency target, then time how long it takes to disappear.',
    platform: 'kind',
    trackId: 'k1',
    lessonId: 'k1.l3',
    minutes: 45,
    zip: 'labs/autoscaling.zip',
    after: ['kind-knative'],
    checks: [
      { id: 'ksvc-ready', label: 'Service <prefix>-sleepy is Ready' },
      { id: 'target', label: 'autoscaling.knative.dev/target is set to 10' },
      { id: 'max-scale', label: 'autoscaling.knative.dev/max-scale is set to 10' },
      { id: 'results', label: 'results.env records a peak pod count and a scale-to-zero time' },
      { id: 'plausible', label: 'the recorded numbers are consistent with the configuration' },
    ],
  },
  {
    id: 'traffic-split',
    index: 3,
    title: 'Blue, Green, Eighty-Twenty',
    hook: 'Tag two revisions, send 20% of traffic to the new one, reach each directly by tag, then roll back without a redeploy.',
    platform: 'kind',
    trackId: 'k1',
    lessonId: 'k1.l5',
    minutes: 30,
    zip: 'labs/traffic-split.zip',
    after: ['kind-knative'],
    checks: [
      { id: 'ksvc-ready', label: 'Service <prefix>-rollout is Ready' },
      { id: 'tags', label: 'revisions are tagged blue and green' },
      { id: 'split', label: 'traffic is split 80 blue / 20 green' },
      { id: 'tag-urls', label: 'blue-… and green-… tag URLs each answer with their own colour' },
    ],
  },
  {
    id: 'broker-trigger',
    index: 4,
    title: 'Events With Nobody Waiting',
    hook: 'A PingSource publishes to a broker; two triggers filter by type; one sink fails on purpose so you can watch the dead-letter sink catch it.',
    platform: 'kind',
    trackId: 'k2',
    lessonId: 'k2.l2',
    minutes: 45,
    zip: 'labs/broker-trigger.zip',
    after: ['kind-knative'],
    checks: [
      { id: 'broker', label: 'Broker <prefix>-broker is Ready' },
      { id: 'source', label: 'PingSource <prefix>-ping is Ready and targets the broker' },
      { id: 'triggers', label: 'two Triggers filter on different CloudEvent types' },
      { id: 'delivered', label: 'the display sink logged a heartbeat event' },
      { id: 'dead-lettered', label: 'the dead-letter sink received an event the failing sink rejected' },
    ],
  },
  {
    id: 'knative-functions',
    index: 5,
    title: 'func, End to End',
    hook: 'Scaffold a Python CloudEvents function, build it into the kind registry, deploy it, and invoke it — then read the Service func wrote.',
    platform: 'kind',
    trackId: 'k3',
    lessonId: 'k3.l1',
    minutes: 40,
    zip: 'labs/knative-functions.zip',
    after: ['kind-knative'],
    checks: [
      { id: 'project', label: 'func.yaml exists for <prefix>-fn with the python runtime' },
      { id: 'image', label: 'the function image is in the local kind registry' },
      { id: 'ksvc-ready', label: 'Knative Service <prefix>-fn is Ready and labelled as a function' },
      { id: 'invoke', label: 'a CloudEvent sent to it returns a CloudEvent reply' },
    ],
  },
  {
    id: 'de-setup',
    index: 6,
    title: 'Point vastde at Your Tenant',
    hook: 'Write the CLI config, prove the tenant login, and inventory the compute cluster, registry, topics and buckets your labs will use.',
    platform: 'vast',
    trackId: 'd1',
    lessonId: 'd1.l3',
    minutes: 25,
    zip: 'labs/de-setup.zip',
    after: [],
    checks: [
      { id: 'cli', label: 'vastde is on PATH and reports a version' },
      { id: 'de-env', label: 'de.env defines every placeholder the DataEngine labs use' },
      { id: 'login', label: 'a tenant-scoped list call succeeds' },
      { id: 'compute', label: 'the compute cluster named in de.env is linked to the tenant' },
      { id: 'registry', label: 'the container registry named in de.env is linked to the tenant' },
      { id: 'registry-tls', label: "Docker can trust the registry's TLS certificate" },
      { id: 'docker', label: 'the Docker daemon vastde will use accepts its API and image store' },
    ],
  },
  {
    id: 'de-local-function',
    index: 7,
    title: 'Build It, Run It Here',
    hook: 'Scaffold a DataEngine function, build it with the builder image, run it in a local container and send it a CloudEvent.',
    platform: 'vast',
    trackId: 'd1',
    lessonId: 'd1.l4',
    minutes: 35,
    zip: 'labs/de-local-function.zip',
    after: ['de-setup'],
    checks: [
      { id: 'source', label: 'the function source defines init(ctx) and handler(ctx, event)' },
      { id: 'image', label: 'the local image <prefix>-echo:latest exists' },
      { id: 'localrun', label: 'the function answers on localhost:8080' },
      { id: 'invoke', label: 'a CloudEvent invoke returns HTTP 2xx' },
    ],
  },
  {
    id: 'de-schedule-pipeline',
    index: 8,
    title: 'Your First Pipeline',
    hook: 'Push the image, register the function, create a schedule trigger and a pipeline — then read your handler\'s log lines from the cluster.',
    platform: 'vast',
    trackId: 'd1',
    lessonId: 'd1.l6',
    minutes: 40,
    zip: 'labs/de-schedule-pipeline.zip',
    after: ['de-local-function'],
    checks: [
      { id: 'function', label: 'function <prefix>-echo is published' },
      { id: 'trigger', label: 'schedule trigger <prefix>-tick exists' },
      { id: 'pipeline', label: 'pipeline <prefix>-tick-pipeline is Ready' },
      { id: 'logs', label: 'pipeline logs contain a handler line' },
    ],
  },
  {
    id: 'de-element-trigger',
    index: 9,
    title: 'An Upload Is an Event',
    hook: 'Create an element trigger on a bucket, upload an object with the S3 API, and watch your function receive the object key.',
    platform: 'vast',
    trackId: 'd2',
    lessonId: 'd2.l2',
    minutes: 45,
    zip: 'labs/de-element-trigger.zip',
    after: ['de-schedule-pipeline'],
    checks: [
      { id: 'trigger', label: 'element trigger <prefix>-uploads watches ObjectCreated on the lab bucket' },
      { id: 'pipeline', label: 'pipeline <prefix>-uploads-pipeline is Ready' },
      { id: 'upload', label: 'a test object was uploaded under the <prefix>/ key prefix' },
      { id: 'observed', label: 'pipeline logs show the handler received that object key' },
    ],
  },
  {
    id: 'de-revisions-observability',
    index: 10,
    title: 'Revision 2, With Evidence',
    hook: 'Ship a second revision, move the pipeline onto it, and prove it with logs, a metric and a trace.',
    platform: 'vast',
    trackId: 'd2',
    lessonId: 'd2.l3',
    minutes: 45,
    zip: 'labs/de-revisions-observability.zip',
    after: ['de-element-trigger'],
    checks: [
      { id: 'revision', label: 'function <prefix>-echo has a published revision ≥ 2' },
      { id: 'pipeline', label: 'the uploads pipeline deploys the new revision and is Ready' },
      { id: 'logs', label: 'logs show the revision-2 handler line' },
      { id: 'telemetry', label: 'metrics or traces are retrievable for the pipeline' },
    ],
  },
]

export const labById = (id: string | undefined): HandsOnLab | undefined =>
  id ? LABS.find((l) => l.id === id) : undefined

export const labNumber = (l: HandsOnLab): string => String(l.index).padStart(2, '0')
