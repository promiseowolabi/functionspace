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
vastde container-registries get <REGISTRY> -o json    # → REGISTRY_URL: its url, without https://
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
      type: 'callout',
      variant: 'segfault',
      title: 'REGISTRY_URL is host:port, not a URL',
      md: `\`container-registries get\` reports the registry as \`https://<host>:5000\`. Write only \`<host>:5000\` in \`de.env\`: labs 08 and 10 build image names from it (\`$REGISTRY_URL/$PREFIX/echo:latest\`), and \`docker tag\` rejects a name with a scheme — \`invalid reference format\`. Found while testing this course.`,
    },
    {
      type: 'prose',
      md: `## 6. Trust the registry's certificate

Labs 08 and 10 \`docker push\` to the tenant registry over HTTPS. Lab registries often use a **self-signed** certificate, and Docker refuses those with \`x509: certificate signed by unknown authority\` until you install the certificate where Docker looks. First, does it already verify?`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `. ../de.env
curl -s -o /dev/null -w '%{http_code}\\n' https://$REGISTRY_URL/v2/`,
    },
    {
      type: 'prose',
      md: `\`200\` or \`401\` — the certificate verifies; skip to step 7. \`000\` — it does not. Fetch the certificate the registry presents and look at it:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `echo | openssl s_client -connect $REGISTRY_URL 2>/dev/null | openssl x509 > registry-ca.crt
openssl x509 -in registry-ca.crt -noout -subject -issuer -fingerprint -sha256`,
    },
    {
      type: 'prose',
      md: `If **subject and issuer are the same**, it is self-signed and this file is its own CA. Read the fingerprint to your administrator before you trust it — this is trust on first use, and the check is what makes it safe. If the issuer is a different name (a company CA), ask your administrator for that CA's certificate and use it as \`registry-ca.crt\` instead.

Install it under the registry's \`host:port\` — the directory name must match \`REGISTRY_URL\` exactly. **macOS (Docker Desktop and OrbStack):**`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `mkdir -p ~/.docker/certs.d/$REGISTRY_URL
cp registry-ca.crt ~/.docker/certs.d/$REGISTRY_URL/ca.crt`,
    },
    {
      type: 'prose',
      md: `**Linux:**`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `sudo mkdir -p /etc/docker/certs.d/$REGISTRY_URL
sudo cp registry-ca.crt /etc/docker/certs.d/$REGISTRY_URL/ca.crt`,
    },
    {
      type: 'prose',
      md: `Docker reads these per registry, at push time — no restart. Re-run the \`curl\` above with \`--cacert registry-ca.crt\` to see \`200\` or \`401\`. The Docker 28 daemon in the next step mounts the same folder, so it trusts the registry too.`,
    },
    {
      type: 'prose',
      md: `## 7. Check Docker

Labs 07–10 build and run your function with Docker through \`vastde\`. \`vastde\` v5.5 speaks an old Docker API (1.38), and its builder cannot save images into Docker's containerd image store. **Docker Engine 29** — current Docker Desktop, OrbStack and Linux packages — rejects that API by default and uses the containerd store on new installs, so the build fails. Check the daemon you have:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `./vastde-docker.sh status`,
    },
    {
      type: 'code',
      filename: 'output on Docker 29 (OrbStack, reference machine)',
      lang: 'text',
      code: `Docker daemon vastde will use: your default
  ✗ minimum API version is 1.40; vastde needs 1.38
  ✗ images are in the containerd store; the vastde build cannot save into it
not usable by vastde — run: ./vastde-docker.sh start`,
    },
    {
      type: 'prose',
      md: `If it says **ready for vastde**, skip to step 8. Otherwise, do not reconfigure your Docker: start a **Docker 28 daemon in a container** just for \`vastde\`, and point only the DataEngine labs at it.`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `./vastde-docker.sh start
echo 'export DOCKER_HOST=tcp://127.0.0.1:23750' >> ../de.env
(. ../de.env && ./vastde-docker.sh status)`,
    },
    {
      type: 'prose',
      md: `The same steps work on Docker Desktop, OrbStack and Linux. The script runs \`docker:28-dind\` on your own Docker, publishes the daemon on \`127.0.0.1:23750\` and \`localrun\`'s port \`8080\`, and mounts your registry CA certificates (\`~/.docker/certs.d\`, or \`/etc/docker/certs.d\` on Linux) read-only so \`docker push\` trusts the tenant registry. Because \`DOCKER_HOST\` lives in \`de.env\`, only a shell that ran \`. ../de.env\` — and the lab scripts, which source it — use the Docker 28 daemon. Your other terminals, and the kind cluster from the Knative labs, keep using your normal Docker. Registry logins live in \`~/.docker/config.json\` on the client side, so \`docker login\` works either way.`,
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'Your images are in a different daemon',
      md: `With \`DOCKER_HOST\` set, \`docker images\` lists the Docker 28 daemon's images, not your usual ones. That is the point — but it is why \`$PREFIX-echo\` will not show up in a terminal that has not sourced \`de.env\`.`,
    },
    {
      type: 'deepdive',
      title: 'The alternative: reconfigure your own Docker',
      md: `You can instead change your main daemon. It needs both fixes, and the second one hides everything you created under the containerd store — **including a kind cluster from lab 00** — until you switch it back, because Docker keeps each image store's images and containers apart.

**1. Accept API 1.38** — add \`"min-api-version": "1.24"\` to the daemon's JSON config, merged into what is already there (appending a second object with \`tee -a\` leaves invalid JSON and Docker will not start):
- **Linux:** \`/etc/docker/daemon.json\`, then \`sudo systemctl restart docker\`.
- **Docker Desktop:** Settings → Docker Engine, edit the JSON, **Apply & restart**.
- **OrbStack:** Settings → Docker (or \`~/.orbstack/config/docker.json\`), then \`orb restart docker\`.

**2. Use the classic image store:**
- **Docker Desktop:** Settings → General → untick **Use containerd for pulling and storing images**, Apply & restart.
- **Linux and OrbStack:** add \`"features": {"containerd-snapshotter": false}\` to the same JSON and restart.

Check with \`docker version --format '{{.Server.MinAPIVersion}}'\` (1.38 or lower) and \`docker info --format '{{.Driver}}'\` (\`overlay2\`, not \`overlayfs\`). Undo both edits to get your containerd images and kind cluster back.`,
    },
    {
      type: 'prose',
      md: `## 8. Verify`,
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
- **TLS errors** — lab VMS certificates are often self-signed; \`vastde\` accepts them, other tools may not.
- **\`docker\` fails** — run \`(. ../de.env && ./vastde-docker.sh status)\`. Either \`DOCKER_HOST\` is missing from \`de.env\`, or the Docker 28 daemon is not running (\`./vastde-docker.sh start\`; it restarts with Docker, but not after \`stop\`).
- **\`de-env\` fails with every value filled in** — \`REGISTRY_URL\` still starts with \`https://\`.
- **\`registry-tls\` fails** — step 6: no \`ca.crt\` under \`certs.d/<REGISTRY_URL>/\`, the directory name does not match \`REGISTRY_URL\` exactly, or the file is the wrong certificate (compare fingerprints).`,
    },
  ],
  cleanup: [
    {
      type: 'prose',
      md: `Nothing was created on the cluster. Keep \`vastde\` configured, \`../de.env\` in place and, if you started it, the Docker 28 daemon running for labs 07–10. When you have finished them, remove it and the images it holds:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `./vastde-docker.sh stop
docker volume rm vastde-docker`,
    },
  ],
}

export default guide
