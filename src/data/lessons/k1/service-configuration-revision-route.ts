import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'k1.l1',
  slug: 'service-configuration-revision-route',
  trackId: 'k1',
  index: 1,
  title: 'Service, Configuration, Revision, Route',
  minutes: 16,
  hook: 'One object in, four objects out. Knative splits "what to run" from "where traffic goes" — and that split is the entire reason a rollback costs nothing.',
  exercise: 'lab+quiz',
  takeaway: {
    number: '1 → 4 objects',
    claim: 'A Knative Service is a convenience wrapper over a Configuration (which stamps immutable Revisions) and a Route (which splits traffic across them); every template change creates a Revision, and traffic moves only when the Route says so.',
  },
  blocks: [
    {
      type: 'prose',
      md: `In lab 01 you wrote one object — a Knative **Service** — and found three more in the cluster. They are not implementation noise. They are two separate ideas Knative deliberately keeps apart:

- **What code and configuration should run?** That is the **Configuration**, and every version of it is a **Revision**.
- **Which versions should receive traffic, in what proportion?** That is the **Route**.

The Service owns one of each and keeps them consistent for the common case. You can ignore the split until the day you need it — and then it is the whole feature.`,
    },
    {
      type: 'statline',
      stats: [
        { value: '4', label: 'Knative objects per Service', hint: 'Service, Configuration, Route, and one Revision per template version' },
        { value: '2', label: 'containers per revision pod', hint: 'user-container (yours) + queue-proxy (Knative)' },
        { value: '6.9 s', label: 'create → Ready', hint: 'measured on the reference cluster, including the first image pull' },
        { value: '0', label: 'fields editable on a Revision', hint: 'revisions are immutable; changes create a new one' },
      ],
    },
    {
      type: 'prose',
      md: `## Configuration → Revision

A Configuration holds a **template**: the container image, env vars, resources, annotations such as the autoscaling target. Every time that template changes, the configuration controller stamps a new **Revision** — \`<name>-00001\`, \`-00002\`, … — and never touches the old ones.

"Immutable" is stronger than it sounds. When a Revision is created, Serving resolves the image **tag** to a **digest** and records it. In lab 01 you asked for \`helloworld-go:latest\` and the Revision recorded \`helloworld-go@sha256:a97656c5…\`. Push a new \`:latest\` tomorrow and the old revision still runs the old bytes. A Revision is a snapshot of code *and* config at an instant.

Two consequences:

1. **Anything that changes the template creates a Revision** — a new image, one env var, a changed annotation. An update that changes nothing does not.
2. **Old revisions stay addressable.** They scale to zero when they get no traffic, but they are one Route edit away from serving again.`,
    },
    {
      type: 'prose',
      md: `## Route → traffic

A Route holds a **traffic table**: a list of targets, each either a named revision or "whatever is latest", with a percentage and an optional **tag**. The route controller programs that table into the ingress (Kourier here) as an actual HTTP routing rule.

By default, a Service writes a Route with one entry — \`latestRevision: true, percent: 100\` — which is why a plain update moves all traffic to the new revision as soon as it is Ready. That default is convenient and also the most dangerous line in Knative: K1.L5 is about replacing it.`,
    },
    {
      type: 'code',
      filename: 'what lab 01 left behind',
      lang: 'bash',
      code: `kubectl get ksvc alice-hello -o jsonpath='{.status.traffic}'; echo
# [{"latestRevision":true,"percent":100,"revisionName":"alice-hello-00002"}]

kn revision list -s alice-hello
# alice-hello-00002   100%   …   True
# alice-hello-00001          …   True   (Ready, no traffic, scaled to zero)`,
    },
    {
      type: 'diagram',
      caption: 'fig 1 — two independent axes',
      height: 70,
      nodes: [
        { id: 'svc', x: 38, y: 2, w: 24, h: 10, label: 'Service', sub: 'owns both' },
        { id: 'cfg', x: 6, y: 20, w: 24, h: 10, label: 'Configuration', sub: 'what to run' },
        { id: 'route', x: 70, y: 20, w: 24, h: 10, label: 'Route', sub: 'where traffic goes' },
        { id: 'r1', x: 2, y: 44, w: 14, h: 10, label: 'rev 00001', sub: 'TARGET=World' },
        { id: 'r2', x: 20, y: 44, w: 14, h: 10, label: 'rev 00002', sub: 'TARGET=alice' },
        { id: 'kour', x: 70, y: 44, w: 24, h: 10, label: 'Kourier', sub: 'Envoy routes' },
      ],
      edges: [
        { from: 'svc', to: 'cfg' },
        { from: 'svc', to: 'route' },
        { from: 'cfg', to: 'r1', label: 'stamped' },
        { from: 'cfg', to: 'r2', label: 'stamped' },
        { from: 'route', to: 'kour', label: 'programs' },
        { from: 'kour', to: 'r2', label: '100%' },
      ],
      steps: [
        { caption: 'The Service is a wrapper. Its job is to keep one Configuration and one Route in step for the everyday case of "deploy the new version".', active: ['svc'] },
        { caption: 'The Configuration owns the template. Creating the Service stamped revision 00001 from it, image pinned by digest.', active: ['svc', 'cfg', 'r1'], edges: ['svc->cfg', 'cfg->r1'] },
        { caption: 'Changing one env var changed the template, so the Configuration stamped 00002. Revision 00001 was not modified — it cannot be.', active: ['cfg', 'r2'], edges: ['cfg->r2'] },
        { caption: 'The Route decides traffic independently. Its default entry follows the latest ready revision, so 00002 got 100% once it was Ready.', active: ['svc', 'route', 'kour', 'r2'], edges: ['svc->route', 'route->kour', 'kour->r2'] },
        { caption: 'Because the axes are independent, rolling back is a Route edit pointing at 00001 — no build, no pull, no new revision. Lab 03 does exactly that.', active: ['route', 'r1'], edges: [] },
      ],
    },
    {
      type: 'prose',
      md: `## What each object is for, operationally

| object | you edit it when… | you read it when… |
|---|---|---|
| Service | almost always — it is the front door | checking overall Ready and the URL |
| Configuration | rarely directly (the Service edits it) | finding \`latestCreatedRevisionName\` vs \`latestReadyRevisionName\` — a gap means the newest revision is failing |
| Revision | never (immutable) | debugging a specific version: its image digest, its conditions, its pods |
| Route | rarely directly (the Service's \`traffic\` block edits it) | confirming what is actually receiving traffic |

The Configuration's two "latest" fields are the most useful thing on this list. If \`latestCreated\` is \`-00007\` and \`latestReady\` is \`-00006\`, your last deploy is broken and traffic is still safely on 6.`,
    },
    {
      type: 'vendor',
      snapshot: '2026-09',
      title: 'Revision naming, digest resolution and garbage collection',
      systems: ['knative'],
      sources: ['https://knative.dev/docs/serving/revisions/', 'https://knative.dev/docs/serving/architecture/'],
      md: `Observed on Knative Serving v1.23 and consistent with the docs: revisions are named \`<configuration>-<5-digit generation>\` unless you set \`spec.template.metadata.name\` (\`kn --revision-name\`); tags are resolved to digests at revision creation (\`status.containerStatuses[].imageDigest\`); and old revisions are garbage-collected by a policy in the \`config-gc\` ConfigMap rather than kept forever. The v1.23 example block documents the defaults as \`retain-since-create-time: 48h\`, \`retain-since-last-active-time: 15h\`, \`min-non-active-revisions: 20\` and \`max-non-active-revisions: 1000\` — so a revision that has not served for a day may be eligible for collection once more than 20 inactive ones exist. Check \`kubectl get cm config-gc -n knative-serving -o yaml\` on your cluster before you rely on an old revision for rollback.`,
    },
    {
      type: 'lab',
      lab: 'first-service',
      brief: 'Create a Service, change one env var, and find the Configuration, Route and both Revisions — then follow the ownerReferences and see the tag pinned to a digest.',
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'You deploy a new image and the Service stays Ready, but users still see the old behaviour. `latestCreatedRevisionName` is -00008; `latestReadyRevisionName` is -00007. What happened?',
          options: [
            'Kourier is caching the old responses',
            'Revision 00008 failed to become Ready, so the Route kept traffic on 00007 — the deploy failed safely',
            'The image tag was not updated',
            'Revisions take 10 minutes to receive traffic',
          ],
          correct: [1],
          explanation: 'The default Route follows the latest READY revision, not the latest created one. A broken revision therefore never receives traffic. The fix is in 00008\'s conditions (image pull, crash, probe), not in the Route.',
        },
        {
          q: 'Someone pushes a new image to the same :latest tag and asks why the running service did not pick it up. What do you tell them?',
          options: [
            'Knative only checks for new images every hour',
            'The Revision pinned :latest to a digest when it was created; to run the new image you must create a new Revision (an update that changes the template)',
            'You need to delete the pods so they re-pull',
            'Kourier needs a restart',
          ],
          correct: [1],
          explanation: 'Digest pinning is what makes a Revision a reproducible snapshot. Deleting pods re-creates them from the same digest, so it changes nothing. Any template change (or kn service update --image with the same tag, which kn stamps with a new timestamp annotation) creates a new Revision that resolves the tag afresh.',
        },
        {
          q: 'A risk reviewer asks: "If the new version is bad, how long does rollback take, and what can fail during it?" What is the accurate answer for Knative?',
          options: [
            'A full redeploy: rebuild, push and wait for pods — several minutes',
            'A Route edit: point traffic back at the previous Revision. No build or pull; if that revision scaled to zero, the first requests pay a cold start',
            'Instant and risk-free in all cases',
            'Rollback is not supported; you must deploy forward',
          ],
          correct: [1],
          explanation: 'The old revision still exists with its digest pinned, so rollback is only a traffic change. The honest caveat is the cold start if it scaled to zero — and the image is likely still cached on nodes, so that cold start is usually small.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'Going deeper',
      md: `- Knative Serving resource model (knative.dev/docs/serving/) — the canonical diagram of Service, Configuration, Revision, Route.
- \`kubectl explain ksvc.spec.template\` and \`kubectl explain ksvc.spec.traffic\` — the schema, straight from the CRD.
- \`config-gc\` in \`knative-serving\`: how many non-routed revisions are retained and for how long.`,
    },
  ],
}

export default lesson
