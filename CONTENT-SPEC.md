# CONTENT-SPEC — how a functionspace lesson is written

Authoring contract for `src/data/lessons/<trackId>/<slug>.ts` and the lab
guides in `src/data/lab-guides/<id>.ts`. Forked from columnspaces' spec; the
block system, diagram rules and quiz rules carry over unchanged.

## 1. File shape

```ts
import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'k1.l3',                     // `${trackId}.l${index}` — the progress store key
  slug: 'the-autoscaler',          // MUST equal the filename minus .ts
  trackId: 'k1',
  index: 3,
  title: 'The Autoscaler',
  minutes: 18,                     // honest reading estimate, 9–24
  hook: 'One sentence that makes the lesson unskippable.',
  exercise: 'lab+quiz',            // 'quiz' | 'read' | 'read+quiz' | 'lab+quiz'
  takeaway: { number: '⌈50 ÷ 7⌉ = 8', claim: 'One sentence a reader could say in a review.' },
  blocks: [ /* … */ ],
}

export default lesson
```

`takeaway.number` must contain a digit (tested). Register the lesson in
`src/data/lessons/index.ts`, then `npm run export`.

**Escaping:** `md` strings are template literals — write inline code as
`` \` `` and `${` as `\${`.

## 2. Blocks

| block | use it for |
|---|---|
| `prose` | the spine. `## H2`, `### H3`, lists, pipe tables, `**bold**`, `` `code` ``, `[label](url)` |
| `code` | YAML, `kn`/`kubectl`/`vastde` commands, Python, **captured output** (`lang: 'text'`, `filename: 'output'`) |
| `callout` | `analogy` · `info` · `warning` · `segfault` (a real failure mode) · `isomorphism` |
| `diagram` | stepped SVG walkthrough — the request path, the event path. §3 |
| `statline` | 3–4 numbers that survive the lesson |
| `quiz` | 2–3 transfer questions. §4 |
| `vendor` | every product-specific claim. §5 |
| `lab` | `{ lab, brief }` — sends the reader to a hands-on lab (`src/data/labs.ts`) |
| `isomorphism` | map onto something the reader owns (fields `os`/`llm` = left/right) |
| `deepdive` | closing "going deeper": docs, source files, papers, by name |

Tested: exactly one quiz, first block is prose, every `lab` id is registered,
`lab+quiz` lessons contain a `lab` block.

## 3. Diagrams

100-wide × `height` (60–80) viewBox; `x`/`y` top-left; boxes ≥ 10×8; no
overlaps; ≥ 3 steps; every caption > 40 characters (captions are narration).

## 4. Quizzes

Transfer, not recall: a production situation the reader must reason about.
Four options, one correct, wrong options are real folklore ("just raise
max-scale", "the broker guarantees exactly-once", "set min-scale to 1 and
forget it"). `explanation` says why the right answer is right *and* why the
tempting wrong one fails. At least one question per track is a cost or risk
question.

## 5. Vendor claims — the rot rule

No product-specific fact loose in prose: a Knative default, a DataEngine flag,
a CLI behaviour. It lives in a `vendor` block with `snapshot: 'YYYY-MM'` (the
month you **checked** it) and `https://` sources. Never a price.

**Three grades of DataEngine claim — say which one you are making:**

1. **Documented** — in VAST's public docs, the public CLI reference
   (github.com/vast-data/dataengine-cli), or a VAST blog. Cite it.
2. **Observed** — seen through `vastde` v5.5 against a real tenant, or in the
   locally built function container. Say "observed with vastde v5.5.0-sp2".
3. **Inferred** — e.g. that pipeline deployments are Knative-shaped. Say
   "inferred", give the evidence, and give the reader the command that would
   confirm it on their own cluster.

## 6. The anonymisation rule

The author's VAST cluster is internal. **Never** write its hostnames, tenant,
Kubernetes cluster, registry, namespaces, broker or object names — in prose,
code, captured output or comments. Use placeholders: `<VMS_URL>`, `<TENANT>`,
`<REGISTRY>`, `<REGISTRY_URL>`, `<K8S_CLUSTER>`, `<NAMESPACE>`, `<BROKER>`,
`<TOPIC>`, `<BUCKET>`, `<S3_ENDPOINT>`, and `alice` for the prefix. Rewrite
captured output before committing it. `tests/branding.test.ts` enforces a
list of forbidden strings.

## 7. Voice

- Second person, present tense, no "in this lesson we will".
- **Every mechanism gets a number**: seconds of window, percent of target,
  pods, retries, bytes. Show the arithmetic.
- Numbers are (a) arithmetic the reader can redo, (b) a documented default with
  its source, or (c) **measured on the reference run** — and then say so, with
  the setup (kind v0.33, Knative v1.23, one node). Never invent a benchmark.
- Name what each design is bad at. Scale-to-zero costs a cold start;
  at-least-once costs idempotency; a broker costs a hop.
- Reference lessons as `K1.L3`, labs as `lab 02`.

## 8. Definition of done

`npm run verify` clean; takeaway present; every vendor claim dated and
sourced; every captured output anonymised; the lesson names a weakness; it
reads in its `minutes`.
