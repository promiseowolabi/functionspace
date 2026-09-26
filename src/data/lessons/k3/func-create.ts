import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'k3.l1',
  slug: 'func-create',
  trackId: 'k3',
  index: 1,
  title: 'func create',
  minutes: 14,
  hook: 'Seven languages, two templates each, and one decision that matters more than the language: does your function answer HTTP requests, or consume CloudEvents?',
  exercise: 'lab+quiz',
  takeaway: {
    number: '7 × 2 = 14 templates',
    claim: 'func ships 7 languages × 2 templates (http, cloudevents); the template fixes the contract your code implements, and func.yaml — not the cluster — is the record of what the function is and where it was deployed.',
  },
  blocks: [
    {
      type: 'prose',
      md: `Knative Serving runs any container that listens on a port. That is powerful and it is also a lot of work: you pick a web framework, write a Dockerfile, handle health checks, parse CloudEvents yourself. **Knative Functions** — the \`func\` CLI — removes that work by fixing a small programming model per language and generating everything else.

The trade is the usual one for a framework: less code, less choice. You write a handler; \`func\` owns the server, the image, and the Knative Service.`,
    },
    {
      type: 'code',
      filename: 'what func 1.23 offers',
      lang: 'bash',
      code: `func languages
# go  node  python  quarkus  rust  springboot  typescript

func templates
# LANGUAGE     TEMPLATE
# go           cloudevents
# go           http
# …            (every language has both)`,
    },
    {
      type: 'prose',
      md: `## The one choice that matters: http or cloudevents

| template | your code receives | your code returns | natural caller |
|---|---|---|---|
| \`http\` | an HTTP request | an HTTP response | a browser, an API client, another service |
| \`cloudevents\` | a decoded CloudEvent | nothing, or a CloudEvent | a broker trigger, a source, a channel |

Both end up as the same kind of Knative Service. The difference is the contract (F0.L1): what arrives and what counts as an answer. A \`cloudevents\` function behind a trigger that returns an event is a step in a reply chain (K2.L6); an \`http\` function is an API.

Pick by who calls it, not by language. You can call a cloudevents function with \`curl\` (lab 05 does), but if your callers are people and browsers, you want \`http\`.`,
    },
    {
      type: 'prose',
      md: `## What the scaffold writes

For \`func create -l python -t cloudevents alice-fn\`:

| file | purpose |
|---|---|
| \`func.yaml\` | the manifest: name, runtime, invoke type — and after deploy, registry, builder, image digest |
| \`function/func.py\` | your handler class |
| \`pyproject.toml\` | dependencies (the template adds \`cloudevents\`, \`httpx\`, test tools) |
| \`tests/test_func.py\` | a unit test that calls the handler with a fake \`send\` |
| \`.funcignore\` | files kept out of the build context |
| \`.func/\` | local state (build fingerprints); do not commit |

The fresh \`func.yaml\` is five lines long: \`specVersion\`, \`name\`, \`runtime: python\`, \`created\`, \`invoke: cloudevent\`. Everything else is added by the commands you run next.`,
    },
    {
      type: 'prose',
      md: `## The Python programming model

The Python templates are a class with lifecycle hooks, served as an ASGI application:`,
    },
    {
      type: 'code',
      filename: 'function/func.py (shape)',
      lang: 'python',
      code: `def new():
    return Function()

class Function:
    def start(self, cfg):        # once per instance: startup or scale-up
        ...
    async def handle(self, scope, receive, send):   # every request / event
        event = scope["event"]   # cloudevents template: already decoded
        await send(reply)        # optional reply CloudEvent
    def stop(self):              # on shutdown (scale-down, update)
        ...
    def alive(self): return True, "Alive"     # liveness probe
    def ready(self): return True, "Ready"     # readiness probe`,
    },
    {
      type: 'prose',
      md: `Map that onto F0.L3's cold start: \`start\` is the **runtime init** term — put client construction and model loading there, once per instance, not in \`handle\`. \`ready\` gates the **readiness** term — return \`False\` until \`start\` has finished anything slow, and Knative will hold traffic until you are ready rather than send it to a half-initialised pod.`,
    },
    {
      type: 'isomorphism',
      title: 'the same lifecycle on DataEngine',
      pairs: [
        { os: 'start(cfg)', osLine: 'Knative Functions (Python): once per instance, before any event.', llm: 'init(ctx)', llmLine: 'DataEngine: once when the function container starts (D1.L4).' },
        { os: 'handle(scope, receive, send)', osLine: 'Knative Functions: once per request or event.', llm: 'handler(ctx, event)', llmLine: 'DataEngine: once per CloudEvent delivered by the pipeline.' },
      ],
    },
    {
      type: 'vendor',
      snapshot: '2026-09',
      title: 'func v1.23 languages, templates and scaffold',
      systems: ['knative-functions'],
      sources: ['https://knative.dev/docs/functions/'],
      md: `Observed with \`func\` from the knative-v1.23.3 release (\`func version\` prints \`v0.50.3\`): \`func languages\` lists go, node, python, quarkus, rust, springboot and typescript; \`func templates\` lists \`cloudevents\` and \`http\` for each. The Python template scaffolds an ASGI class with \`start\`, \`handle\`, \`stop\`, \`alive\` and \`ready\`, served by \`func-python\` over hypercorn. Templates can also be pulled from Git repositories (\`func create --repository\`), which is how teams standardise their own.`,
    },
    {
      type: 'lab',
      lab: 'knative-functions',
      brief: 'Scaffold a Python cloudevents function, replace the handler with an order-pricing one, test it with pytest before building anything, then deploy it and read what func wrote.',
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'A team is building a function that a React app will call directly to fetch a quote. Which template?',
          options: [
            'cloudevents, because it is more modern',
            'http, because the caller is a browser making ordinary requests and expects an ordinary response',
            'Either — the templates are identical',
            'cloudevents, so it can be put behind a broker later',
          ],
          correct: [1],
          explanation: 'The template fixes the contract. A browser will not construct CloudEvent headers; the http template gives it a normal request/response API. Putting it behind a broker later would change it from a synchronous API into an asynchronous consumer anyway.',
        },
        {
          q: 'A Python function loads a 400 MB model inside handle() on every call. What is the fix in the func programming model?',
          options: [
            'Increase the timeout',
            'Load it once in start(cfg), and make ready() return False until it has loaded',
            'Load it in stop()',
            'Increase containerConcurrency',
          ],
          correct: [1],
          explanation: 'start runs once per instance (the init term of a cold start); handle runs per event. ready() keeps traffic away until the load completes, so the first request waits in the activator instead of hitting a half-ready pod.',
        },
        {
          q: 'Which file should be committed as the source of truth for how a function is built and deployed?',
          options: ['.func/', 'func.yaml', 'The Knative Service YAML exported from the cluster', 'pyproject.toml only'],
          correct: [1],
          explanation: 'func.yaml holds runtime, builder, registry, env and the deployed image digest; func deploy regenerates the Service from it (K3.L4). .func/ is local build state.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'Going deeper',
      md: `- Knative Functions docs (knative.dev/docs/functions/) — language guides and the func.yaml reference.
- \`func create --help\` — \`--repository\` for custom template repositories, which is how an organisation bakes its own logging, tracing and auth into every new function.
- The \`func-python\` package on PyPI — the ASGI server your class runs inside.`,
    },
  ],
}

export default lesson
