# FUNCTIONSPACE — build plan, design, and resume state

> Written 2026-09-26. Course #6 in the series, after kernelspace (the machine),
> tablespace (the data at rest), vectorspace, latentspace and columnspaces.
> This file is the single source of truth; keep the RESUME POINT at the bottom
> current.

## Mission

Take a backend engineer who has *deployed* a container and make them someone
who can explain — and operate — what happens between "an event occurred" and
"my function returned", on two platforms:

1. **Knative (open source).** Serving (revisions, routes, the request path,
   the autoscaler, scale-to-zero), Eventing (sources, brokers, triggers,
   delivery), Functions (`func`). Run on a local `kind` cluster that every
   reader can create in ten minutes.
2. **VAST DataEngine.** Event-driven compute next to data on a VAST cluster:
   functions, triggers (schedule and element/S3), pipelines, the event
   broker, observability. Run on the reader's own VAST cluster with the
   `vastde` CLI.

Both halves are **hands-on**. Every lab ends in a `verify.sh` that checks real
state (the kind cluster, or the reader's DataEngine tenant) and prints a
completion code the site accepts.

Platform: **fork columnspaces** (the lesson engine, block system, progress
store, manifest + agent surface, test suite). The wasm forge, DuckDB labs,
desks, rooms and warehouse are removed; a new **Labs** surface replaces them.

## Naming, domain, repo

- Course name: **functionspace**. Directory
  `/home/promise/Work/public_learning/functionspace`.
- Repo: `github.com/promiseowolabi/functionspace`, **private**.
- Deploy: GitHub Pages project site → `https://promiseowolabi.github.io/functionspace/`.
  `VITE_BASE=/functionspace/`, router basename from `import.meta.env.BASE_URL`.
- **No `naigap` reference anywhere.** That domain belongs to someone else.
  Enforced by `tests/branding.test.ts`.
- The GitHub Pages site is public even though the repo is private, so lab
  files ship as zips under `public/labs/` (the repo cannot be linked to).

## The anonymisation rule (non-negotiable)

The author's VAST cluster lives on an internal, VPN-only lab network. Nothing
about that environment may appear in this repo — not in lessons, labs,
scripts, fixtures, tests, commit messages or captured output.

- Every cluster-specific value is a **placeholder** the reader fills in:
  `<VMS_URL>`, `<TENANT>`, `<REGISTRY>` / `<REGISTRY_URL>`, `<K8S_CLUSTER>`,
  `<NAMESPACE>`, `<BROKER>`, `<TOPIC>`, `<BUCKET>`, `<S3_ENDPOINT>`,
  `<PREFIX>`. Labs read them from one `de.env` file.
- Captured CLI output used in lessons is **rewritten** to the placeholders
  before it is committed (hostnames, usernames, tenant, cluster, registry,
  object names, GUIDs).
- Forbidden strings are a test (`tests/branding.test.ts`): internal
  hostnames, the lab cluster and tenant names, demo object prefixes, and the
  internal network name. Adding one to the list is cheap; leaking one is not.
- Getting `vastde`: public GitHub releases (github.com/vast-data/dataengine-cli). A tenant: "from your VAST administrator or account
  team". No internal download paths.

## The rot rule (inherited)

Vendor-specific facts — a Knative default, a DataEngine limit, a CLI flag —
live in a `vendor` block with the month verified and the source, or they do
not appear. Knative facts are verified against knative.dev and the running
v1.23 cluster. DataEngine facts are verified against `vastde` v5.5 behaviour
and VAST's public documentation. Where DataEngine internals are inferred
rather than documented (e.g. its use of Knative underneath), the lesson
**says so**.

## Curriculum — 35 lessons, 7 tracks + capstone

| Track | Name | Lessons | Level |
|---|---|---|---|
| F0 | The Function Contract | 4 | 200 |
| K1 | Knative Serving | 6 | 300 |
| K2 | Knative Eventing | 6 | 300 |
| K3 | Knative Functions | 4 | 300 |
| D1 | DataEngine Foundations | 6 | 300 |
| D2 | DataEngine in Depth | 5 | 400 |
| X1 | Two Platforms, One Model | 4 | 400 |
| F* | Capstone: Same Function, Two Platforms | — | 400 |

### F0 — The Function Contract
1. `what-a-function-is` — a function is three things: an image, an event contract, a scaler.
2. `cloudevents-the-envelope` — four required attributes; binary vs structured mode.
3. `cold-start-arithmetic` — pull + schedule + start + init + first request.
4. `kubernetes-for-functions` — pods, deployments, services, CRDs, the reconcile loop.

### K1 — Knative Serving
1. `service-configuration-revision-route`
2. `the-request-path` — ingress → activator → queue-proxy → user container.
3. `the-autoscaler` — concurrency target, stable/panic windows, KPA vs HPA.
4. `scale-to-zero` — grace period, activator buffering, the cost of the first request.
5. `traffic-and-rollouts` — percentages, tags, gradual rollout.
6. `tuning-a-service` — containerConcurrency, min/max/initial scale, timeouts.

### K2 — Knative Eventing
1. `sources-sinks-addressables`
2. `broker-and-trigger` — attribute filters.
3. `channels-and-subscriptions`
4. `delivery-and-dead-letters` — retry, backoff, DLS.
5. `kafka-backed-eventing` — ordering, partitions, the broker as a log.
6. `replies-sequences-parallel`

### K3 — Knative Functions
1. `func-create` — templates, languages, the project layout.
2. `builders` — host, pack (buildpacks), s2i; what the image contains.
3. `cloudevent-functions` — the handle signature, returning events.
4. `from-func-to-ksvc` — what `func deploy` actually creates.

### D1 — DataEngine Foundations
1. `compute-next-to-data` — why run functions on the storage platform.
2. `the-object-model` — function, trigger, pipeline, topic, compute cluster, registry, VRNs.
3. `the-vastde-cli` — config, tenant scope, dry-run, output formats.
4. `the-function-runtime` — `init(ctx)`, `handler(ctx, event)`, build, localrun, invoke.
5. `triggers` — schedule vs element; events, name and tag filters.
6. `pipelines` — the manifest: deployments, links, triggers, resources.

### D2 — DataEngine in Depth
1. `the-event-broker` — topics, the internal broker, external brokers.
2. `element-triggers-end-to-end` — S3 PUT → event → handler; the payload.
3. `revisions-and-rollouts` — function revisions, publish, pipeline update.
4. `observability` — logs, metrics, traces.
5. `failure-retries-idempotency` — retries, ordering, designing for redelivery.

### X1 — Two Platforms, One Model
1. `the-mapping` — DataEngine concepts onto Knative concepts (labelled where inferred).
2. `sizing-concurrency` — Little's law, concurrency, pods, throughput.
3. `exactly-once-is-a-design` — at-least-once delivery and idempotent handlers.
4. `architecture-patterns` — enrich-on-ingest, fan-out, inference next to data.

## Labs

| # | id | platform | what the reader builds | verify checks |
|---|---|---|---|---|
| 00 | `kind-knative` | kind | kind + Knative Serving + Kourier + Eventing | CRDs, controllers Ready |
| 01 | `first-service` | kind | a ksvc, two revisions | ksvc Ready, ≥2 revisions |
| 02 | `autoscaling` | kind | load test, concurrency target, scale-to-zero | annotations, recorded peak |
| 03 | `traffic-split` | kind | tagged revisions, 80/20 split | traffic block, tag URL |
| 04 | `broker-trigger` | kind | PingSource → broker → filtered trigger → sink, DLS | resources Ready, events seen |
| 05 | `knative-functions` | kind | `func create` → deploy → invoke (Python CloudEvents) | ksvc from func, invoke 2xx |
| 06 | `de-setup` | VAST | `vastde` configured against a tenant | config, list calls succeed, registry trusted, Docker usable by vastde |
| 07 | `de-local-function` | VAST | init → build → localrun → invoke | image exists, handler OK |
| 08 | `de-schedule-pipeline` | VAST | push, function, schedule trigger, pipeline | pipeline Ready, logs |
| 09 | `de-element-trigger` | VAST | S3 upload fires a function | trigger, pipeline, log line |
| 10 | `de-revisions-observability` | VAST | revision 2, rollout, logs/metrics/traces | revision 2 live |

Completion code: `verify.sh` prints `FS-<LAB>-<8 hex>` where the hex is
`sha256("functionspace:<lab>:<prefix>")[:8]`. The site recomputes it from the
reader's prefix. It is a progress marker, not an exam — the course says so.

## RESUME POINT

- [x] Plan written.
- [x] Fork stripped (forge/desks/rooms/duckdb/warehouse removed); lint, typecheck, build, 103 tests green.
- [x] Labs surface + completion codes (bash and TS agree; tests/labs.test.ts).
- [x] Knative labs 00–05 written and verified on kind v0.33 / Knative v1.23.
- [x] DataEngine labs 06–10 written and verified against a VAST tenant
      (lab 08's schedule trigger fired only intermittently on the reference
      cluster — documented in the guide; labs 09–10 verified end to end).
- [x] Lessons F0, K1, K2, K3, D1, D2, X1 — 35/35.
- [x] Capstone steps.
- [ ] Private repo created, Pages deployed.

## Findings worth keeping (details in notes/de-observations.md)

- The DataEngine installer embedded in the public vastde binary deploys the
  Knative Operator v1.20 and lets DataEngine's controller create Knative
  Services, Brokers, Triggers and SinkBindings; live pods are named
  `…-0000N-deployment-…`. X1.L1 is built on this.
- vastde v5.5.0-sp2: no --tenant flag (README says otherwise); functions update
  --publish fails 422 (labs/de-revisions-observability/publish-revision.py);
  logs get defaults to 100 records oldest-first; --scope runtime matches nothing
  (vast-runtime); trace Duration labelled µs is ms.
- Real element event type is vastdata.com:Element.ElementCreated.
- Link retries: 3 → 4 attempts at +2/+4/+8 s, same event id.
