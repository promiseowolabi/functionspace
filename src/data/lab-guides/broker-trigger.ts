import type { LabGuide } from './types'

const guide: LabGuide = {
  id: 'broker-trigger',
  requires: ['the kind cluster from lab 00', 'kn', 'kubectl'],
  blocks: [
    {
      type: 'prose',
      md: `## What you will build

\`\`\`
PingSource ──▶ Broker ──▶ Trigger (type = dev.knative.sources.ping)       ──▶ display
                 ▲    └─▶ Trigger (type = dev.functionspace.order.created) ──▶ flaky (always 503)
   send-order.sh ┘                         │ 2 retries, exponential backoff
                                           └──────────────▶ dead-letter sink (dls)
\`\`\`

No consumer's answer goes back to the producer here. The producers post into a **Broker**; **Triggers** decide who receives what by matching CloudEvent attributes; a **delivery policy** decides what happens when a subscriber keeps failing.`,
    },
    {
      type: 'prose',
      md: `## 1. The broker and three sinks

\`event_display\` is a Knative sample that logs every CloudEvent it receives. You need two of them — one for good events, one to be the dead-letter sink — plus a subscriber that always fails. \`--scale-min 1\` keeps the two displays running so their logs survive; a sink that scales to zero takes its logs with it.`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `export PREFIX=alice
ED=gcr.io/knative-releases/knative.dev/eventing/cmd/event_display

kn broker create $PREFIX-broker
kn service create $PREFIX-display --image $ED --scale-min 1
kn service create $PREFIX-dls     --image $ED --scale-min 1
kn service create $PREFIX-flaky   --image hashicorp/http-echo:1.0 --port 5678 \\
  --arg=-status-code=503 --arg=-text=nope

kn broker list`,
    },
    {
      type: 'code',
      filename: 'output',
      lang: 'text',
      code: `NAME             URL                                                                             READY
alice-broker     http://broker-ingress.knative-eventing.svc.cluster.local/default/alice-broker     True
example-broker   http://broker-ingress.knative-eventing.svc.cluster.local/default/example-broker   True`,
    },
    {
      type: 'prose',
      md: `Look at the URLs: **every broker in the cluster has the same host**, \`broker-ingress.knative-eventing\`, and differs only by path. There is one multi-tenant ingress deployment and one filter deployment (you saw them in lab 00); a Broker object is a *namespace in their routing table*, not a new process.`,
    },
    {
      type: 'prose',
      md: `## 2. A source and the first trigger`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `kn source ping create $PREFIX-ping --schedule "*/1 * * * *" \\
  --data "{\\"from\\":\\"$PREFIX\\"}" --sink broker:$PREFIX-broker

kn trigger create $PREFIX-heartbeat --broker $PREFIX-broker \\
  --filter type=dev.knative.sources.ping --sink ksvc:$PREFIX-display

kubectl get deploy -n knative-eventing pingsource-mt-adapter`,
    },
    {
      type: 'prose',
      md: `The ping adapter that sat at **0/0** in lab 00 is now **1/1** — the eventing controller scaled it up because a PingSource exists. Wait for the top of the next minute, then read the display's log:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `kubectl logs -l serving.knative.dev/service=$PREFIX-display -c user-container --tail=20`,
    },
    {
      type: 'code',
      filename: 'output',
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
      type: 'prose',
      md: `The trigger matched on \`type\` — a CloudEvent **context attribute**, carried as an HTTP header (\`Ce-Type\`) — without ever parsing the body. \`knativearrivaltime\` is an extension the broker ingress added when the event arrived.`,
    },
    {
      type: 'prose',
      md: `## 3. A trigger with a delivery policy

\`kn trigger create\` has no flags for delivery, so this one is YAML. Read \`fail-trigger.yaml\` before applying it: it filters on \`type: dev.functionspace.order.created\`, sends to the flaky service, and says **retry 2 times, exponential backoff from 1 s, then give up to the dead-letter sink**.`,
    },
    {
      type: 'code',
      filename: 'fail-trigger.yaml (the delivery block)',
      lang: 'yaml',
      code: `  delivery:
    retry: 2
    backoffPolicy: exponential
    backoffDelay: PT1S
    deadLetterSink:
      ref:
        apiVersion: serving.knative.dev/v1
        kind: Service
        name: PREFIX-dls`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `sed "s/PREFIX/$PREFIX/g" fail-trigger.yaml | kubectl apply -f -
kn trigger list`,
    },
    {
      type: 'prose',
      md: `## 4. Send an order and watch it die properly

The broker ingress is only reachable inside the cluster, so \`send-order.sh\` runs \`curl\` in a throwaway pod and posts one CloudEvent in **binary mode** — attributes as \`Ce-*\` headers, data as the body.`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `./send-order.sh
# broker ingress answered HTTP 202
# sent event id order-1790422904`,
    },
    {
      type: 'prose',
      md: `**202 Accepted** is the broker saying "I have it" — not that anyone processed it; this very order is about to be dead-lettered. On the default in-memory broker the 202 is also not instant: it arrives only after every matching trigger has finished, including this one's retries (K2.L2 measures it). Now look at the flaky service's own access log, then at the dead-letter sink:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `kubectl logs -l serving.knative.dev/service=$PREFIX-flaky -c user-container --tail=5
kubectl logs -l serving.knative.dev/service=$PREFIX-dls -c user-container --tail=25`,
    },
    {
      type: 'code',
      filename: 'output',
      lang: 'text',
      code: `11:42:06 … "POST / HTTP/1.1" 503 5 "Go-http-client/1.1"
11:42:07 … "POST / HTTP/1.1" 503 5 "Go-http-client/1.1"
11:42:09 … "POST / HTTP/1.1" 503 5 "Go-http-client/1.1"

☁️  cloudevents.Event
Context Attributes,
  type: dev.functionspace.order.created
  source: /labs/broker-trigger/alice
  id: order-1790422904
Extensions,
  knativearrivaltime: 2026-09-26T11:42:04.503295255Z
  knativebrokerttl: 255
  knativeerrorcode: 503
  knativeerrordata: bm9wZQo=
  knativeerrordest: http://alice-flaky.default.svc.cluster.local
Data,
  { "order": "order-1790422904", "sku": "fs-001", "qty": 1 }`,
    },
    {
      type: 'prose',
      md: `Account for it:

- **Three attempts** — the original plus \`retry: 2\`.
- **Gaps of 1 s then 2 s** — exponential backoff waits \`backoffDelay × 2^(n−1)\` before retry n: 1 s, then 2 s. With \`retry: 5\` the last gap alone would be 16 s, and the event would reach the DLS about 31 s after the first failure.
- The dead-lettered event is the **original event**, same \`id\`, plus \`knativeerror*\` extensions telling you where it failed (\`knativeerrordest\`), how (\`knativeerrorcode: 503\`), and what the subscriber said (\`knativeerrordata\` — base64 of \`nope\\n\`).
- The flaky service was **scaled to zero** when the first attempt arrived. The activator held that request through the cold start; the retries were not caused by the cold start.`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `echo bm9wZQo= | base64 -d      # nope`,
    },
    {
      type: 'prose',
      md: `## 5. Verify`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `./verify.sh`,
    },
    {
      type: 'deepdive',
      title: 'Troubleshooting',
      md: `- **\`delivered\` fails** — the PingSource fires at the top of each minute; wait for one. If the display pod restarted, its earlier logs are gone — wait for the next ping.
- **\`dead-lettered\` fails** — run \`./send-order.sh\` again, wait ~10 s, re-run verify. If the DLS log is empty, check \`kubectl get trigger $PREFIX-orders-fail\` is Ready: a trigger whose DLS reference does not resolve stays not-Ready.
- **\`send-order.sh\` takes ~30 s the first time** — it is pulling the curl image into the node.`,
    },
  ],
  cleanup: [
    {
      type: 'code',
      lang: 'bash',
      code: `kn trigger delete $PREFIX-heartbeat
kn trigger delete $PREFIX-orders-fail
kn source ping delete $PREFIX-ping
kn service delete $PREFIX-display $PREFIX-dls $PREFIX-flaky
kn broker delete $PREFIX-broker`,
    },
  ],
}

export default guide
