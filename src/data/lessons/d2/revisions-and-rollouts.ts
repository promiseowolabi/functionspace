import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'd2.l3',
  slug: 'revisions-and-rollouts',
  trackId: 'd2',
  index: 3,
  title: 'Revisions and Rollouts',
  minutes: 16,
  hook: 'Publishing revision 2 changed nothing. Updating the pipeline to revision 2 changed nothing either. Only a deploy did — and when it did, the pod name went from -00001 to -00002, exactly like a Knative revision.',
  exercise: 'lab+quiz',
  takeaway: {
    number: '3 steps to roll out',
    claim: 'A DataEngine rollout is three separate steps — publish a function revision, update the pipeline manifest to it, deploy the pipeline — and on the reference cluster only the third changed running code, stamping a new -00002 Knative revision.',
  },
  blocks: [
    {
      type: 'prose',
      md: `D1.L6 said a pipeline deployment names a function **and a revision number**. That separation is what makes rollouts deliberate: you can publish new code without running it, and choose when each pipeline moves. Lab 10 does it end to end. This lesson explains what each step changes, and the one step that is easy to miss.`,
    },
    {
      type: 'diagram',
      caption: 'fig 1 — the three steps of a DataEngine rollout',
      height: 68,
      nodes: [
        { id: 'img', x: 2, y: 26, w: 16, h: 14, label: 'image v2', sub: 'pushed' },
        { id: 'rev', x: 24, y: 26, w: 18, h: 14, label: 'revision 2', sub: 'published' },
        { id: 'man', x: 48, y: 26, w: 18, h: 14, label: 'manifest', sub: 'revision: 2' },
        { id: 'dep', x: 72, y: 6, w: 26, h: 12, label: 'deploy', sub: 'pipelines deploy' },
        { id: 'pod', x: 72, y: 44, w: 26, h: 14, label: 'pods …-00002-…', sub: 'new code runs' },
      ],
      edges: [
        { from: 'img', to: 'rev', label: 'publish' },
        { from: 'rev', to: 'man', label: 'update' },
        { from: 'man', to: 'dep' },
        { from: 'dep', to: 'pod', label: 'rolls out' },
      ],
      steps: [
        { caption: 'Push the new image, then publish it as a new revision of the function. Every pipeline is still running whatever revision it named before.', active: ['img', 'rev'], edges: ['img->rev'] },
        { caption: 'Edit the pipeline manifest to revision: 2 and run pipelines update. The stored manifest now says 2 — and on the reference cluster, uploads were still handled by revision 1.', active: ['rev', 'man'], edges: ['rev->man'] },
        { caption: 'Run pipelines deploy. Only now does the platform roll the change out to the compute cluster.', active: ['man', 'dep'], edges: ['man->dep'] },
        { caption: 'New pods appear named …-00002-deployment-…, run init with the new code, and take over. The old …-00001-… pods drain away.', active: ['dep', 'pod'], edges: ['dep->pod'] },
      ],
    },
    {
      type: 'prose',
      md: `## Step 1 — publish a revision

\`vastde functions update <name> --image-tag v2 --publish\` is the documented command. On v5.5.0-sp2 it fails with **422** \`last_published_revision_number: Extra inputs are not permitted\`, because the CLI copies that read-only field into its PUT (visible with \`--dry-run\`). The same PUT without it succeeds; lab 10 ships \`publish-revision.py\` for exactly that.

Two behaviours worth knowing: publishing a tag that matches the latest revision created **no new revision** (a no-op, like an unchanged Knative template), and a published revision is immutable — to change code you publish another.`,
    },
    {
      type: 'prose',
      md: `## Step 2 — update the manifest

Edit \`revision:\` in the pipeline YAML and \`vastde pipelines update <name> --config @pipeline.yaml\`. \`pipelines get --manifest\` confirms the stored manifest now names revision 2.

## Step 3 — deploy

On the reference cluster, the update alone did **not** change what ran. An upload right after it was handled by \`echo r1\` on a pod named \`…-00001-deployment-…\`. \`vastde pipelines deploy <name>\` rolled it out; ~15 s later the pipeline was Ready, and the next upload was handled by \`echo r2\` on a new pod:`,
    },
    {
      type: 'code',
      filename: 'function_host | message, before and after the deploy',
      lang: 'text',
      code: `alice-echo-1-<id>-00001-deployment-<hash> | echo r1: … key=alice/v2-….csv          ← after update, before deploy
alice-echo-1-<id>-00002-deployment-<hash> | echo init: … revision=2
alice-echo-1-<id>-00002-deployment-<hash> | echo r2: … key=alice/v2b-….csv         ← after deploy`,
    },
    {
      type: 'prose',
      md: `\`<service>-0000N-deployment-<replicaset>-<pod>\` is Knative Serving's pod naming (lab 01 showed \`alice-hello-00001-deployment-…\`). The deploy created **Knative revision 00002** of the Service behind the function deployment. That is live confirmation of what X1.L1 read from the installer.`,
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'Revision numbers do not line up',
      md: `Function revision 2 ran as Knative revision 00002 here only because both started at 1 and moved once. They are different counters: a pipeline deploy that changes resources but not the function would stamp a new Knative revision with the *same* function revision. Track the function revision in the manifest; treat the pod suffix as the platform's bookkeeping.`,
    },
    {
      type: 'prose',
      md: `## What is missing compared with Knative

A Knative Route can split traffic 90/10 between revisions and move it gradually (K1.L5). A DataEngine function deployment names **one** revision; a deploy replaces it. Canarying a new version means running a second deployment (or pipeline) on the new revision alongside the old one and splitting the input yourself — for example with trigger filters on different prefixes. Rolling back is the same three steps with the old revision number, which is cheap because published revisions are immutable and their images are still in the registry.`,
    },
    {
      type: 'vendor',
      snapshot: '2026-09',
      title: 'Revisions and rollouts, vastde v5.5.0-sp2',
      systems: ['vast-dataengine'],
      sources: [
        'https://github.com/vast-data/dataengine-cli/blob/main/docs/references/commands/vastde_functions_update.md',
        'https://github.com/vast-data/dataengine-cli/blob/main/docs/references/commands/vastde_pipelines_deploy.md',
      ],
      md: `**Documented**: \`functions update --publish\`, \`--revision-alias\`, \`--revision-description\`; \`pipelines update --config\`; \`pipelines deploy\`. **Observed** on the reference cluster: the 422 from \`functions update\` and its cause in the \`--dry-run\` body; a PUT without \`last_published_revision_number\` publishing revisions 2 and 3; re-publishing an unchanged tag creating no revision; \`pipelines update\` not changing the running revision until \`pipelines deploy\`; pod names moving from \`-00001-deployment-\` to \`-00002-deployment-\`.`,
    },
    {
      type: 'lab',
      lab: 'de-revisions-observability',
      brief: 'Build and publish revision 2 (and meet the 422), update the uploads pipeline to it, watch an upload still hit revision 1, then deploy and watch the pod name change.',
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'After publishing revision 2 and running pipelines update, a team reports the fix is "deployed" but the bug still occurs. What do you check first?',
          options: [
            'The image registry',
            'Whether pipelines deploy was run — on the reference cluster, update changed the stored manifest but not the running pods; the handler log line and pod name tell you which revision is serving',
            'The trigger filter',
            'The function\'s requirements.txt',
          ],
          correct: [1],
          explanation: 'Three steps, and the last one is the rollout. The log line (echo r2 vs r1) and the -0000N- pod suffix are the evidence.',
        },
        {
          q: 'You need to roll back from revision 3 to revision 2 quickly. What does that involve?',
          options: [
            'Rebuilding and re-pushing the revision 2 image',
            'Setting revision: 2 in the manifest, pipelines update, pipelines deploy — revision 2 is immutable and its image is still in the registry',
            'Deleting revision 3',
            'It is not possible',
          ],
          correct: [1],
          explanation: 'Immutable, published revisions make rollback a manifest change plus a deploy. Deleting revision 3 changes nothing that runs.',
        },
        {
          q: 'A product owner wants 10% of uploads processed by the new revision first. What is the honest answer on DataEngine?',
          options: [
            'Set traffic: 10 in the manifest',
            'A deployment runs one revision; a canary means a second deployment on the new revision and splitting the input yourself (e.g. a separate trigger on a sample prefix), not a percentage knob',
            'Use rollout-duration',
            'Publish revision 2 with --canary',
          ],
          correct: [1],
          explanation: 'Knative\'s Route split (K1.L5) is not exposed through pipelines. Saying so, and offering the prefix-based canary, is better than promising a knob that does not exist.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'Going deeper',
      md: `- \`vastde functions get <name> --with-revisions -o json\` — every revision with its tag, publish state and timestamps.
- \`vastde logs get <pipeline> -o json\` — \`resource.function_host\` and \`resource.function_revision_id\` on every record tell you exactly which revision handled an event.
- K1.L1 and K1.L5 for the Knative side of revisions and traffic.`,
    },
  ],
}

export default lesson
