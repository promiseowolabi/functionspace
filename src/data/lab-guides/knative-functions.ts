import type { LabGuide } from './types'

const guide: LabGuide = {
  id: 'knative-functions',
  requires: ['the kind cluster and localhost:5001 registry from lab 00', 'func ≥ 1.23', 'kubectl', 'curl', 'uv (for the local test — it fetches a matching Python)'],
  blocks: [
    {
      type: 'prose',
      md: `## What you will build

A Python function that receives an \`order.created\` CloudEvent and **replies** with an \`order.priced\` CloudEvent. You will scaffold it with \`func\`, test it locally, build it into the kind registry, deploy it, invoke it two ways, and then read the Knative Service \`func\` wrote so that none of it is a mystery.`,
    },
    {
      type: 'prose',
      md: `## 1. Scaffold

Run this **inside the lab folder** — \`verify.sh\` looks for the project next to itself.`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `export PREFIX=alice
func create -l python -t cloudevents $PREFIX-fn
find $PREFIX-fn -type f | sort`,
    },
    {
      type: 'code',
      filename: 'output',
      lang: 'text',
      code: `alice-fn/.func/local.yaml
alice-fn/.funcignore
alice-fn/.gitignore
alice-fn/func.yaml
alice-fn/function/__init__.py
alice-fn/function/func.py
alice-fn/pyproject.toml
alice-fn/README.md
alice-fn/tests/test_func.py`,
    },
    {
      type: 'prose',
      md: `Three files matter. **\`func.yaml\`** is the function's manifest — name, runtime, and (after the first deploy) the registry, builder and image digest. **\`function/func.py\`** is your code. **\`pyproject.toml\`** lists dependencies; the template pulls in \`cloudevents\`, \`httpx\` and the test tools.

Open \`function/func.py\`. The Python template is a class with lifecycle hooks: \`start(cfg)\` once per instance, \`handle(scope, receive, send)\` per event, \`stop()\` on shutdown, plus \`alive()\` and \`ready()\` for the probes. Hold on to that shape — DataEngine's \`init(ctx)\` / \`handler(ctx, event)\` in D1 is the same idea with different names.`,
    },
    {
      type: 'prose',
      md: `## 2. Write the handler

Replace the template with the pricing function from \`solution/\` (read it first — about 80 lines, a third of them comments), or write your own that meets the same contract: price valid orders, reject invalid ones with a 400.`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `cp solution/func.py      $PREFIX-fn/function/func.py
cp solution/test_func.py $PREFIX-fn/tests/test_func.py`,
    },
    {
      type: 'code',
      filename: 'function/func.py (the part that matters)',
      lang: 'python',
      code: `class Function:
    def start(self, cfg):
        # once per instance: at startup or on scale-up
        self.who = cfg.get("PREFIX", "unknown")

    async def handle(self, scope, receive, send):
        request = scope["event"]                 # already decoded by the middleware
        data = request.get_data() or {}
        unit = PRICES.get(data.get("sku", ""))
        qty = int(data.get("qty", 1))
        await send(CloudEvent(
            attributes={
                "type": "dev.functionspace.order.priced",
                "source": f"/functions/{self.who}-fn",
                "id": f"priced-{request.get_id()}",
                "datacontenttype": "application/json",
            },
            data={..., "total_pence": (unit or 0) * qty,
                  "priced_by": os.environ.get("K_REVISION", "local")},
        ))`,
    },
    {
      type: 'prose',
      md: `The test calls \`handle\` directly with a fake \`send\` — no server, no cluster. Run it before you build anything. Use \`uv\`, not \`python3 -m venv\`: the OS Python may be too old for the scaffold (macOS ships 3.9, whose pip cannot install a \`pyproject.toml\`-only project in editable mode), and \`uv venv\` picks or downloads an interpreter that satisfies the project's \`requires-python\`:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `cd $PREFIX-fn
echo .venv >> .funcignore          # before creating it — see below
uv venv && . .venv/bin/activate
uv pip install -q -e . && python -m pytest -q
deactivate`,
    },
    {
      type: 'callout',
      variant: 'segfault',
      title: 'Error: project may not contain absolute links',
      md: `A virtualenv is full of absolute symlinks to the Python it was created from. If it sits inside the project and is not excluded, \`func deploy\` refuses to build with exactly this error — found while writing this lab. Listing \`.venv\` in \`.funcignore\` keeps it out of the build context (and out of the rebuild fingerprint).`,
    },
    {
      type: 'prose',
      md: `## 3. Build and deploy

\`func deploy\` builds an image, pushes it to a registry, and creates or updates a Knative Service. You choose the **builder**. The default, \`pack\`, uses Cloud Native Buildpacks; \`host\` builds on your machine without a builder image and is much faster for a lab:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `func deploy --builder host --registry localhost:5001 --env PREFIX=$PREFIX`,
    },
    {
      type: 'code',
      filename: 'output (tail)',
      lang: 'text',
      code: `Successfully installed … cloudevents-2.2.0 … func-python-0.8.1 function-0.1.0 hypercorn-0.17.3 …
🙌 Function built: localhost:5001/alice-fn:latest
🎯 Creating Triggers on the cluster
✅ Function deployed in namespace "default" and exposed at URL:
   http://alice-fn.default.127.0.0.1.sslip.io`,
    },
    {
      type: 'prose',
      md: `That took **18 s** on the reference machine. Note what got installed: \`func-python\` and \`hypercorn\` — the runtime that serves your class as an ASGI app and decodes CloudEvents before \`handle\` sees them. You wrote the class; the template supplied the server.`,
    },
    {
      type: 'prose',
      md: `## 4. Invoke it two ways`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `func invoke --type dev.functionspace.order.created \\
  --data '{"order":"o-7","sku":"fs-001","qty":2}'`,
    },
    {
      type: 'code',
      filename: 'output',
      lang: 'text',
      code: `Context Attributes,
  specversion: 1.0
  type: dev.functionspace.order.priced
  source: /functions/alice-fn
  id: priced-fbd5a803-99a8-45cf-be79-5cfd09a0e361
Data,
   {"order": "o-7", "sku": "fs-001", "qty": 2, "known_sku": true, "total_pence": 2500, "priced_by": "alice-fn-00001"}`,
    },
    {
      type: 'prose',
      md: `Now without \`func\` — a plain binary-mode CloudEvent from \`curl\`, with \`-i\` to see the reply headers:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `curl -s -i http://$PREFIX-fn.default.127.0.0.1.sslip.io \\
  -H "Ce-Id: o-8" -H "Ce-Specversion: 1.0" \\
  -H "Ce-Type: dev.functionspace.order.created" -H "Ce-Source: /curl" \\
  -H "Content-Type: application/json" \\
  -d '{"order":"o-8","sku":"fs-002","qty":4}'`,
    },
    {
      type: 'code',
      filename: 'output',
      lang: 'text',
      code: `HTTP/1.1 200 OK
content-type: application/cloudevents+json
server: envoy

{"type": "dev.functionspace.order.priced", "source": "/functions/alice-fn", "id": "priced-o-8",
 "specversion": "1.0", "data": {"order": "o-8", "sku": "fs-002", "qty": 4, "known_sku": true,
 "total_pence": 1996, "priced_by": "alice-fn-00001"}}`,
    },
    {
      type: 'prose',
      md: `You sent **binary** mode (attributes in \`Ce-*\` headers) and got back **structured** mode (the whole event as JSON, \`content-type: application/cloudevents+json\`). Both are valid CloudEvents over HTTP; a conforming receiver must accept either. If a reply like this goes back to a Broker, it becomes a new event on the broker — which is how K2.L6's reply chains work.`,
    },
    {
      type: 'prose',
      md: `## 5. Read what func wrote

\`func\` is a client. Everything it did is visible as ordinary objects:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `kubectl get ksvc $PREFIX-fn -o jsonpath='{.metadata.labels}{"\\n"}{.spec.template.spec.containers[0].image}{"\\n"}{.spec.template.spec.containers[0].env}{"\\n"}'
cat func.yaml
curl -s http://localhost:5001/v2/_catalog`,
    },
    {
      type: 'code',
      filename: 'output (trimmed)',
      lang: 'text',
      code: `{"boson.dev/function":"true","function.knative.dev/name":"alice-fn","function.knative.dev/runtime":"python"}
localhost:5001/alice-fn@sha256:2508f80d…
[{"name":"BUILT","value":"20260926T124416"},{"name":"PREFIX","value":"alice"},{"name":"ADDRESS","value":"0.0.0.0"}]

build:
  builder: host
run:
  envs:
  - name: PREFIX
    value: alice
deploy:
  image: localhost:5001/alice-fn@sha256:2508f80d…

{"repositories":["alice-fn"]}`,
    },
    {
      type: 'prose',
      md: `- It is a normal Knative Service with three \`function.knative.dev\`/\`boson.dev\` **labels** — that is the only thing marking it as "a function".
- The image is pinned **by digest**, just like the revision in lab 01 — and \`func\` wrote the same digest back into \`func.yaml\`, so the file records exactly what is deployed.
- \`func\` injected a \`BUILT\` timestamp env var. Its value changes on every build, which **guarantees a new Revision** even if nothing else did — so a rebuild always rolls out.`,
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'Hand edits and func.yaml',
      md: `If you \`kubectl edit\` the Service, the next \`func deploy\` overwrites your change with what \`func.yaml\` says. Put settings (env, scale annotations, resources) in \`func.yaml\` — or stop using \`func deploy\` for that service. Pick one source of truth.`,
    },
    {
      type: 'prose',
      md: `## 6. Verify`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `cd ..         # back to the lab folder
./verify.sh`,
    },
    {
      type: 'deepdive',
      title: 'Troubleshooting',
      md: `- **\`project\` fails** — the project must be at \`./$PREFIX-fn/func.yaml\`, next to \`verify.sh\`. If you created it elsewhere, move it.
- **\`image\` fails** — the kind registry is not running or was not used. \`docker ps | grep kind-registry\`; re-run \`func deploy\` with \`--registry localhost:5001\`.
- **Deploy fails with "no such host" or an HTTPS error pushing to localhost:5001** — add \`--registry-insecure\`; the lab registry is plain HTTP.
- **\`--builder host\` is not supported on your platform** — use \`--builder pack\` (the default). It is slower the first time because it pulls the buildpack builder image.`,
    },
  ],
  cleanup: [
    {
      type: 'code',
      lang: 'bash',
      code: `cd $PREFIX-fn && func delete && cd ..`,
    },
  ],
}

export default guide
