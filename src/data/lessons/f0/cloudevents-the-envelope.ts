import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'f0.l2',
  slug: 'cloudevents-the-envelope',
  trackId: 'f0',
  index: 2,
  title: 'CloudEvents, the Envelope',
  minutes: 15,
  hook: 'Four required attributes, two ways to put them on the wire, and one pair of them — source and id — that is the only honest deduplication key you will ever get.',
  exercise: 'read+quiz',
  takeaway: {
    number: '4 required attributes',
    claim: 'Every CloudEvent carries id, source, specversion and type; routing reads type, and source + id together are the event\'s identity for deduplication.',
  },
  blocks: [
    {
      type: 'prose',
      md: `Both platforms in this course hand your code the same thing: a **CloudEvent**. It is a CNCF specification for describing "something happened" in a way that does not depend on who produced it or how it travelled. It is deliberately small — an envelope of attributes around an optional payload — and it is worth knowing exactly, because routing, filtering, retries and deduplication all operate on the envelope, never on your payload.`,
    },
    {
      type: 'prose',
      md: `## The four required attributes

| attribute | what it is | example from lab 04 |
|---|---|---|
| \`specversion\` | the CloudEvents version | \`1.0\` |
| \`id\` | unique **within its source** | \`order-1790422904\` |
| \`source\` | a URI-reference naming the producer context | \`/labs/broker-trigger/alice\` |
| \`type\` | what kind of occurrence this is, reverse-DNS by convention | \`dev.functionspace.order.created\` |

Common optional attributes: \`time\`, \`subject\` (what the event is about, within the source — e.g. an object key), \`datacontenttype\` (e.g. \`application/json\`) and \`dataschema\`. Anything else is an **extension** — a flat, lowercase name with a simple value. Knative adds its own (\`knativearrivaltime\`, \`knativeerrorcode\`); you saw them in lab 04.`,
    },
    {
      type: 'code',
      filename: 'a real event, as the display sink printed it (lab 04)',
      lang: 'text',
      code: `☁️  cloudevents.Event
Context Attributes,
  specversion: 1.0
  type: dev.knative.sources.ping
  source: /apis/v1/namespaces/default/pingsources/alice-ping
  id: 05e2c03e-9806-46d4-b3e5-7a093bf30c69
  time: 2026-09-26T11:42:00.29974704Z
Extensions,
  knativearrivaltime: 2026-09-26T11:42:00.304539405Z
Data,
  {"from":"alice"}`,
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'id is unique per source, not globally',
      md: `The spec says producers must make \`source\` + \`id\` unique for each distinct event, and that a **redelivered** event keeps the same \`id\`. So the pair is your deduplication key. \`id\` alone is not: two sources can legitimately both emit \`id: 1\`.`,
    },
    {
      type: 'prose',
      md: `## Two ways onto HTTP

The HTTP protocol binding defines two **content modes**, and a conforming receiver must accept both.

**Binary mode** puts every attribute in a header prefixed \`ce-\`, and the payload is the raw body. The \`datacontenttype\` attribute becomes the ordinary \`Content-Type\` header.

**Structured mode** puts the whole event — attributes and data — in the body as one JSON document, with \`Content-Type: application/cloudevents+json\`.`,
    },
    {
      type: 'code',
      filename: 'the same event, both modes',
      tabs: [
        {
          label: 'binary',
          lang: 'http',
          code: `POST / HTTP/1.1
ce-specversion: 1.0
ce-id: o-8
ce-source: /curl
ce-type: dev.functionspace.order.created
Content-Type: application/json

{"order":"o-8","sku":"fs-002","qty":4}`,
        },
        {
          label: 'structured',
          lang: 'http',
          code: `POST / HTTP/1.1
Content-Type: application/cloudevents+json

{"specversion":"1.0","id":"o-8","source":"/curl",
 "type":"dev.functionspace.order.created",
 "datacontenttype":"application/json",
 "data":{"order":"o-8","sku":"fs-002","qty":4}}`,
        },
      ],
    },
    {
      type: 'prose',
      md: `In lab 05 you sent binary and the Knative Python function answered in structured mode. Both are correct. Binary is what brokers and most Knative components prefer, for one practical reason: **a router can read the headers without parsing the body**. That is why triggers filter on attributes — \`type\`, \`source\`, extensions — and never on fields inside your JSON.`,
    },
    {
      type: 'diagram',
      caption: 'fig 1 — who reads what',
      height: 60,
      nodes: [
        { id: 'prod', x: 2, y: 22, w: 16, h: 14, label: 'producer', sub: 'sets id, source, type' },
        { id: 'hdr', x: 26, y: 6, w: 22, h: 12, label: 'ce-* headers', sub: 'the envelope' },
        { id: 'body', x: 26, y: 40, w: 22, h: 12, label: 'body', sub: 'your data' },
        { id: 'router', x: 56, y: 6, w: 18, h: 12, label: 'broker / trigger', sub: 'reads headers only' },
        { id: 'fn', x: 80, y: 22, w: 18, h: 14, label: 'handler', sub: 'reads both' },
      ],
      edges: [
        { from: 'prod', to: 'hdr' },
        { from: 'prod', to: 'body' },
        { from: 'hdr', to: 'router', label: 'filter on type' },
        { from: 'router', to: 'fn', label: 'deliver' },
        { from: 'body', to: 'fn', label: 'untouched' },
      ],
      steps: [
        { caption: 'The producer decides the identity of the event — id, source, type — and puts its own payload in the body.', active: ['prod'] },
        { caption: 'In binary mode the attributes travel as ce-* HTTP headers; the payload is the body, byte for byte.', active: ['prod', 'hdr', 'body'], edges: ['prod->hdr', 'prod->body'] },
        { caption: 'A broker or trigger routes by reading headers alone. It never needs to parse, or even understand, your JSON.', active: ['hdr', 'router'], edges: ['hdr->router'] },
        { caption: 'The handler receives both: the SDK decodes the envelope into attributes and hands you the data. Filters you wish you had on the body must be written in code.', active: ['router', 'fn', 'body'], edges: ['router->fn', 'body->fn'] },
      ],
    },
    {
      type: 'vendor',
      snapshot: '2026-09',
      title: 'The event types DataEngine emits for object events',
      systems: ['vast-dataengine'],
      sources: [
        'https://github.com/vast-data/dataengine-cli/blob/main/docs/references/commands/vastde_functions_invoke.md',
        'https://github.com/vast-data/dataengine-cli/blob/main/docs/references/commands/vastde_triggers_create_element.md',
      ],
      md: `Documented in the public \`vastde\` CLI reference: element triggers subscribe to \`ObjectCreated:*\`, \`ObjectRemoved:*\`, \`ObjectTagging:Put\` and \`ObjectTagging:Delete\` on a bucket, and the CloudEvent type for a created object is \`vastdata.com:Element.ObjectCreated\` (the default type \`vastde functions invoke --generate-event\` sends). Note the style: a colon-separated type rather than Knative's dotted reverse-DNS. Both are legal — \`type\` is an opaque string to the spec. D2.L2 opens up the payload.`,
    },
    {
      type: 'isomorphism',
      title: 'you have seen this envelope before',
      pairs: [
        { os: 'email headers', osLine: 'From, Message-ID, Subject route and thread a message without reading its body.', llm: 'CloudEvent attributes', llmLine: 'source, id, type route and deduplicate an event without reading its data.' },
        { os: 'Message-ID', osLine: 'Mail clients drop a duplicate message with the same Message-ID.', llm: 'source + id', llmLine: 'Handlers drop a redelivered event with the same source and id.' },
      ],
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'You want a Knative trigger to route only orders whose JSON body has "priority": "high". What is the right design?',
          options: [
            'Add a trigger filter on data.priority=high',
            'Have the producer set a CloudEvent attribute (an extension, or a distinct type) for high-priority orders, and filter on that',
            'Filter in the broker by parsing the JSON body',
            'Send all orders to one function and drop the rest with an if-statement — filters cannot do this',
          ],
          correct: [1],
          explanation: 'Routing reads the envelope, not the body, so routing information belongs in attributes: a type such as ...order.created.priority or an extension like priority=high. Filtering inside the function works but pays a delivery (and possibly a cold start) for every event you throw away — a cost, not just a style issue.',
        },
        {
          q: 'Your handler stores results keyed by the event id. Two different producers both emit events with id "1". What happens, and what should the key be?',
          options: [
            'Nothing — ids are globally unique by spec',
            'One result overwrites the other; key by source + id',
            'The broker rejects the second event as a duplicate',
            'Key by time, which is always unique',
          ],
          correct: [1],
          explanation: 'id is only unique within a source; the spec makes source + id the identity. Timestamps are not unique and are optional. No broker in this course deduplicates for you.',
        },
        {
          q: 'A partner integration sends Content-Type: application/cloudevents+json and your hand-written HTTP handler reads the ce-type header — which is missing. What is going on?',
          options: [
            'The partner is sending invalid CloudEvents',
            'They are using structured mode: the attributes are inside the JSON body, and a conforming receiver must accept that',
            'The load balancer stripped the headers',
            'application/cloudevents+json means the event has no type',
          ],
          correct: [1],
          explanation: 'Structured mode carries all attributes in the body. Both modes are valid, and receivers must handle both — which is the main reason to parse events with an SDK rather than by hand.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'Going deeper',
      md: `- CloudEvents core spec (github.com/cloudevents/spec, \`cloudevents/spec.md\`) — the "Context Attributes" and "Extension Context Attributes" sections, and the rule that redeliveries keep their id.
- HTTP protocol binding (\`cloudevents/bindings/http-protocol-binding.md\`) — binary vs structured vs batched mode.
- The Knative event registry (\`kubectl get eventtypes\`) — Knative can record which types flow through a broker; try it after lab 04.`,
    },
  ],
}

export default lesson
