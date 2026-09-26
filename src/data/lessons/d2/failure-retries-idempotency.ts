import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'd2.l5',
  slug: 'failure-retries-idempotency',
  trackId: 'd2',
  index: 5,
  title: 'Failure, Retries, Idempotency',
  minutes: 16,
  hook: 'A handler that raised on purpose ran four times in fourteen seconds — 2, 4 and 8 seconds apart — with the same event id every time. If that handler had written a row before it raised, you would now have four rows.',
  exercise: 'read+quiz',
  takeaway: {
    number: '4 attempts: +2 s, +4 s, +8 s',
    claim: 'With retries: 3 on the link, a failing DataEngine handler ran 4 times with exponential backoff from 2 s and the same event id each time — so every side effect must be keyed on something stable (event id, or bucket/key/version) to survive redelivery.',
  },
  blocks: [
    {
      type: 'prose',
      md: `D1.L4 established that an exception in your handler becomes an HTTP 500 from the runtime. This lesson follows what the platform does next, measured on the reference cluster, and what that means for any handler that changes something.`,
    },
    {
      type: 'prose',
      md: `## The measurement

Lab 10's echo function was given a revision 3 that raises \`RuntimeError\` for any key containing \`fail\`. The uploads pipeline's link has \`retries: 3\`. One object was uploaded:`,
    },
    {
      type: 'code',
      filename: 'vastde logs get <prefix>-uploads-pipeline --order-by asc (anonymised)',
      lang: 'text',
      code: `18:41:53.21  START EventId: 2007798426632229  EventType: vastdata.com:Element.ElementCreated
18:41:53.22  [user] echo r3: failing on purpose for key=alice/please-fail-….csv
18:41:53.22  [ERROR] Error in handler execution: deliberate failure for alice/please-fail-….csv
18:41:55.23  START EventId: 2007798426632229        ← +2 s, same id
18:41:55.24  [ERROR] Error in handler execution: …
18:41:59.26  START EventId: 2007798426632229        ← +4 s
18:41:59.26  [ERROR] Error in handler execution: …
18:42:07.28  START EventId: 2007798426632229        ← +8 s
18:42:07.28  [ERROR] Error in handler execution: …`,
    },
    {
      type: 'statline',
      stats: [
        { value: '4', label: 'attempts', hint: '1 + retries: 3' },
        { value: '2 → 4 → 8 s', label: 'backoff', hint: 'exponential, doubling from 2 s' },
        { value: '≈ 14 s', label: 'first failure → last attempt', hint: '2 + 4 + 8' },
        { value: '1', label: 'event id', hint: 'the same id on every attempt' },
      ],
    },
    {
      type: 'prose',
      md: `The same shape as Knative's delivery (K2.L4) with different constants. Knative's lab 04 used \`retry: 2\`, exponential from 1 s; here the base was 2 s. The arithmetic carries over: total ≈ base × (2^retries − 1) = 2 × 7 = 14 s. Raise \`retries\` to 6 and the last attempt lands about 2 × 63 = 126 s after the first failure.

After the last attempt, the event is the installation's problem: \`setup-dataengine\` configures a **dead-letter topic**. Find out from your administrator who reads it. A dead-letter topic nobody consumes is a slower way of dropping events.`,
    },
    {
      type: 'diagram',
      caption: 'fig 1 — at-least-once, drawn',
      height: 66,
      nodes: [
        { id: 'ev', x: 2, y: 24, w: 14, h: 14, label: 'event', sub: 'id 2007…' },
        { id: 'a1', x: 22, y: 6, w: 16, h: 10, label: 'attempt 1', sub: 'writes, then fails' },
        { id: 'a2', x: 22, y: 22, w: 16, h: 10, label: 'attempt 2', sub: '+2 s' },
        { id: 'a3', x: 22, y: 38, w: 16, h: 10, label: 'attempt 3', sub: '+4 s' },
        { id: 'a4', x: 22, y: 54, w: 16, h: 10, label: 'attempt 4', sub: '+8 s' },
        { id: 'store', x: 48, y: 22, w: 20, h: 14, label: 'side effect', sub: 'row, object, email' },
        { id: 'dlq', x: 76, y: 44, w: 22, h: 14, label: 'dead-letter topic', sub: 'after retries' },
        { id: 'key', x: 76, y: 8, w: 22, h: 14, label: 'idempotency key', sub: 'source+id or path' },
      ],
      edges: [
        { from: 'ev', to: 'a1' },
        { from: 'a1', to: 'store' },
        { from: 'a2', to: 'store' },
        { from: 'a3', to: 'store' },
        { from: 'a4', to: 'dlq' },
        { from: 'key', to: 'store', label: 'dedupes' },
      ],
      steps: [
        { caption: 'The first attempt writes its side effect — a database row, an output object — and then fails on a later step, returning 500.', active: ['ev', 'a1', 'store'], edges: ['ev->a1', 'a1->store'] },
        { caption: 'The platform retries with the same event: same id, same data. Without protection each attempt repeats the write.', active: ['a2', 'a3', 'store'], edges: ['a2->store', 'a3->store'] },
        { caption: 'After the last attempt the event goes to the dead-letter topic — if anyone reads it, it can be replayed later, with the same id again.', active: ['a4', 'dlq'], edges: ['a4->dlq'] },
        { caption: 'A write keyed on something stable — source + id, or bucket/key/version — turns every repeat into a no-op. That is what "idempotent handler" means.', active: ['key', 'store'], edges: ['key->store'] },
      ],
    },
    {
      type: 'prose',
      md: `## Designing for redelivery

Retries are not an edge case; they are the contract. Every event that meets a transient failure — a pod restarted mid-event, a dependency timed out, a deploy replaced the pod — is delivered again. So:

1. **Pick the idempotency key.** For an element event, the natural key is *what the event is about*: \`bucket/object_key\` plus the object's version or ETag if the same key can be overwritten. The event \`id\` (with \`source\`) identifies the *delivery*, and is stable across retries — the runtime also reuses it on any event your function emits to a sink.
2. **Make the side effect conditional on it.** Write outputs to a path derived from the key (overwriting identical content is harmless). Insert rows with the key as a unique constraint and ignore conflicts. Record "processed" markers and check them first.
3. **Decide what is retryable.** An exception is always a 500 and always retried. A malformed object will fail four times and then land in the dead-letter topic; catch the cases you know are permanent, log them clearly, and return normally so they are not retried pointlessly — then make sure they are visible (a metric, a quarantine prefix).
4. **Mind the timeout.** An invocation cut off by the pipeline's \`timeout\` is a failure too: long work that sometimes exceeds it will be retried from the start.`,
    },
    {
      type: 'code',
      filename: 'idempotent output write (sketch)',
      lang: 'python',
      code: `def handler(ctx, event):
    key = event.object_key                         # alice/2026/09/26/data.csv
    out = f"processed/{key}.summary.json"          # derived from the input — same key, same output
    if s3_exists(OUT_BUCKET, out):                 # already done by an earlier attempt
        ctx.logger.info("skip %s: already processed", key)
        return {"skipped": key}
    summary = summarise(read_object(event.bucket, key))
    put_object(OUT_BUCKET, out, summary)           # overwrite-safe: identical content
    return {"wrote": out}`,
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'Do not write back into the watched prefix',
      md: `\`processed/\` above is deliberately outside the trigger's prefix. An output written under the watched prefix is a new object, a new event, and a new invocation — a loop with no TTL to stop it (D1.L5).`,
    },
    {
      type: 'vendor',
      snapshot: '2026-09',
      title: 'Retry behaviour observed on DataEngine',
      systems: ['vast-dataengine'],
      sources: [
        'https://github.com/vast-data/dataengine-cli/blob/main/docs/references/commands/vastde_setup-dataengine.md',
        'https://github.com/vast-data/dataengine-cli/blob/main/docs/references/commands/vastde_pipelines_create.md',
      ],
      md: `**Documented**: a dead-letter topic configured per installation by \`setup-dataengine\`; pipeline links carry a delivery config. **Observed** on the reference cluster (vastde v5.5.0-sp2, link \`retries: 3\`, \`events_order: unordered\`): 4 attempts at +0, +2, +4 (cumulative +6), +8 (cumulative +14) seconds, same event id throughout, each logged as \`Error in handler execution\`. The backoff base and cap are not documented; measure them on your version before promising a recovery time. **Read in the runtime source**: exceptions return HTTP 500; output events reuse the input event id.`,
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'A handler inserts an audit row, then calls an API that times out and raises. Link retries: 3. How many audit rows exist after the platform gives up, and what is the fix?',
          options: [
            'One — the platform deduplicates',
            'Up to four — one per attempt; make the insert conditional on a stable key (source+id, or bucket/key/version) with a unique constraint',
            'Zero — failed attempts are rolled back',
            'Three',
          ],
          correct: [1],
          explanation: 'Measured: four attempts with the same event id. The platform does not undo your side effects. An idempotency key turns attempts 2–4 into no-ops.',
        },
        {
          q: 'An upstream dependency is down for 90 seconds. With retries: 3 and the observed 2/4/8 s backoff, what happens to events that arrive at the start of the outage?',
          options: [
            'They are retried until the dependency recovers',
            'Their last attempt is about 14 s after the first, so they exhaust retries during the outage and go to the dead-letter topic — raise retries (≈ 6 gives ~126 s) or plan a replay from the DLQ',
            'They wait in the bucket',
            'They are processed twice after recovery',
          ],
          correct: [1],
          explanation: 'Retry windows are computable: base × (2^n − 1). Compare them with the outages you expect, and make sure someone owns the dead-letter topic.',
        },
        {
          q: 'Which is the better idempotency key for an element event whose objects are never overwritten?',
          options: [
            'The current timestamp',
            'bucket/object_key (the object the event is about) — stable across retries and across replays from the dead-letter topic',
            'A random UUID generated in the handler',
            'The pod name',
          ],
          correct: [1],
          explanation: 'The key must be the same on every delivery. Timestamps and UUIDs generated in the handler differ per attempt, which is exactly what idempotency must not do. If objects can be overwritten, add the version or ETag.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'Going deeper',
      md: `- K2.L4 for Knative's delivery spec and the same backoff arithmetic.
- X1.L3 — why "exactly-once" is a property of the handler, not the transport, on both platforms.
- \`vastde logs get <pipeline> --severity ERROR\` — every failed attempt, one line each.`,
    },
  ],
}

export default lesson
