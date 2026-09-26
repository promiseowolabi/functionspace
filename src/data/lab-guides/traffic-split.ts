import type { LabGuide } from './types'

const guide: LabGuide = {
  id: 'traffic-split',
  requires: ['the kind cluster from lab 00', 'kn', 'kubectl', 'curl'],
  blocks: [
    {
      type: 'prose',
      md: `## What you will see

Because revisions are immutable and every one of them stays addressable, a rollout in Knative is not a redeploy — it is an edit to the Route's traffic table. You will create two revisions, give each a stable **tag** URL, split traffic 80/20, roll back in one command, and find out what happens when you try to delete a revision the Configuration still wants.`,
    },
    {
      type: 'prose',
      md: `## 1. Blue, with a name you chose

By default revisions are named \`<service>-00001\`, \`-00002\`… \`--revision-name\` lets you pick the suffix, which makes the traffic commands readable.`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `export PREFIX=alice
S=$PREFIX-rollout
kn service create $S --image ghcr.io/knative/helloworld-go:latest --port 8080 \\
  --env TARGET=blue --revision-name blue`,
    },
    {
      type: 'prose',
      md: `## 2. Green, with no traffic

A plain \`kn service update\` would create the green revision *and* move 100% of traffic to it. Passing \`--traffic $S-blue=100\` in the same command pins traffic to blue, so green is deployed "dark":`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `kn service update $S --env TARGET=green --revision-name green --traffic $S-blue=100
kn revision list -s $S`,
    },
    {
      type: 'code',
      filename: 'output',
      lang: 'text',
      code: `NAME                  SERVICE         TRAFFIC   TAGS   GENERATION   CONDITIONS   READY
alice-rollout-green   alice-rollout                    2            3 OK / 4     True
alice-rollout-blue    alice-rollout   100%             1            4 OK / 4     True`,
    },
    {
      type: 'prose',
      md: `Green is Ready but shows **3 OK / 4**: its \`Active\` condition is false, because nothing routes to it. It will scale to zero like any idle revision.`,
    },
    {
      type: 'prose',
      md: `## 3. Tags: a URL per revision

A tag gives a revision its own hostname, \`<tag>-<service>.<namespace>.<domain>\`, independent of the traffic split. That is how you test green before any real user sees it.`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `kn service update $S --tag $S-blue=blue --tag $S-green=green
curl http://blue-$S.default.127.0.0.1.sslip.io     # Hello blue!
curl http://green-$S.default.127.0.0.1.sslip.io    # Hello green!`,
    },
    {
      type: 'prose',
      md: `## 4. Split 80/20

Once tagged, the tags can stand in for revision names in \`--traffic\`:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `kn service update $S --traffic blue=80 --traffic green=20
./sample.sh 200`,
    },
    {
      type: 'code',
      filename: 'output (two runs)',
      lang: 'text',
      code: `    155 Hello blue!        # 77.5%
     45 Hello green!       # 22.5%

     84 Hello blue!        # 84% of 100
     16 Hello green!`,
    },
    {
      type: 'prose',
      md: `The split is per request and random, so 200 requests land near 80/20, not on it. Now read the table Kourier is actually enforcing:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `kubectl get ksvc $S -o jsonpath='{.status.traffic}' | python3 -m json.tool`,
    },
    {
      type: 'prose',
      md: `Every entry has \`"latestRevision": false\`. That matters: the split is pinned to **named** revisions. Deploy a third revision now and it gets 0% — try it:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `kn service update $S --env TARGET=red --revision-name red
kn revision list -s $S       # red: Ready, no traffic`,
    },
    {
      type: 'callout',
      variant: 'warning',
      title: '@latest follows you; names do not',
      md: `A traffic entry with \`latestRevision: true\` (what \`kn\` writes by default, shown as \`@latest\`) moves to every new revision automatically. An entry with a revision name stays put. Mixing them is how "we only changed an env var" turns into an unplanned 100% rollout.`,
    },
    {
      type: 'prose',
      md: `## 5. Roll back, then try to delete

Rolling back is the same command with different numbers — no build, no image pull, because blue's pods may still be running and its image is pinned by digest:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `kn service update $S --traffic blue=100
./sample.sh 20                 # 20 Hello blue!
kn service update $S --traffic blue=80 --traffic green=20    # back to the split for verify.sh`,
    },
    {
      type: 'prose',
      md: `Now delete red, the revision you never wanted:`,
    },
    {
      type: 'code',
      lang: 'bash',
      code: `kn revision delete $S-red
kn revision list -s $S`,
    },
    {
      type: 'code',
      filename: 'output',
      lang: 'text',
      code: `Revision 'alice-rollout-red' deleted in namespace 'default'.
NAME                  SERVICE         TRAFFIC   TAGS    GENERATION   CONDITIONS   READY     REASON
alice-rollout-red     alice-rollout                     3            0 OK / 3     Unknown   ResolvingDigests
alice-rollout-green   alice-rollout   20%       green   2            4 OK / 4     True
alice-rollout-blue    alice-rollout   80%       blue    1            4 OK / 4     True`,
    },
    {
      type: 'prose',
      md: `It came straight back. The Service's template still says \`TARGET=red\`, so the **Configuration** still wants a revision built from it — and the controller reconciled the deletion away within a second. You cannot delete desired state by deleting its output; change the template instead. (That is F0.L4's reconcile loop, observed.)`,
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
      md: `- **\`tags\` fails** — the check expects revisions named exactly \`$PREFIX-rollout-blue\` and \`$PREFIX-rollout-green\`. If you created them without \`--revision-name\`, delete the service and start again.
- **\`split\` fails after the rollback** — run the 80/20 command once more; verify reads the current table.
- **A tag URL returns 404** — tag routes take a few seconds to be programmed into Kourier after the update. Retry.`,
    },
  ],
  cleanup: [
    {
      type: 'code',
      lang: 'bash',
      code: `kn service delete $PREFIX-rollout`,
    },
  ],
}

export default guide
