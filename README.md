# functionspace

**An event happened. Your function ran. Learn everything in between.**

A hands-on course on how serverless functions work, on two platforms:

- **Knative** (open source) — Serving, Eventing and Functions, taken apart on a
  kind cluster the learner creates in three minutes.
- **VAST DataEngine** — event-driven functions next to the data on a VAST
  cluster, driven with the public `vastde` CLI.

Site: https://promiseowolabi.github.io/functionspace/

## Curriculum — 35 lessons, 7 tracks, 11 labs

| Track | Name | Lessons |
|---|---|---|
| F0 | The Function Contract | 4 |
| K1 | Knative Serving | 6 |
| K2 | Knative Eventing | 6 |
| K3 | Knative Functions | 4 |
| D1 | DataEngine Foundations | 6 |
| D2 | DataEngine in Depth | 5 |
| X1 | Two Platforms, One Model | 4 |
| F* | Capstone: Same Function, Two Platforms | — |

Labs 00–05 run on kind (Knative v1.23); labs 06–10 run on the learner's own
VAST cluster. Every lab ships as a zip under `public/labs/` with a `verify.sh`
that inspects real state and prints a completion code.

Every number in a lesson is either arithmetic, a documented default with its
source, or measured on the reference setup (kind v0.33 + Knative v1.23 on one
node; a VAST cluster with vastde v5.5.0-sp2) — and says which.

## Rules this repo enforces

- **No third-party domain or sibling-course identity** — `tests/branding.test.ts` holds the list.
- **Anonymisation**: nothing identifying the reference VAST environment ships.
  Lessons and labs use placeholders (`<VMS_URL>`, `<TENANT>`, …) and read
  cluster values from a learner's `de.env`. The same test holds a list of
  forbidden strings. See `PLAN.md` and `CONTENT-SPEC.md` §6.
- **The rot rule**: product-specific claims live in dated, sourced `vendor`
  blocks, graded documented / observed / inferred.

## Development

Node 22+ and Python 3.11+.

```sh
npm ci
npm run dev                 # vite dev server on :3000
npm run export              # regenerate lesson manifest, lessons-md/, llms.txt
python3 scripts/pack-labs.py
npm run lint && npm run typecheck
VITE_BASE=/functionspace/ npm run build
npm run test                # after build: includes bundle checks
npm run report              # what is built and what is outstanding
```

## Layout

```
src/data/lessons/<track>/   lesson content (typed block files)
src/data/lab-guides/        step-by-step lab guides (same block system)
src/data/labs.ts            lab registry — check ids must match verify.sh
labs/<id>/                  lab folders: verify.sh, manifests, sources
labs/common/lib.sh          shared verify helpers + completion codes
scripts/                    manifest/markdown export, lab packing, report
tests/                      registry, branding/anonymisation, labs, site, bundle
notes/                      DataEngine observations behind the D-track lessons
```

Pushes to `main` build and deploy to GitHub Pages.
