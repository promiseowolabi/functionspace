import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'd1.l4',
  slug: 'the-function-runtime',
  trackId: 'd1',
  index: 4,
  title: 'The Function Runtime',
  minutes: 20,
  hook: 'Your DataEngine handler returned a dict and the caller got 204 No Content. The return value did not vanish — it went somewhere else, if anywhere was configured. Everything about the runtime makes sense once you see where.',
  exercise: 'lab+quiz',
  takeaway: {
    number: '204',
    claim: 'The DataEngine runtime answers every successfully handled event with 204 and delivers the handler\'s return value, as a new CloudEvent reusing the input id, only to a configured sink (K_SINK); exceptions become 500.',
  },
  blocks: [
    {
      type: 'prose',
      md: `A DataEngine function is two Python functions and a runtime you do not write:

\`\`\`python
def init(ctx):              # once per container, before the first event
    ...
def handler(ctx, event):    # once per event
    ...
\`\`\`

The runtime is a Python web server — **Uvicorn** on port **8080** — that receives CloudEvents over HTTP, turns each one into an event object, calls your \`handler\`, and decides what HTTP status to return. Lab 07 runs it in Docker on your laptop. This lesson opens it up: what \`ctx\` and \`event\` are, what happens to your return value, and what the runtime will reject.`,
    },
    {
      type: 'statline',
      stats: [
        { value: '8080', label: 'port', hint: 'Uvicorn inside the function container, with /readiness and /liveness' },
        { value: '204', label: 'status on success', hint: 'whatever handler returns — observed with vastde invoke' },
        { value: '500', label: 'status on exception', hint: 'from the runtime\'s handler code; the error string is the body' },
        { value: '1.9 GB', label: 'image size', hint: 'lab 07\'s echo function, built with the v5.5 builder image' },
      ],
    },
    {
      type: 'prose',
      md: `## ctx: your handle on the platform

In lab 07's diagnostic build, \`ctx\` was a \`Context\` object exposing:

| attribute | use |
|---|---|
| \`logger\` | structured logs, tagged with the event's trace id — what \`vastde logs\` shows (D2.L4) |
| \`tracer\`, \`start_as_current_span\` | OpenTelemetry spans inside your handler |
| \`meter\`, \`counter\`, \`gauge\`, \`histogram\`, \`updowncounter\` | custom metrics |
| \`secrets\` | secrets mounted into the container (\`/secrets/\`) |
| \`function_name\` | which function this is |
| \`pipeline_triggers_map\` | which triggers feed this function in its pipeline |

Log with \`ctx.logger\`, not \`print\`: its lines carry the trace id that ties a log line to the event and to the pipeline's traces.`,
    },
    {
      type: 'prose',
      md: `## event: an object, not a dict

\`event\` is a subclass of the CloudEvents SDK's event, specialised by trigger kind. For an object event it was an **\`ElementTriggerVastEvent\`** with convenience properties — \`bucket\`, \`object_key\`, \`trigger\`, \`topic\`, \`partition_key\` — plus \`get_attributes()\` and \`get_data()\`.

Two surprises, both observed:`,
    },
    {
      type: 'code',
      filename: 'lab 07 diagnostic handler, with vastde functions invoke --generate-event',
      lang: 'text',
      code: `event.get_attributes() → {'source': 'vastdata.com:trigger1.7bc3e17b-…', 'id': '703ab5d8-…',
                          'type': 'vastdata.com:Element.ObjectCreated', 'specversion': '1.0',
                          'subject': 'vastdata.com:kafka-view.default-topic', 'datacontenttype': 'application/json',
                          'triggerext1': 'cli-generated', 'triggerext2': 'test-event', …}

event.get_data()       → {'data': {'msg': 'hello'}, 'datacontenttype': 'application/json',
                          'id': '703ab5d8-…', 'source': …, 'type': …, …}        (dict)`,
    },
    {
      type: 'callout',
      variant: 'segfault',
      title: 'get_data() returned the whole envelope',
      md: `The payload was \`{'msg': 'hello'}\`, but \`get_data()\` returned the entire structured event with the payload nested under \`"data"\`. Code that does \`event.get_data()["key"]\` expecting the payload gets a KeyError. Lab 07's echo function unwraps defensively; for object events, prefer the typed properties (\`event.bucket\`, \`event.object_key\`), which read the \`elementpath\` extension directly.`,
    },
    {
      type: 'prose',
      md: `## Where your return value goes

The runtime's own handler code (readable in the built image under \`site-packages/vast/dataengine/runtime/\`) does this after your \`handler\` returns:

1. If the environment variable **\`K_SINK\`** is set, wrap the return value in a new CloudEvent and POST it to that URL. Otherwise log \`No sink URL configured\`.
2. Return **204** to the caller.
3. If anything raised, return **500** with the error message as the body.

The outgoing event gets \`type: vastdata.com:Function\`, \`source: vastdata.com:<function name>\`, **the same \`id\` as the input event**, the input's \`partitionkey\`, and a W3C \`traceparent\` so the trace continues. A \`K_CE_OVERRIDES\` JSON variable can override attributes.

If \`K_SINK\` and \`K_CE_OVERRIDES\` look familiar, they should: they are the environment variables Knative's SinkBinding and ContainerSource inject (K2.L1). X1.L1 follows that thread.`,
    },
    {
      type: 'diagram',
      caption: 'fig 1 — one event through the runtime',
      height: 70,
      nodes: [
        { id: 'in', x: 2, y: 28, w: 14, h: 12, label: 'CloudEvent', sub: 'POST :8080' },
        { id: 'parse', x: 20, y: 28, w: 18, h: 12, label: 'parse', sub: 'VastEvent subtype' },
        { id: 'h', x: 42, y: 28, w: 16, h: 12, label: 'handler()', sub: 'your code' },
        { id: 'sink', x: 64, y: 6, w: 18, h: 12, label: 'K_SINK', sub: 'if configured' },
        { id: 'ok', x: 64, y: 28, w: 16, h: 12, label: '204', sub: 'to caller' },
        { id: 'err', x: 64, y: 50, w: 16, h: 12, label: '500', sub: 'exception' },
        { id: 'next', x: 86, y: 6, w: 12, h: 12, label: 'next', sub: 'step' },
      ],
      edges: [
        { from: 'in', to: 'parse' },
        { from: 'parse', to: 'h' },
        { from: 'h', to: 'sink', label: 'return value' },
        { from: 'sink', to: 'next', label: 'new CE' },
        { from: 'h', to: 'ok' },
        { from: 'h', to: 'err' },
        { from: 'parse', to: 'err', label: 'malformed' },
      ],
      steps: [
        { caption: 'A CloudEvent arrives by HTTP POST on port 8080. The runtime turns it into a typed event — element, schedule, function or manual — based on its type attribute.', active: ['in', 'parse'], edges: ['in->parse'] },
        { caption: 'If the event is missing fields the runtime depends on (subject, a hex id), parsing fails and the caller gets 500 before your code runs.', active: ['parse', 'err'], edges: ['parse->err'] },
        { caption: 'Otherwise your handler runs with ctx and the event. If it raises, the runtime records the error on the span and a metric, and answers 500.', active: ['parse', 'h', 'err'], edges: ['parse->h', 'h->err'] },
        { caption: 'If it returns, the value goes to K_SINK as a new CloudEvent — same id as the input, type vastdata.com:Function — only when a sink is configured.', active: ['h', 'sink', 'next'], edges: ['h->sink', 'sink->next'] },
        { caption: 'Either way the caller gets 204 No Content. The return value never travels back in the HTTP response — unlike a Knative function reply (K2.L6).', active: ['h', 'ok'], edges: ['h->ok'] },
      ],
    },
    {
      type: 'prose',
      md: `## What the runtime rejects

The SDK parses several attributes by position, so hand-written test events must follow the platform's grammar (real triggers always do):

| attribute | expected shape | if wrong |
|---|---|---|
| \`id\` | hex or a UUID — it seeds the trace id | 500 (\`invalid literal for int() with base 16\`) |
| \`subject\` | \`<broker>.<topic>\` | 500 (\`malformed vast event: broker\`) |
| \`source\` | \`vastdata.com:<trigger>.<trigger id>\` | \`event.trigger\` raises |
| \`type\` | \`vastdata.com:<Kind>.<Subtype>\`, e.g. \`Element.ObjectCreated\` | \`event.type\`/\`subtype\` raise |
| \`elementpath\` (element events) | \`<bucket>/<object key>\` | \`bucket\`/\`object_key\` are \`None\` |

For element events, \`partition_key\` **is** \`elementpath\` — the bucket and key. Events about the same object share a partition; that is the ordering unit (K2.L5, D2.L5).`,
    },
    {
      type: 'vendor',
      snapshot: '2026-09',
      title: 'The DataEngine Python runtime, as shipped in the v5.5 builder',
      systems: ['vast-dataengine'],
      sources: [
        'https://github.com/vast-data/dataengine-cli/blob/main/docs/references/commands/vastde_functions_init_python-pip.md',
        'https://github.com/vast-data/dataengine-cli/blob/main/docs/references/commands/vastde_functions_invoke.md',
      ],
      md: `**Documented** (public CLI reference): \`functions init python-pip\` scaffolds \`init\`/\`handler\`; \`functions invoke\` sends CloudEvents, with \`vastdata.com:Element.ObjectCreated\` as the default generated type. **Observed** with \`vastde\` v5.5.0-sp2 and \`vastdataorg/vast-builder:v5.5.0-sp2\`, locally: Uvicorn on 8080 with \`/readiness\` and \`/liveness\`; 204 on success; the \`ctx\` and \`event\` attributes listed above; \`get_data()\` returning the envelope; the parsing failures in the table. **Read in the runtime's source** inside the built image: the 204/500 logic, the \`K_SINK\` delivery of return values, the output event's attributes, and \`K_CE_OVERRIDES\`. Treat the last group as implementation detail that can change between releases — re-check it after an upgrade.`,
    },
    {
      type: 'lab',
      lab: 'de-local-function',
      brief: 'Build the echo function with the DataEngine builder, run it in Docker, and send it a generated event and a hand-written one — then break the hand-written one on purpose and read the 500.',
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'A developer\'s DataEngine handler returns a JSON result, and their integration test asserts the HTTP response body contains it. The test fails with an empty 204. What is going on?',
          options: [
            'The handler crashed silently',
            'The runtime never returns the handler\'s value in the HTTP response; it answers 204 and sends the value to K_SINK only if a sink is configured',
            'vastde invoke strips response bodies',
            'The function must return a string, not a dict',
          ],
          correct: [1],
          explanation: 'That is the runtime\'s contract, visible in its handler code: 204 on success, return value to the sink. Test the side effect (logs, the sink, what was written) rather than the HTTP body.',
        },
        {
          q: 'A handler does event.get_data()["object_key"] for element events and gets KeyError. What should it use?',
          options: [
            'event.get_data()["data"]["object_key"]',
            'event.object_key (and event.bucket), which the element event parses from the elementpath extension',
            'os.environ["OBJECT_KEY"]',
            'The key is not available to the handler',
          ],
          correct: [1],
          explanation: 'get_data() returned the envelope, not a payload with the key in it; the object location travels in the elementpath extension. The typed properties are the supported way to read it.',
        },
        {
          q: 'Where should a DataEngine function create its S3 client and load a lookup table?',
          options: [
            'In handler(), so every event gets a fresh client',
            'In init(ctx), once per container — it runs before the runtime reports ready, so events never see a half-initialised function',
            'At the top of main.py outside any function, because init is optional',
            'In a separate function the pipeline calls',
          ],
          correct: [1],
          explanation: 'init runs once per container before readiness, exactly the cold-start "init" term from F0.L3. Doing it per event multiplies the cost by the event rate; doing it at import time works but hides failures from the runtime\'s init reporting.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'Going deeper',
      md: `- Read the runtime yourself: \`docker run --rm --entrypoint sh <image> -c 'ls /layers/*/cpython/lib/python3.*/site-packages/vast/dataengine/runtime/'\` — \`handlers.py\`, \`server.py\` and \`cloud_event_utils.py\` are short.
- \`vastde functions init --help\` and the scaffold's \`README.md\` — \`config.yaml\` for env vars and secrets during \`localrun\`.
- X1.L1 compares this contract with Knative Functions' Python template (K3.L1) line by line.`,
    },
  ],
}

export default lesson
