import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'k3.l4',
  slug: 'from-func-to-ksvc',
  trackId: 'k3',
  index: 4,
  title: 'From func to ksvc',
  minutes: 14,
  hook: 'Someone raised max-scale on a function by hand to survive a traffic spike. The next routine func deploy, 2.4 seconds long, quietly put it back. func.yaml is the source of truth, whether or not your team agreed to that.',
  exercise: 'read+quiz',
  takeaway: {
    number: '2.4 s to undo a hand edit',
    claim: 'func deploy regenerates the Knative Service from func.yaml — measured, it removed a hand-added env var and max-scale annotation in 2.4 s and stamped a new revision — so every setting that must survive belongs in func.yaml, including the triggers func subscribe declares.',
  },
  blocks: [
    {
      type: 'prose',
      md: `\`func\` is a client that writes ordinary Knative objects. There is no "function" resource in the cluster — only a Knative Service with three labels, and Triggers named after it. This lesson reads what \`func\` wrote, then shows the one consequence teams most often learn the hard way.`,
    },
    {
      type: 'prose',
      md: `## What func wrote

From lab 05, after one \`func deploy\`:

| where | what | why |
|---|---|---|
| Service labels | \`function.knative.dev/name\`, \`function.knative.dev/runtime\`, \`boson.dev/function: "true"\` | the only markers that this Service is "a function" |
| Service annotation | \`function.knative.dev/deployer: knative\` | which deployer owns it |
| container image | \`localhost:5001/alice-fn@sha256:…\` | pinned by digest |
| container env | \`BUILT\` (a timestamp), \`ADDRESS=0.0.0.0\`, plus your \`--env\` values | \`BUILT\` changes every build, forcing a new revision |
| \`func.yaml\` | \`registry\`, \`build.builder\`, \`run.envs\`, \`deploy.image\` (the digest), \`deploy.subscriptions\` | the record of what should exist |

\`func describe\` prints the function-shaped view of all of it — image digest, routes, readiness, and the subscriptions it found:`,
    },
    {
      type: 'code',
      filename: 'func describe (reference cluster)',
      lang: 'text',
      code: `Function name:
  alice-fn
Function is built in image:
  localhost:5001/alice-fn@sha256:4aad4c98…
Function is deployed in namespace:
  default
Routes:
  http://alice-fn.default.127.0.0.1.sslip.io
Function is ready:
  true
Subscriptions (Source, Type, Broker):
   dev.functionspace.order.created alice-broker`,
    },
    {
      type: 'prose',
      md: `## Triggers from func.yaml

\`func subscribe\` records a subscription in \`func.yaml\`; the next deploy creates the Trigger:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `func subscribe --filter type=dev.functionspace.order.retried --source alice-broker
# func.yaml now has:
#   deploy:
#     subscriptions:
#     - source: alice-broker
#       filters:
#         type: dev.functionspace.order.retried
func deploy --builder host --registry localhost:5001
kubectl get triggers | grep alice-fn
# alice-fn-function-trigger-0   alice-broker   dev.functionspace.order.retried   alice-fn`,
    },
    {
      type: 'prose',
      md: `That puts the function's inputs next to its code, which is where a reviewer wants them. Two behaviours to know, both observed on the reference cluster:

- **Removing** a subscription from \`func.yaml\` and deploying again did **not** delete its Trigger. \`alice-fn-function-trigger-0\` stayed Ready — still subscribing the function to that type — until \`func delete\` removed it. Deploy adds; it does not garbage-collect.
- \`func delete\` **did** remove that orphaned func-created trigger along with the Service — but not \`alice-price\`, a trigger created by hand with \`kn\`, which was left pointing at a function that no longer existed.`,
    },
    {
      type: 'prose',
      md: `## The rule: func.yaml wins

On the reference cluster, a hand edit was made to the running Service, then an ordinary deploy was run with no change to the project:`,
    },
    {
      type: 'code',
      filename: 'reference cluster',
      lang: 'bash',
      code: `kn service update alice-fn --env HAND_EDIT=yes --annotation autoscaling.knative.dev/max-scale=3
# env:  BUILT, PREFIX, ADDRESS, HAND_EDIT=yes      annotations: max-scale=3, …

func deploy --builder host --registry localhost:5001     # real 0m2.382s
# env:  BUILT, PREFIX, ADDRESS                     annotations: (no max-scale)
kn revision list -s alice-fn
# alice-fn-00005   100%    ← a new revision, without the hand edits`,
    },
    {
      type: 'prose',
      md: `Both edits were gone in 2.4 seconds, and a new revision took 100% of traffic. Nothing warned anyone. \`func deploy\` does not merge; it renders the Service from \`func.yaml\` and applies it.

So pick **one** source of truth per service:

- **func-managed**: every setting — env, scale bounds, resources, subscriptions — lives in \`func.yaml\` (\`func config envs add\`, \`func config labels\`, the \`deploy\`/\`run\` sections). Nobody runs \`kn service update\` on it. Emergency changes go into \`func.yaml\` and are deployed.
- **YAML-managed**: stop using \`func deploy\` for that service. Build with \`func build\`, and deploy the Service with your GitOps tooling, pinned to the digest \`func build\` produced.

Mixing the two is how a scale limit set during an incident is silently reverted by the next routine deploy.`,
    },
    {
      type: 'diagram',
      caption: 'fig 1 — two writers, one object',
      height: 62,
      nodes: [
        { id: 'fy', x: 2, y: 6, w: 20, h: 12, label: 'func.yaml', sub: 'in git' },
        { id: 'fd', x: 30, y: 6, w: 20, h: 12, label: 'func deploy', sub: 'render + apply' },
        { id: 'ksvc', x: 58, y: 22, w: 20, h: 14, label: 'ksvc', sub: 'what runs' },
        { id: 'kn', x: 30, y: 40, w: 20, h: 12, label: 'kn / kubectl', sub: 'hand edit' },
        { id: 'rev', x: 84, y: 22, w: 14, h: 14, label: 'revision', sub: 'new each time' },
      ],
      edges: [
        { from: 'fy', to: 'fd' },
        { from: 'fd', to: 'ksvc', label: 'overwrites' },
        { from: 'kn', to: 'ksvc', label: 'edits' },
        { from: 'ksvc', to: 'rev' },
      ],
      steps: [
        { caption: 'func.yaml, in the repository, describes the function: image digest, env, builder, subscriptions.', active: ['fy'] },
        { caption: 'func deploy renders a Knative Service from it and applies the whole object. It does not read what is running first.', active: ['fy', 'fd', 'ksvc'], edges: ['fy->fd', 'fd->ksvc'] },
        { caption: 'A hand edit with kn or kubectl changes the running Service directly, producing a revision that exists nowhere in git.', active: ['kn', 'ksvc', 'rev'], edges: ['kn->ksvc', 'ksvc->rev'] },
        { caption: 'The next func deploy renders from func.yaml again and the hand edit is gone — measured, in 2.4 s, with a new revision taking all traffic.', active: ['fd', 'ksvc', 'rev'], edges: ['fd->ksvc', 'ksvc->rev'] },
      ],
    },
    {
      type: 'vendor',
      snapshot: '2026-09',
      title: 'func deploy, describe and subscribe, v1.23',
      systems: ['knative-functions'],
      sources: ['https://knative.dev/docs/functions/'],
      md: `Observed with func knative-v1.23.3 on the reference cluster: \`func deploy\` replaced a hand-added env var and \`max-scale\` annotation and created a new revision; \`func describe\` listed image, routes, readiness and subscriptions; \`func subscribe --filter … --source <broker>\` wrote \`deploy.subscriptions\` and the next deploy created a Trigger named \`<function>-function-trigger-0\`. Removing a subscription from func.yaml and redeploying left its Trigger in place; \`func delete\` removed the Service and the func-created trigger but not a hand-made trigger aimed at the same function.`,
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'During an incident, on-call raised max-scale on a func-deployed service with kn service update. What must happen before the next routine deploy?',
          options: [
            'Nothing — Knative remembers the change',
            'Put the change into func.yaml (or the team\'s agreed source of truth) and commit it; otherwise func deploy will render the Service without it',
            'Delete the old revisions',
            'Restart the autoscaler',
          ],
          correct: [1],
          explanation: 'func deploy renders from func.yaml and overwrites the live Service. The measured result was a silently reverted annotation. Incident changes need to land in the source of truth the deploy reads.',
        },
        {
          q: 'A platform team uses Argo CD to manage all Knative Services from git, but developers like func for building. What is a clean split?',
          options: [
            'Let both func deploy and Argo CD manage the same Service',
            'Developers use func build (and func.yaml for build settings); the Service YAML in git, pinned to the built digest, is deployed by Argo CD — nobody runs func deploy against those services',
            'Stop using func entirely',
            'Use func deploy in production and Argo CD in staging',
          ],
          correct: [1],
          explanation: 'Two writers on one object fight. func is still useful for scaffolding and building; the deploy step belongs to one tool. The digest is the handoff.',
        },
        {
          q: 'Where should a function\'s broker subscription be declared if the team deploys with func?',
          options: [
            'In a separately applied Trigger YAML only',
            'In func.yaml via func subscribe, so the trigger is created and kept in step by func deploy alongside the code',
            'In the Broker spec',
            'Subscriptions cannot be declared with func',
          ],
          correct: [1],
          explanation: 'func subscribe writes deploy.subscriptions; func deploy creates <function>-function-trigger-N. Keeping inputs with the code makes reviews and rollbacks coherent.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'Going deeper',
      md: `- \`func.yaml\` schema: the \`$schema\` URL on its first line points at the exact JSON schema for your func version.
- \`func config --help\`: envs, labels, volumes and git settings written into func.yaml rather than onto the Service.
- \`func deploy --help\`: the \`--build\` flag (\`auto\` by default) rebuilds only when the source fingerprint changes. On the reference machine \`--build=false\` refused with \`Error: not built\` after func.yaml was edited — promote exact bytes by digest through your deploy tooling rather than by suppressing builds.`,
    },
  ],
}

export default lesson
