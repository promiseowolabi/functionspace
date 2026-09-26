import type { LabGuide } from './types'

const guide: LabGuide = {
  id: 'first-service',
  requires: ['the kind cluster from lab 00', 'kn', 'kubectl', 'curl'],
  blocks: [
    {
      type: 'prose',
      md: `## What you will see

You will create one Knative Service, change one environment variable, and discover that Knative created **three objects** for you the first time and **one more** the second time. By the end you should be able to say which object owns which, and why an edit produces a new Revision instead of changing the old one.`,
    },
    {
      type: 'prose',
      md: `## 1. Create the Service`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `export PREFIX=alice   # your handle
kn service create $PREFIX-hello \\
  --image ghcr.io/knative/helloworld-go:latest \\
  --port 8080 \\
  --env TARGET=World`,
    },
    {
      type: 'code',
      filename: 'output',
      lang: 'text',
      code: `Creating service 'alice-hello' in namespace 'default':

  0.068s The Route is still working to reflect the latest desired specification.
  0.109s Configuration "alice-hello" is waiting for a Revision to become ready.
  6.713s Ingress has not yet been reconciled.
  6.747s Waiting for load balancer to be ready
  6.942s Ready to serve.

Service 'alice-hello' created to latest revision 'alice-hello-00001' is available at URL:
http://alice-hello.default.127.0.0.1.sslip.io`,
    },
    {
      type: 'prose',
      md: `Read those status lines as a sequence of controllers doing their jobs: the **Route** waits for something to route to, the **Configuration** waits for its first **Revision** to become ready (that is the image pull and container start — about 6.5 s here), then the **Ingress** is programmed into Kourier. Call it:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `curl http://$PREFIX-hello.default.127.0.0.1.sslip.io
# Hello World!`,
    },
    {
      type: 'prose',
      md: `## 2. Find what Knative created

You wrote one object. Ask the cluster what exists now:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `kubectl get ksvc,configuration,route,revision -l serving.knative.dev/service=$PREFIX-hello
kubectl get deploy,podautoscaler,serverlessservice | grep $PREFIX-hello`,
    },
    {
      type: 'prose',
      md: `The first command shows the four Knative-level objects: your **Service**, a **Configuration** and a **Route** with the same name, and a **Revision** called \`$PREFIX-hello-00001\`. The second shows what the Revision itself spawned: a plain Kubernetes **Deployment**, a **PodAutoscaler** (the autoscaler's per-revision record) and a **ServerlessService** (which decides whether traffic goes to pods directly or through the activator — K1.L2).

Now follow the ownership chain upwards. Every object records who created it:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `kubectl get revision $PREFIX-hello-00001 -o jsonpath='{.metadata.ownerReferences[0].kind}/{.metadata.ownerReferences[0].name}{"\\n"}'
# Configuration/alice-hello
kubectl get configuration $PREFIX-hello -o jsonpath='{.metadata.ownerReferences[0].kind}/{.metadata.ownerReferences[0].name}{"\\n"}'
# Service/alice-hello`,
    },
    {
      type: 'prose',
      md: `## 3. Look inside the pod

A Revision's pod has **two** containers, and only one of them is yours:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `kubectl get pod -l serving.knative.dev/revision=$PREFIX-hello-00001 \\
  -o jsonpath='{range .items[0].spec.containers[*]}{.name}{"  ports="}{.ports[*].containerPort}{"\\n"}{end}'`,
    },
    {
      type: 'code',
      filename: 'output',
      lang: 'text',
      code: `user-container  ports=8080
queue-proxy  ports=9090 9091 8012 8112`,
    },
    {
      type: 'prose',
      md: `\`queue-proxy\` is a sidecar Knative injects into every revision pod. Requests arrive on its port **8012** and it forwards them to your container on 8080 — counting them as it goes. That count of in-flight requests is what the autoscaler scales on. You will lean on this in lab 02.`,
    },
    {
      type: 'prose',
      md: `## 4. Change one thing

Update the environment variable to your prefix:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `kn service update $PREFIX-hello --env TARGET=$PREFIX
curl http://$PREFIX-hello.default.127.0.0.1.sslip.io
# Hello alice!
kn revision list -s $PREFIX-hello`,
    },
    {
      type: 'code',
      filename: 'output',
      lang: 'text',
      code: `NAME                SERVICE       TRAFFIC   TAGS   GENERATION   AGE   CONDITIONS   READY
alice-hello-00002   alice-hello   100%             2            2s    4 OK / 4     True
alice-hello-00001   alice-hello                    1            5s    4 OK / 4     True`,
    },
    {
      type: 'prose',
      md: `You did not modify revision 00001. Knative created **00002** from the new template and moved 100% of traffic to it once it was ready. 00001 still exists, with 0% traffic — and within about a minute and a half it will have no pods. Check its ServerlessService:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `kubectl get sks $PREFIX-hello-00001
# MODE=Proxy — traffic for this revision would now go through the activator`,
    },
    {
      type: 'prose',
      md: `## 5. Why the old revision cannot change

Look at the image the Revision actually runs:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `kubectl get revision $PREFIX-hello-00002 -o jsonpath='{.status.containerStatuses[0].imageDigest}{"\\n"}'
# ghcr.io/knative/helloworld-go@sha256:a97656c5…`,
    },
    {
      type: 'prose',
      md: `You asked for \`:latest\`. Serving resolved that tag to a **digest** when it created the Revision and pinned it. If someone pushes a new \`:latest\` tomorrow, revision 00002 keeps running exactly the bytes it ran today. That is what makes a Revision an immutable snapshot of code *and* configuration — and it is why rolling back (lab 03) is just moving traffic, not rebuilding anything.`,
    },
    {
      type: 'callout',
      variant: 'info',
      title: 'The declarative path',
      md: `\`service.yaml\` in the lab folder is the same Service as YAML. \`kn\` is a convenience; Knative only ever sees the object. Try \`kn service create demo --image ghcr.io/knative/helloworld-go:latest --target ./demo.yaml\` — the \`--target\` flag (experimental) writes the object \`kn\` would have sent to a file instead of the cluster, including the \`client.knative.dev/user-image\` annotation \`kn\` adds.`,
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
      md: `- **\`responds\` fails but the Service is Ready** — the body must be exactly \`Hello <prefix>!\`. Did you update TARGET to the same value as \`$PREFIX\`? \`kn service describe $PREFIX-hello\` shows the current env.
- **The first \`curl\` after a pause takes about a second** — the revision had scaled to zero and you just watched a cold start. Lab 02 measures it.
- **\`two-revisions\` fails** — an update that changes nothing in the template (same env value twice) does not create a revision. Change the value.`,
    },
  ],
  cleanup: [
    {
      type: 'code',
      lang: 'bash',
      code: `kn service delete $PREFIX-hello`,
    },
  ],
}

export default guide
