import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'k3.l3',
  slug: 'cloudevent-functions',
  trackId: 'k3',
  index: 3,
  title: 'CloudEvent Functions',
  minutes: 17,
  hook: 'Your handler\'s HTTP status is its vote on whether the platform should retry. Raise the wrong exception in func-python 0.8.1 and a bad event you meant to reject comes back as a 500 — and gets retried.',
  exercise: 'read+quiz',
  takeaway: {
    number: '400 vs 500',
    claim: 'In a CloudEvent function the status code is the retry decision: reply with an explicit 400 (send.structured(event, 400)) for events that can never succeed, an explicit 204 when there is nothing to reply, and let genuine faults surface as 500 — measured, both a ValueError and a silent return became 500s in func-python 0.8.1.',
  },
  blocks: [
    {
      type: 'prose',
      md: `A CloudEvent function has four possible outcomes for every event, and each one is an instruction to whatever delivered it:

| your function | HTTP | broker / trigger does |
|---|---|---|
| handles it, replies with an event | 200 + event | posts the reply into the broker (K2.L6) |
| handles it, nothing to say | 204, **sent explicitly** | done |
| cannot handle it, **ever** | **400** | no retry; dead-letter sink (K2.L4) |
| cannot handle it **right now** | **5xx** (or 429) | retry with backoff, then dead-letter |

Getting that mapping right is most of what "writing a good event handler" means. The code is easy; the status code is the contract.`,
    },
    {
      type: 'prose',
      md: `## What the Python middleware does for you

\`func-python\` (the server the Python template runs in) decodes the request before your \`handle\` runs. From its source (v0.8.1) and from live requests against lab 05's function:

- A request that is **not a CloudEvent** → the middleware answers **400** "Bad Request: This endpoint expects CloudEvent requests." — your code never runs.
- Your \`handle\` **raises** an exception → **500**, with a CloudEvent body of type \`dev.functions.error\` carrying the message.
- Your \`handle\` calls \`send(event)\` → **200** with the event in **structured** mode. \`send.binary(event)\` sends binary mode; both accept a status: \`send.structured(event, 400)\`.
- Your \`handle\` **returns without sending anything** → **500** from the server (hypercorn), tested locally against the same library. "Nothing to say" is still a retryable failure unless you say it: \`send.http(...)\` sends a raw response, e.g. a 204:

\`\`\`python
await send.http({"type": "http.response.start", "status": 204, "headers": []})
await send.http({"type": "http.response.body", "body": b""})
\`\`\``,
    },
    {
      type: 'code',
      filename: 'live, against lab 05\'s first version',
      lang: 'text',
      code: `POST {"qty":"abc", …}       → 500  {"type":"dev.functions.error", … "message":"Error: 'dict' object has no attribute 'get_data'"}
POST not a CloudEvent        → 400  Bad Request: This endpoint expects CloudEvent requests.
POST [1,2] as data           → 500  {"type":"dev.functions.error", … "message":"Error: 'list' object has no attribute 'get'"}`,
    },
    {
      type: 'callout',
      variant: 'segfault',
      title: 'The ValueError that became a 500',
      md: `The first request made \`int("abc")\` raise **ValueError** inside the handler. Reading the middleware, it catches \`(CloudEventValidationError, ValueError)\` around both decoding *and* your handler, intending to answer 400. But by then \`send\` has been wrapped as a CloudEvent sender, the plain-dict 400 response fails inside it, and the outer handler turns *that* failure into a **500** with an error message about \`get_data\` that has nothing to do with your bug. Net effect: a permanently bad event is treated as transient and retried. Do not use exceptions to choose status codes.`,
    },
    {
      type: 'prose',
      md: `## Reject explicitly

The lab 05 solution now validates first and answers bad input with an explicit 400 and a descriptive event:`,
    },
    {
      type: 'code',
      filename: 'labs/knative-functions/solution/func.py',
      lang: 'python',
      code: `async def handle(self, scope, receive, send):
    request = scope["event"]
    data = request.get_data()
    qty = data.get("qty", 1) if isinstance(data, dict) else None
    if not isinstance(data, dict) or not data.get("sku") or not isinstance(qty, int) or qty < 1:
        await send.structured(CloudEvent(
            attributes={"type": "dev.functionspace.order.rejected",
                        "source": f"/functions/{self.who}-fn",
                        "datacontenttype": "application/json"},
            data={"error": "need a dict with a sku and a positive integer qty", "got": data},
        ), 400)
        return
    ...  # price it and send(order.priced) as before`,
    },
    {
      type: 'code',
      filename: 'live, after the change',
      lang: 'text',
      code: `POST {"qty":"abc", …}  → 400  {"type":"dev.functionspace.order.rejected", … "error":"need a dict with a sku and a positive integer qty"}
POST {"qty":2, …}      → 200  {"type":"dev.functionspace.order.priced", … "total_pence":2500, "priced_by":"alice-fn-00003"}`,
    },
    {
      type: 'prose',
      md: `Behind a broker, that 400 means one attempt and straight to the dead-letter sink, with \`knativeerrordata\` carrying your rejection event — a readable reason for whoever triages the DLS, instead of a stack trace.`,
    },
    {
      type: 'diagram',
      caption: 'fig 1 — the handler votes on retries',
      height: 64,
      nodes: [
        { id: 'in', x: 2, y: 24, w: 14, h: 12, label: 'event', sub: 'from trigger' },
        { id: 'mw', x: 20, y: 24, w: 16, h: 12, label: 'middleware', sub: 'decode' },
        { id: 'h', x: 40, y: 24, w: 16, h: 12, label: 'handle()', sub: 'your code' },
        { id: 'ok', x: 62, y: 4, w: 16, h: 12, label: '200 + event', sub: 'reply chain' },
        { id: 'bad', x: 62, y: 24, w: 16, h: 12, label: '400', sub: 'never retry' },
        { id: 'err', x: 62, y: 44, w: 16, h: 12, label: '500', sub: 'retry' },
        { id: 'dls', x: 84, y: 24, w: 14, h: 12, label: 'DLS', sub: 'triage' },
      ],
      edges: [
        { from: 'in', to: 'mw' },
        { from: 'mw', to: 'h' },
        { from: 'mw', to: 'bad', label: 'not a CE' },
        { from: 'h', to: 'ok' },
        { from: 'h', to: 'bad', label: 'explicit' },
        { from: 'h', to: 'err', label: 'exception' },
        { from: 'bad', to: 'dls' },
        { from: 'err', to: 'dls', label: 'after retries' },
      ],
      steps: [
        { caption: 'The middleware decodes the request. If it is not a CloudEvent at all, it answers 400 and your code never runs.', active: ['in', 'mw', 'bad'], edges: ['in->mw', 'mw->bad'] },
        { caption: 'For a valid CloudEvent your handle() runs. A reply sent with send() becomes a 200 with a structured event — and, behind a trigger, a new event on the broker.', active: ['mw', 'h', 'ok'], edges: ['mw->h', 'h->ok'] },
        { caption: 'An event you can never process should get an explicit 400 from send.structured(..., 400): one attempt, then the dead-letter sink with your reason attached.', active: ['h', 'bad', 'dls'], edges: ['h->bad', 'bad->dls'] },
        { caption: 'Any exception becomes a 500 — including, in func-python 0.8.1, a ValueError. 500 is retried with backoff first, so a bad event burns the whole retry budget before it is dead-lettered.', active: ['h', 'err', 'dls'], edges: ['h->err', 'err->dls'] },
      ],
    },
    {
      type: 'prose',
      md: `## Two more habits

- **Always set \`datacontenttype\`** on replies (K2.L6 shows what happens if you do not).
- **Keep the handler idempotent.** A 500 you returned *after* writing to a database will be retried; the write happens again unless the handler deduplicates on \`source\` + \`id\` (F0.L2, X1.L3).`,
    },
    {
      type: 'vendor',
      snapshot: '2026-09',
      title: 'func-python 0.8.1 error handling',
      systems: ['knative-functions'],
      sources: ['https://knative.dev/docs/functions/', 'https://pypi.org/project/func-python/'],
      md: `Observed with the Python cloudevents template from func knative-v1.23.3, which installs \`func-python 0.8.1\` and \`cloudevents 2.2.0\`: non-CloudEvent requests get 400; exceptions in \`handle\` get 500 with a \`dev.functions.error\` event; a \`ValueError\` raised in \`handle\` also produced 500 (the middleware's intended 400 path fails because the sender is already wrapped — read in \`func_python/cloudevent.py\`, confirmed with live requests); \`send.structured(event, status)\` and \`send.binary(event, status)\` set the status explicitly; a \`handle\` that sends nothing produced a 500 from hypercorn, and \`send.http(...)\` sends a raw response such as 204. Check the version your build installs — this behaviour is exactly the kind that gets fixed in a patch release.`,
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'A handler raises an exception when an event is missing a required field. Behind a trigger with retry: 10 and a DLS, what happens to such an event?',
          options: [
            'It goes straight to the DLS',
            'It is retried 10 times with backoff — the exception is a 500 — and only then dead-lettered, delaying triage and wasting capacity',
            'It is dropped silently',
            'The trigger is disabled',
          ],
          correct: [1],
          explanation: 'Exceptions surface as 500, which is retryable. A missing field will be missing on every attempt. Validate first and reply with an explicit 400 so the event goes to the DLS on the first attempt, with a readable reason.',
        },
        {
          q: 'Your function calls a payment API that is briefly unavailable. What should the function return?',
          options: [
            '400, so the event is not retried',
            '200, and log the error',
            'A 5xx (or 429 if you are being rate limited), so the delivery layer retries with backoff',
            'Nothing — let the request time out',
          ],
          correct: [2],
          explanation: 'Transient dependency failures are exactly what retries are for. 400 would dead-letter a perfectly good payment; 200 would lose it. Letting it time out also retries, but slower and with less information.',
        },
        {
          q: 'An on-call engineer sees 500s whose message is "\'dict\' object has no attribute \'get_data\'" from a Python function that never calls get_data on a dict. What is the most useful first hypothesis?',
          options: [
            'Kourier is corrupting requests',
            'The handler raised ValueError; in func-python 0.8.1 the middleware\'s 400 path fails and reports this unrelated error as a 500 — look for the ValueError in the handler',
            'The cloudevents SDK is broken',
            'The event was in binary mode',
          ],
          correct: [1],
          explanation: 'Misleading error messages from framework code are real incidents. Knowing this specific failure mode — and fixing it by validating and replying 400 explicitly — turns an hour of confusion into a minute.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'Going deeper',
      md: `- Read \`func_python/cloudevent.py\` in your own build (\`.func/build/lib/\` after a host build) — the whole request path is about 300 lines.
- CloudEvents HTTP binding, "HTTP Protocol Binding → Response" — what status codes mean for event delivery.
- K2.L4 for the retry arithmetic your 5xx choices feed into, and X1.L3 for making the handler safe to retry.`,
    },
  ],
}

export default lesson
