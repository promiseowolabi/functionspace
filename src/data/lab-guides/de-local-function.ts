import type { LabGuide } from './types'

const guide: LabGuide = {
  id: 'de-local-function',
  requires: ['../de.env from lab 06', 'vastde v5.5', 'Docker that passes lab 06\'s ./vastde-docker.sh status', '~5 GB free disk for the build'],
  blocks: [
    {
      type: 'prose',
      md: `## What you will build

A DataEngine function, built into a container image by the DataEngine builder, run on your laptop, and sent CloudEvents — with **no cluster involved**. Everything in this lab happens in Docker. Labs 08–10 deploy exactly this image to your VAST cluster, so what you prove here is what runs there.

Along the way you will hit the three facts about the DataEngine runtime that the course calls out in D1.L4: what \`event.get_data()\` really returns, where a handler's return value goes, and how strict the runtime is about the events it accepts.`,
    },
    {
      type: 'prose',
      md: `## 1. Scaffold, then read what you got`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `. ../de.env                       # PREFIX and friends
vastde functions init python-pip scratch-fn
ls scratch-fn
# Aptfile  customDeps  main.py  README.md  requirements.txt
cat scratch-fn/main.py`,
    },
    {
      type: 'code',
      filename: 'scratch-fn/main.py',
      lang: 'python',
      code: `def init(ctx):
    # One time initialization comes here
    ctx.logger.info("Initialized...")

def handler(ctx, event):
    # Events Processing comes here
    ctx.logger.info(f"Handler {event}")
    return "Hello World"`,
    },
    {
      type: 'prose',
      md: `Two functions, fixed names. \`init(ctx)\` runs once per container; \`handler(ctx, event)\` runs once per event. \`requirements.txt\` takes pip packages, \`Aptfile\` takes OS packages, \`customDeps\` takes paths to local libraries. That scaffold is a template for your own functions; for this lab you will use the prepared one in \`src/\` — delete \`scratch-fn\` when you have read it.`,
    },
    {
      type: 'prose',
      md: `## 2. Read the echo function

\`src/main.py\` logs one line per event: which revision handled it, the event type, and — for object events — the bucket and key. Read the docstring: it encodes the two surprises this lab will show you.`,
    },
    {
      type: 'code',
      filename: 'src/main.py (core)',
      lang: 'python',
      code: `REVISION = 1  # lab 10 changes this to 2

def init(ctx):
    ctx.logger.info("echo init: function=%s revision=%s", ctx.function_name, REVISION)

def handler(ctx, event):
    attrs = event.get_attributes()
    key = getattr(event, "object_key", None)
    if key:
        ctx.logger.info("echo r%s: %s bucket=%s key=%s id=%s",
                        REVISION, attrs["type"], event.bucket, key, attrs["id"])
    else:
        ctx.logger.info("echo r%s: %s id=%s payload=%s",
                        REVISION, attrs["type"], attrs["id"], _payload(event))
    return {"revision": REVISION, "type": attrs["type"], "key": key}`,
    },
    {
      type: 'prose',
      md: `## 3. Build

The builder runs in Docker from the image named in your CLI config — in the Docker 28 daemon from lab 06 if your \`de.env\` sets \`DOCKER_HOST\`, which is why every lab starts with \`. ../de.env\`. It downloads a lot the first time and writes several gigabytes of scratch data to your temp directory — point that somewhere with room:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `mkdir -p ~/.cache/vastde-tmp
TMPDIR=$HOME/.cache/vastde-tmp vastde functions build $PREFIX-echo -t src -H main.py -V "3.12.*"`,
    },
    {
      type: 'code',
      filename: 'output (tail)',
      lang: 'text',
      code: `Python version 3.12.* resolved to 3.12.13
Building alice-echo:latest
[Started] Python Builder: alice-echo:latest
[Completed] Python Builder: alice-echo:latest
Build completed: alice-echo:latest`,
    },
    {
      type: 'callout',
      variant: 'segfault',
      title: 'disk quota exceeded',
      md: `Found while writing this lab: on a machine where \`/tmp\` is a RAM-backed tmpfs, the build failed with \`failed to fetch base layers: … disk quota exceeded\`. The builder is Cloud Native Buildpacks underneath, and it stages image layers under \`$TMPDIR\` — and leaves hundreds of megabytes per build there afterwards. Setting \`TMPDIR\` to a directory on real disk fixed it; clear that directory now and then.`,
    },
    {
      type: 'prose',
      md: `The build took **154–179 s** on the reference machine and produced a **1.9 GB** image. Look at what built it:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `TMPDIR=$HOME/.cache/vastde-tmp vastde functions build $PREFIX-echo -t src -H main.py -V "3.12.*" --save-build-log
grep -E '^.*-> ' src/build_*.log | head`,
    },
    {
      type: 'code',
      filename: 'output (trimmed)',
      lang: 'text',
      code: `-> vast-buildpack@1.0.0
-> vast-constraints-buildpack@1.0.0
-> custom-deps-buildpack@1.0.0
-> paketo-buildpacks/python@2.59.0
-> paketo-buildpacks/ca-certificates@3.12.6
-> paketo-buildpacks/cpython@1.18.40
…  run image: paketobuildpacks/run-jammy-full`,
    },
    {
      type: 'prose',
      md: `It is **buildpacks** — Paketo's Python buildpacks plus VAST's own, on the Paketo jammy run image. That is the same family as \`func\`'s default \`pack\` builder in K3.L2, which explains the size and the build time.`,
    },
    {
      type: 'prose',
      md: `## 4. Run it locally`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `vastde functions localrun $PREFIX-echo --detach
docker logs $(docker ps -q --filter ancestor=$PREFIX-echo:latest) 2>&1 | grep -E 'Runtime|Uvicorn|echo init|ready'
curl -s localhost:8080/readiness     # Ready`,
    },
    {
      type: 'code',
      filename: 'output (trimmed)',
      lang: 'text',
      code: `Starting VAST DataEngine Runtime
Runtime is listening on port 8080
Uvicorn running on http://0.0.0.0:8080
echo init: function=function-238b7a72-… revision=1
Init Handler Completed, duration: 0:00:00.001635
Handler is now ready to accept requests`,
    },
    {
      type: 'prose',
      md: `A Python web server (Uvicorn) on port 8080, with \`/readiness\` and \`/liveness\` endpoints. \`init\` ran before the server declared itself ready — so a slow \`init\` delays readiness, exactly like F0.L3's init term.`,
    },
    {
      type: 'prose',
      md: `## 5. Invoke it

First with an event the CLI generates:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `vastde functions invoke --generate-event --url http://localhost:8080/
# Generated CloudEvent with type: vastdata.com:Element.ObjectCreated
# CloudEvent sent successfully (Status: 204)
docker logs $(docker ps -q --filter ancestor=$PREFIX-echo:latest) 2>&1 | grep 'echo r1'
# echo r1: vastdata.com:Element.ObjectCreated id=631a4e56-… payload={'msg': 'hello'}`,
    },
    {
      type: 'prose',
      md: `**204** — no content — even though \`handler\` returned a dict. The runtime does not send your return value back to the caller. It answers 204, and only if the pipeline configured a sink does it wrap the return value in a new CloudEvent and POST it there (the log says \`No sink URL configured\`). D1.L4 digs into that.

Now with the hand-written event in \`cloudevent.yaml\`. Read its comments first, then:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `vastde functions invoke --event cloudevent.yaml --url http://localhost:8080/
docker logs $(docker ps -q --filter ancestor=$PREFIX-echo:latest) 2>&1 | grep 'echo r1' | tail -1
# echo r1: vastdata.com:Element.ObjectCreated bucket=lab-bucket key=alice/hello.csv id=7c1e2d3f-…`,
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'The runtime is strict about events',
      md: `Found while writing this lab. A first draft of \`cloudevent.yaml\` without \`subject\` got **500** — \`malformed vast event: broker: 'NoneType' object has no attribute 'split'\`. Adding \`subject\` but keeping \`id: lab07-0001\` still got 500 — the id seeds the trace id and must be hex or a UUID. And \`event.object_key\` stayed \`None\` until the event carried an \`elementpath\` extension of the form \`<bucket>/<key>\`. Real triggers produce all of these; only hand-written test events trip on them.`,
    },
    {
      type: 'prose',
      md: `## 6. Verify`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `./verify.sh`,
    },
    {
      type: 'deepdive',
      title: 'Troubleshooting',
      md: `- **\`image\` fails** — the build did not finish; re-run it with \`--save-build-log\` and read the log. Name the image exactly \`$PREFIX-echo\`.
- **\`localrun\` fails** — no container on 8080. \`docker ps\`; a previous \`localrun\` may hold the port — \`docker rm -f\` it.
- **\`invoke\` fails with 500** — you edited \`cloudevent.yaml\`; see the callout above, or \`docker logs\` for the \`malformed vast event\` line.
- **Builder image pull fails** — the builder image is in your CLI config (\`vastde config view\`); it must match your CLI version.
- **\`client version 1.38 is too old. Minimum supported API version is 1.40\`** (or 1.44) — your Docker is Engine 29+ and this shell is not using the Docker 28 daemon. \`. ../de.env\` in this shell; if it still fails, redo lab 06 step 7.
- **\`failed to export: saving image: failed to fetch base layers: open /tmp/imgutil.local.image…: no such file or directory\`**, ending in \`executing lifecycle: failed with status code: 62\` — the daemon accepted the API but stores images in the containerd store, which the builder cannot save into. Same fix: lab 06 step 7.
- **\`docker images\` does not list \`$PREFIX-echo\`** — you are asking your usual Docker; the image is in the Docker 28 daemon. \`. ../de.env\` first.`,
    },
  ],
  cleanup: [
    {
      type: 'code',
      lang: 'bash',
      code: `docker rm -f $(docker ps -q --filter ancestor=$PREFIX-echo:latest)
rm -rf ~/.cache/vastde-tmp/*        # build scratch
# keep the $PREFIX-echo:latest image — lab 08 pushes it`,
    },
  ],
}

export default guide
