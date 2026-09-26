import type { LabGuide } from './types'

const guide: LabGuide = {
  id: 'de-setup',
  requires: [
    'a VAST cluster with DataEngine enabled on a tenant',
    'a VMS user that can log in to that tenant',
    'network access to the VMS (often a VPN)',
    'Docker',
    'Python 3.11+',
  ],
  blocks: [
    {
      type: 'prose',
      md: `## What you will set up

The \`vastde\` CLI, configured against your tenant, and one file — \`de.env\` — that describes your cluster to every DataEngine lab. You create nothing on the cluster in this lab; you only read.

You need a VAST cluster with DataEngine enabled on a tenant, and a VMS login for that tenant. If you do not know whether you have those, ask your VAST administrator for four things: the **VMS URL**, the **tenant name**, a **username and password** for it, and the **cluster's DataEngine version** (so you install the matching CLI).`,
    },
    {
      type: 'prose',
      md: `## 1. Install vastde

\`vastde\` is published on GitHub. Pick the release that matches your cluster's DataEngine version:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `# Linux x86_64 — macOS, ARM and Windows builds are on the releases page:
#   https://github.com/vast-data/dataengine-cli/releases
curl -fsSL -o vastde https://github.com/vast-data/dataengine-cli/releases/download/v5.5.0-sp2/vastde_linux_amd64
chmod +x vastde && sudo mv vastde /usr/local/bin/
vastde version`,
    },
    {
      type: 'prose',
      md: `## 2. Configure it

Write the configuration with \`config set\`. The builder image must match the CLI version.`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `vastde config set \\
  --vms-url <VMS_URL> \\
  --tenant <TENANT> \\
  --username '<your VMS user>' \\
  --password '<your VMS password>' \\
  --builder-image-url vastdataorg/vast-builder:v5.5.0-sp2
chmod 600 ~/.vast/config.toml
vastde config view`,
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'Where the config actually lives',
      md: `The v5.5 binary reads **\`~/.vast/config.toml\`**. The repository README mentions \`~/.vastde/config.yaml\` and a \`--tenant\` flag; the binary ignores that file and rejects that flag (D1.L3). If authentication fails with a password you know is right, run \`vastde config view\` and check which values are in effect.`,
    },
    {
      type: 'prose',
      md: `## 3. Prove the login

\`functions list\` is the login check (\`vastde status\` is not — it reports a Helm release). Add \`-v 5\` once to watch the CLI request a token **for your tenant** and then call the API:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `vastde functions list -v 5 2>&1 | grep TRACE
# [TRACE] POST <VMS_URL>/api/token/<TENANT>
# [TRACE] GET  <VMS_URL>/api/latest/serverless/functions
vastde functions list`,
    },
    {
      type: 'prose',
      md: `If the tenant is shared, you will see other people's functions. Do not modify objects you did not create; read them with \`get\` if you want to learn from them.

## 4. Inventory what your tenant has

The infrastructure objects from D1.L2 are linked to the tenant by an administrator. Read their names — you will put them in \`de.env\`:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `vastde compute-clusters list          # → K8S_CLUSTER
vastde container-registries list      # → REGISTRY
vastde container-registries get <REGISTRY> -o json    # → REGISTRY_URL (where docker push goes)
vastde buckets list                   # → a BUCKET you are allowed to write to
vastde triggers list                  # existing triggers: note their topic and broker
vastde triggers get <an existing trigger> -o json      # → BROKER and TOPIC from its "topic" VRN`,
    },
    {
      type: 'prose',
      md: `The **namespace** pipelines deploy into, and the **S3 endpoint** for the bucket, may not be visible to you through the CLI: an existing pipeline shows its namespace (\`vastde pipelines get <name> -o json\`), and the S3 endpoint comes from your administrator.

A topic VRN looks like \`vast:dataengine:topics:<BROKER>/<TOPIC>\`. If the tenant already has working triggers, reuse their broker and topic.`,
    },
    {
      type: 'callout',
      variant: 'info',
      title: 'Pick a bucket nobody else is watching',
      md: `Lab 09 creates an element trigger and uploads test files. Use a bucket that is yours, or one where you have agreed a prefix. If another team's trigger watches the same bucket without filters, your test uploads will run *their* pipeline too — check \`vastde triggers list\` for element triggers on it first.`,
    },
    {
      type: 'prose',
      md: `## 5. Write de.env

Copy the template next to your lab folders (so every lab finds it as \`../de.env\`) and fill every value:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `cp de.env.example ../de.env
$EDITOR ../de.env`,
    },
    {
      type: 'code',
      filename: '../de.env (shape)',
      lang: 'bash',
      code: `PREFIX=alice                              # your handle — same as on the site
VMS_URL=<VMS_URL>
TENANT=<TENANT>
K8S_CLUSTER=<K8S_CLUSTER>
NAMESPACE=<NAMESPACE>
REGISTRY=<REGISTRY>
REGISTRY_URL=<REGISTRY_URL>
BROKER=<BROKER>
TOPIC=<TOPIC>
BUCKET=<BUCKET>
S3_ENDPOINT=<S3_ENDPOINT>
BUILDER_IMAGE=vastdataorg/vast-builder:v5.5.0-sp2`,
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'de.env names your environment',
      md: `It contains hostnames and resource names from your cluster. Keep it out of version control and out of screenshots you share.`,
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
      md: `- **\`login\` fails** — \`vastde config view\`: wrong tenant or VMS URL, or credentials in the wrong file. \`-v 5\` shows the HTTP status of the token request.
- **\`de-env\` fails** — a value is empty or still a placeholder (\`my-…\`, \`…example.internal\`).
- **\`compute\` or \`registry\` fails** — the name in \`de.env\` does not match \`compute-clusters list\` / \`container-registries list\` exactly, or nothing is linked to your tenant yet; that is an administrator task.
- **TLS errors** — lab VMS certificates are often self-signed; \`vastde\` accepts them, other tools may not.`,
    },
  ],
  cleanup: [
    {
      type: 'prose',
      md: `Nothing was created on the cluster. Keep \`vastde\` configured and \`../de.env\` in place for labs 07–10.`,
    },
  ],
}

export default guide
