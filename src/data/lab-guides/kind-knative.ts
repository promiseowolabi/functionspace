import type { LabGuide } from './types'

const guide: LabGuide = {
  id: 'kind-knative',
  requires: ['Docker (daemon running)', 'kind ≥ 0.30', 'kubectl', 'kn ≥ 1.23', 'kn-quickstart plugin', '~4 CPU, ~6 GB RAM free'],
  blocks: [
    {
      type: 'prose',
      md: `## What you are building

A single-node Kubernetes cluster running in a Docker container (that is what **kind** — Kubernetes IN Docker — does), with three things installed on top:

- **Knative Serving** — the controllers that turn a container image into an autoscaled, routable service.
- **Kourier** — a small Envoy-based ingress that Serving uses to get HTTP traffic into the cluster.
- **Knative Eventing** — sources, brokers, triggers and channels.

Plus a local container registry on \`localhost:5001\` that the cluster can pull from, which lab 05 needs.

Every kind lab in this course runs on this cluster. Build it once; keep it until you finish lab 05.`,
    },
    {
      type: 'prose',
      md: `## 1. Install the tools

You need \`kind\`, \`kubectl\`, \`kn\` and the \`kn-quickstart\` plugin on your \`PATH\`. On macOS, Homebrew has all four. On Linux, download the release binaries:`,
    },
    {
      type: 'code',
      filename: 'install (Linux, amd64)',
      lang: 'bash',
      code: `mkdir -p ~/.local/bin
curl -fsSLo ~/.local/bin/kind https://github.com/kubernetes-sigs/kind/releases/download/v0.33.0/kind-linux-amd64
curl -fsSLo ~/.local/bin/kn https://github.com/knative/client/releases/download/knative-v1.23.0/kn-linux-amd64
curl -fsSLo ~/.local/bin/kn-quickstart https://github.com/knative-extensions/kn-plugin-quickstart/releases/download/knative-v1.23.0/kn-quickstart-linux-amd64
chmod +x ~/.local/bin/kind ~/.local/bin/kn ~/.local/bin/kn-quickstart

kind version && kn version && kn quickstart version`,
    },
    {
      type: 'code',
      filename: 'install (macOS)',
      lang: 'bash',
      code: `brew install kind kubectl knative/client/kn knative-extensions/kn-plugins/quickstart`,
    },
    {
      type: 'callout',
      variant: 'info',
      title: 'kn plugins are just binaries',
      md: `\`kn quickstart\` works because \`kn\` looks for an executable called \`kn-quickstart\` on your \`PATH\` and runs it. The same convention applies to every \`kn\` plugin — which is also how \`kubectl\` plugins work.`,
    },
    {
      type: 'prose',
      md: `## 2. Set your prefix and create the cluster

Use the same prefix you saved on the Labs page. Nothing in this lab is named after it, but \`verify.sh\` needs it to compute your completion code.`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `export PREFIX=alice              # your handle
kn quickstart kind --registry`,
    },
    {
      type: 'prose',
      md: `The \`--registry\` flag starts a registry container called \`kind-registry\` and wires the cluster to trust it. The whole install took **2 minutes 52 seconds** on the machine this lab was written on; the output ends like this:`,
    },
    {
      type: 'code',
      filename: 'output (trimmed)',
      lang: 'text',
      code: `🍿 Installing Knative Serving v1.23.0 ...
    CRDs installed...
    Core installed...
    Finished installing Knative Serving
🕸️ Installing Kourier networking layer v1.23.0 ...
    Finished installing Kourier Networking layer
🕸️ Configuring Kourier for Kind...
    Domain DNS set up...
🔥 Installing Knative Eventing v1.23.0 ...
    In-memory channel installed...
    Mt-channel broker installed...
    Example broker installed...
🚀 Knative install took: 2m52s`,
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'Your kubectl context just changed',
      md: `Quickstart switches your current context to \`kind-knative\`. If you also work with real clusters, check \`kubectl config current-context\` before you run anything destructive — or run these labs with a separate kubeconfig: \`export KUBECONFIG=~/.kube/functionspace\` *before* \`kn quickstart\`.`,
    },
    {
      type: 'prose',
      md: `## 3. Take the tour

Run \`./tour.sh\` from the lab folder. It changes nothing; it lists what was installed. Look for these, because every one of them comes back in K1 and K2:

- In \`knative-serving\`: **controller** (reconciles Services, Configurations, Revisions, Routes), **activator** (holds requests for revisions that have no pods), **autoscaler** (decides how many pods a revision needs), **webhook** (validates and defaults your YAML), **net-kourier-controller** (translates Knative routes into Envoy config).
- In \`kourier-system\`: **3scale-kourier-gateway** — the Envoy that actually receives your HTTP requests.
- In \`knative-eventing\`: **eventing-controller**, the **mt-broker-ingress / mt-broker-filter** pair that implement every Broker in the cluster, and **pingsource-mt-adapter** sitting at **0 replicas** — it scales up only when the first PingSource is created.
- About **30** Knative custom resource definitions. \`services.serving.knative.dev\` is the one you will use most.`,
    },
    {
      type: 'prose',
      md: `## 4. Find the domain

Every Knative Route gets a hostname of the form \`<service>.<namespace>.<domain>\`. Quickstart set the domain to \`127.0.0.1.sslip.io\` — a public wildcard DNS name that resolves to 127.0.0.1 — and mapped port 80 of your machine to Kourier. So \`http://hello.default.127.0.0.1.sslip.io\` will reach a service called \`hello\` in \`default\` without editing \`/etc/hosts\`.`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `kubectl get cm config-domain -n knative-serving -o jsonpath='{.data}' | head -c 60; echo
getent hosts anything.127.0.0.1.sslip.io     # macOS: dscacheutil -q host -a name anything.127.0.0.1.sslip.io`,
    },
    {
      type: 'callout',
      variant: 'segfault',
      title: 'If sslip.io does not resolve',
      md: `Some corporate DNS resolvers refuse to return private addresses for public names ("DNS rebinding protection"). Symptom: \`curl\` to any \`*.127.0.0.1.sslip.io\` URL fails with *could not resolve host*. Workaround for every lab: send the request to \`127.0.0.1\` with a Host header — \`curl -H "Host: hello.default.127.0.0.1.sslip.io" http://127.0.0.1\`.`,
    },
    {
      type: 'prose',
      md: `## 5. Verify

From the lab folder:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `./verify.sh`,
    },
    {
      type: 'code',
      filename: 'expected',
      lang: 'text',
      code: `lab 00 · kind-knative · prefix=alice
  ✓ kubectl points at the kind-knative cluster [context]
  ✓ Knative Serving controller, activator, autoscaler and webhook are Available [serving]
  ✓ Kourier gateway is Available and is the configured ingress class [kourier]
  ✓ Knative Eventing controller and the multi-tenant broker are Available [eventing]
  ✓ config-domain serves routes on 127.0.0.1.sslip.io [domain]

all 5 checks passed.
completion code: FS-KIND-KNATIVE-xxxxxxxx`,
    },
    {
      type: 'deepdive',
      title: 'Troubleshooting',
      md: `- **\`serving\` or \`eventing\` fails right after install** — the webhooks can take a minute longer than the install script waits. \`kubectl get pods -n knative-serving\` and wait until everything is Running, then re-run.
- **\`context\` fails** — you are pointed at another cluster. \`kubectl config use-context kind-knative\`.
- **Pods stuck in Pending** — Docker does not have enough memory. On Docker Desktop, give it at least 6 GB.
- **Port 80 already in use** — quickstart maps host port 80 to Kourier. Stop whatever is listening on 80 and run \`kind delete cluster --name knative && kn quickstart kind --registry\` again.`,
    },
  ],
  cleanup: [
    {
      type: 'prose',
      md: `Keep this cluster until you have finished lab 05 — every kind lab uses it. When you are done with all of them:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `kind delete cluster --name knative
docker rm -f kind-registry`,
    },
  ],
}

export default guide
