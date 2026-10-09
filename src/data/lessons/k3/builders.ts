import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'k3.l2',
  slug: 'builders',
  trackId: 'k3',
  index: 2,
  title: 'Builders',
  minutes: 15,
  hook: 'The same 50-line Python function, built three ways: 18 seconds or four minutes, a 50 MB image or a 1.4 GB one — and Python 3.14 or Python 3.11, depending only on a flag you may never have set.',
  exercise: 'read+quiz',
  takeaway: {
    number: '18 s vs 239 s',
    claim: 'On the reference machine the host builder built the lab 05 function in 18 s and pack in 239 s cold, and s2i shipped a different Python (3.11) from the other two (3.14) — the builder decides your image size, your cold-start pull and your runtime version.',
  },
  blocks: [
    {
      type: 'prose',
      md: `\`func\` turns source into an image with a **builder**. You choose it with \`--builder\` (or \`build.builder\` in \`func.yaml\`), and the default is not the fastest. The builder is the one decision in \`func\` that reaches all three mechanisms from F0.L1: it produces the **image**, it sets the runtime that implements the **contract**, and its output size lands in every cold start the **scaler** causes.`,
    },
    {
      type: 'prose',
      md: `## The three builders

- **host** — builds on your machine without a builder image: it lays your code and its dependencies onto a slim language base image and pushes the result. Fast; your machine does the work.
- **pack** (default) — Cloud Native Buildpacks. A builder image inspects the project, picks buildpacks, installs the runtime and dependencies in layers, and produces a reproducible image on a standard stack.
- **s2i** — Source-to-Image, the OpenShift approach. A language builder image (Red Hat UBI based) assembles your source into a runnable image.`,
    },
    {
      type: 'prose',
      md: `## Measured, same function, same machine

The lab 05 pricing function, built with each builder on the reference machine:

| builder | build time | image size | base | Python |
|---|---|---|---|---|
| host | **18 s** | **50.7 MB** compressed layers | Debian (trixie) python slim | 3.14.7 |
| pack | **239 s** first, **196 s** rebuild | **1.06 GB** on disk | Paketo \`jammy\` stack | 3.14.7 |
| s2i | **35 s** | **1.38 GB** on disk | \`ubi8/python-311\` | **3.11.13** |

The host figure is the compressed size in the registry; the pack and s2i figures are uncompressed sizes from \`docker images\`. Different measures, so do not divide one by another — but the gap is an order of magnitude either way, and F0.L3 turns it into seconds of image pull on every node that has not seen the image.`,
    },
    {
      type: 'callout',
      variant: 'segfault',
      title: 'Same source, different Python',
      md: `The s2i build ran Python **3.11**; host and pack ran **3.14**. Nothing in the project asked for either. A function that uses a 3.12+ feature passes its tests locally, builds fine with host, and fails at import time when a colleague switches to s2i. Pin the runtime — \`requires-python\` in \`pyproject.toml\`, or the builder's version setting — and test the image you ship, not your laptop's interpreter.`,
    },
    {
      type: 'diagram',
      caption: 'fig 1 — builder choice ripples into the platform',
      height: 64,
      nodes: [
        { id: 'src', x: 2, y: 24, w: 16, h: 12, label: 'source', sub: 'func.py + deps' },
        { id: 'b', x: 24, y: 24, w: 18, h: 12, label: 'builder', sub: 'host · pack · s2i' },
        { id: 'img', x: 48, y: 24, w: 16, h: 12, label: 'image', sub: '50 MB – 1.4 GB' },
        { id: 'pull', x: 70, y: 4, w: 28, h: 12, label: 'cold start', sub: 'pull ∝ size' },
        { id: 'rt', x: 70, y: 24, w: 28, h: 12, label: 'runtime', sub: 'Python 3.11 or 3.14' },
        { id: 'ci', x: 70, y: 44, w: 28, h: 12, label: 'build time', sub: '18 s – 4 min' },
      ],
      edges: [
        { from: 'src', to: 'b' },
        { from: 'b', to: 'img' },
        { from: 'img', to: 'pull' },
        { from: 'img', to: 'rt' },
        { from: 'b', to: 'ci' },
      ],
      steps: [
        { caption: 'The source is identical in every case: one handler, one pyproject.toml. Only the --builder flag changes.', active: ['src', 'b'], edges: ['src->b'] },
        { caption: 'Each builder assembles a different image: a slim base plus your code (host), a buildpack stack (pack), or a UBI language image (s2i).', active: ['b', 'img'], edges: ['b->img'] },
        { caption: 'Image size becomes pull time on every node that has not run this digest — the cold-start term F0.L3 showed is proportional to size.', active: ['img', 'pull'], edges: ['img->pull'] },
        { caption: 'The base image decides the interpreter. Measured: 3.14 from host and pack, 3.11 from s2i. Code that works on one can fail to import on another.', active: ['img', 'rt'], edges: ['img->rt'] },
        { caption: 'And the builder sets your inner loop and CI time: 18 seconds against three to four minutes, per build.', active: ['b', 'ci'], edges: ['b->ci'] },
      ],
    },
    {
      type: 'prose',
      md: `## Choosing

| you want | choose | because |
|---|---|---|
| a fast laptop loop | host | seconds per build, small images |
| reproducible org-wide builds, patched base layers | pack | buildpacks rebase the OS layer without rebuilding your app, and every team gets the same stack |
| alignment with OpenShift / UBI policies | s2i | the base is a supported Red Hat image |
| the smallest cold start | whichever yields the smallest image *for your language* — measure it | pull time dominates first-pod-on-node |

pack's size is not waste: the Paketo stack carries a full OS userland and the buildpack lifecycle, which is what makes rebasing and SBOMs possible. Whether that is worth a gigabyte per image on every node is exactly the kind of trade you should make on purpose.`,
    },
    {
      type: 'vendor',
      snapshot: '2026-09',
      title: 'func builders, v1.23',
      systems: ['knative-functions'],
      sources: ['https://knative.dev/docs/functions/building-functions/'],
      md: `\`func build --help\` (knative-v1.23.3): supported builders are \`host\`, \`pack\` and \`s2i\`; the default is \`pack\` (overridable with \`FUNC_BUILDER\`). \`--base-image\` applies to the host builder only. All timings, sizes, stacks and Python versions in the table were measured on the reference machine on 2026-09-26 with default builder images; they will move as builder images are updated — re-measure before you quote them.`,
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'Functions built with pack cold-start in about 1.5 s on nodes that have run the image before and 10–12 s on nodes the cluster autoscaler has just added (already Ready, never seen the image). Which change most directly attacks the difference?',
          options: [
            'Move heavy imports out of init()',
            'Build smaller images — the host builder or a slimmer base — and re-measure the new-node cold start',
            'Set min-scale to 1 on the Service',
            'Raise containerConcurrency so fewer pods are created',
          ],
          correct: [1],
          explanation: 'The 9–10 s gap exists only on new nodes, so it is the pull, and pull time scales with image size (pack about 1.06 GB vs host about 50 MB here). Init runs the same on every node; min-scale keeps one warm pod, but every new node still pulls; fewer pods per node does not change what each new node downloads.',
        },
        {
          q: 'A function works when built with host but fails with SyntaxError at startup when CI builds it with s2i. What is the most likely cause?',
          options: [
            'CI corrupted the source',
            'The builders ship different Python versions (measured 3.14 vs 3.11); the code uses syntax the older interpreter lacks',
            's2i does not support Python',
            'The function needs more memory',
          ],
          correct: [1],
          explanation: 'A SyntaxError at import time, only under one builder, points at the interpreter. Pin the runtime version and build the same way locally and in CI.',
        },
        {
          q: 'A security team wants every function\'s OS layer patched centrally without every team rebuilding their code. Which builder property helps?',
          options: [
            'host builds are faster',
            'Buildpacks (pack) produce images on a common stack whose base layer can be rebased onto a patched version without rebuilding the application layers',
            's2i uses Python 3.11',
            'No builder can do this',
          ],
          correct: [1],
          explanation: 'Rebasing is one of the main reasons organisations accept pack\'s size and build time. The right answer depends on which of speed, size or central patching matters most — say which you are optimising.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'Going deeper',
      md: `- Knative "Building functions" (knative.dev/docs/functions/building-functions/).
- Cloud Native Buildpacks: the \`pack rebase\` concept and SBOM generation — the features that justify the size.
- Measure your own: \`func build --builder <b>\`, then \`docker images\` and the registry's manifest for compressed size, and \`docker run --rm --entrypoint python <image> --version\` (for pack images the runtime is only on the path inside the buildpacks launcher: \`docker run --rm --entrypoint /cnb/lifecycle/launcher <image> python --version\`).`,
    },
  ],
}

export default lesson
