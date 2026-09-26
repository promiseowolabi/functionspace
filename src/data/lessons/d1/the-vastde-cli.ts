import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'd1.l3',
  slug: 'the-vastde-cli',
  trackId: 'd1',
  index: 3,
  title: 'The vastde CLI',
  minutes: 14,
  hook: 'The CLI\'s own README tells you to pass --tenant and edit ~/.vastde/config.yaml. The v5.5 binary rejects the flag and ignores the file. Trust the binary, and learn the three commands that tell you what it is really doing.',
  exercise: 'lab+quiz',
  takeaway: {
    number: '0 --tenant flags',
    claim: 'vastde v5.5 scopes every call to the tenant in ~/.vast/config.toml (or VAST_TENANT) — there is no --tenant flag despite the README — and "config view", "-o json" and "-v 5" are how you confirm what it will do before it does it.',
  },
  blocks: [
    {
      type: 'prose',
      md: `\`vastde\` is the whole interface to DataEngine in this course: it logs in to VMS, reads and writes the objects from D1.L2, builds and runs functions locally, and fetches logs, metrics and traces. It is a single Go binary, published on GitHub.`,
    },
    {
      type: 'code',
      filename: 'install (pick your platform from the releases page)',
      lang: 'bash',
      code: `# Linux x86_64 — see github.com/vast-data/dataengine-cli/releases for macOS, ARM, Windows
curl -fsSL -o vastde https://github.com/vast-data/dataengine-cli/releases/download/v5.5.0-sp2/vastde_linux_amd64
chmod +x vastde && sudo mv vastde /usr/local/bin/
vastde version          # v5.5.0-sp2`,
    },
    {
      type: 'callout',
      variant: 'warning',
      title: 'Match the CLI to the cluster',
      md: `Use the CLI release that matches your cluster's DataEngine version, and the builder image that matches the CLI (\`vastdataorg/vast-builder:<same version>\`). Your VAST administrator knows the cluster version. A mismatched CLI can talk to VMS and still produce objects or images the cluster does not expect.`,
    },
    {
      type: 'prose',
      md: `## Configuration: the file the binary actually reads

The v5.5 binary reads **\`~/.vast/config.toml\`**:

\`\`\`toml
[auth]
username = "<your VMS user>"
password = "<your VMS password>"
tenant = "<TENANT>"
local_tenant = ""

[servers]
vms_url = "<VMS_URL>"
builder_image_url = "vastdataorg/vast-builder:v5.5.0-sp2"
\`\`\`

Write it with \`vastde config set --vms-url … --username … --password … --tenant … --builder-image-url …\`, protect it (\`chmod 600\`), and check it with \`vastde config view\`, which prints everything except the password.

**The tenant is part of the login.** The CLI requests a token for that tenant specifically, so every later call is scoped to it. There is no per-command override: \`vastde --tenant x functions list\` fails with \`unknown flag: --tenant\`. To switch tenants, change the config or set \`VAST_TENANT\` for one command.`,
    },
    {
      type: 'callout',
      variant: 'segfault',
      title: 'The README and the binary disagree',
      md: `The public repository's README (for v5.5.0-sp2) documents a global \`--tenant\` flag and a config file at \`~/.vastde/config.yaml\`. The v5.5.0-sp2 binary rejects the flag and reads \`~/.vast/config.toml\`. A YAML file in the documented location is silently ignored, and the symptom is an authentication failure that looks like a wrong password. When docs and binary disagree, \`vastde config view\` and \`-v 5\` tell you what the binary is doing.`,
    },
    {
      type: 'prose',
      md: `## Three commands that tell you the truth

**\`vastde config view\`** — which VMS, which tenant, which user, which builder image. Run it first whenever something fails oddly.

**\`-o json\`** — every command can emit JSON. Human output truncates long names and GUIDs; JSON does not, and it is what scripts (including every \`verify.sh\` in labs 06–10) should parse.

**\`-v 5\`** — trace verbosity. It prints each HTTP call the CLI makes to VMS and its status, so you can see the token request for your tenant succeed or fail, and exactly which API a command hits.

And one that looks like a check but is not: **\`vastde status\`** reports the status of a DataEngine *Helm release* on a Kubernetes cluster — an installer command. It is not a login check. \`vastde functions list\` is.`,
    },
    {
      type: 'prose',
      md: `## Read before you write

- Every write command accepts **\`--dry-run\`**: it shows the request without sending it.
- \`get\` is the inspection verb (there is no \`show\`): \`vastde pipelines get <name>\`, \`… --manifest\`, \`vastde functions get <name> --with-revisions\`.
- \`create\` commands accept \`--from-file\` / \`--config\` with YAML or JSON — keep manifests in files and in git, not in shell history.`,
    },
    {
      type: 'vendor',
      snapshot: '2026-09',
      title: 'vastde v5.5.0-sp2 configuration and global flags',
      systems: ['vast-dataengine'],
      sources: [
        'https://github.com/vast-data/dataengine-cli',
        'https://github.com/vast-data/dataengine-cli/blob/main/docs/references/commands/vastde_config_set.md',
        'https://github.com/vast-data/dataengine-cli/blob/main/docs/references/commands/vastde_status.md',
      ],
      md: `**Documented**: installation from GitHub releases; \`config init/set/unset/view\`; global \`-o/--output\` (json, yaml, human), \`-v/--verbose\` (0–9), \`--dry-run\`; \`status\` is "Get the status of a DataEngine release". The README also documents \`--tenant\` and \`~/.vastde/config.yaml\`. **Observed** with the v5.5.0-sp2 binary: \`--tenant\` is rejected as an unknown flag; configuration is read from \`~/.vast/config.toml\` with \`[auth]\` and \`[servers]\` sections; the tenant in that file scopes the login.`,
    },
    {
      type: 'lab',
      lab: 'de-setup',
      brief: 'Install and configure vastde against your tenant, prove the login, and record the compute cluster, registry, topic and bucket names your labs will use in de.env.',
    },
    {
      type: 'quiz',
      questions: [
        {
          q: 'After writing ~/.vastde/config.yaml exactly as the README shows, every vastde command fails authentication. The password is correct. What is the most likely cause?',
          options: [
            'The VMS is down',
            'The v5.5 binary reads ~/.vast/config.toml; the YAML file is ignored, so the CLI is using no (or stale) credentials',
            'Passwords must be base64-encoded',
            'You need the --tenant flag',
          ],
          correct: [1],
          explanation: 'Docs and binary disagree, and the ignored file produces a misleading auth error. vastde config view shows which values are actually in effect.',
        },
        {
          q: 'A script must list functions in two tenants. What is the correct approach with v5.5?',
          options: [
            'vastde --tenant a functions list; vastde --tenant b functions list',
            'Set VAST_TENANT per command (or switch config): VAST_TENANT=a vastde functions list -o json; VAST_TENANT=b vastde functions list -o json',
            'It is impossible',
            'Use vastde status',
          ],
          correct: [1],
          explanation: 'The tenant is part of the login, taken from config or VAST_TENANT; there is no --tenant flag. -o json keeps full names for the script.',
        },
        {
          q: 'On-call runs vastde status to check whether their CLI login works, and it errors. What should they conclude?',
          options: [
            'Their credentials are wrong',
            'Nothing about login: status reports a DataEngine Helm release on a Kubernetes cluster; use vastde functions list (with -v 5 if needed) to test the login',
            'DataEngine is down',
            'The CLI needs reinstalling',
          ],
          correct: [1],
          explanation: 'Choosing the right diagnostic command saves the first ten minutes of an incident. status is an installer command.',
        },
      ],
    },
    {
      type: 'deepdive',
      title: 'Going deeper',
      md: `- \`vastde doc\` generates the full command reference locally — identical to \`docs/references/commands/\` in the public repo, for your exact binary.
- \`vastde <cmd> -v 5 --dry-run\` on any create command — the request body shows every field the API accepts, including ones the flags do not expose.
- Shell completion: \`vastde completion bash|zsh|fish\`.`,
    },
  ],
}

export default lesson
