# Lab 03 — Blue, Green, Eighty-Twenty

The full guide is on the course site, under **Labs → 03**. Needs the cluster from lab 00.

```bash
export PREFIX=<your-handle>
S=$PREFIX-rollout
kn service create $S --image ghcr.io/knative/helloworld-go:latest --port 8080 --env TARGET=blue --revision-name blue
kn service update $S --env TARGET=green --revision-name green --traffic $S-blue=100
kn service update $S --tag $S-blue=blue --tag $S-green=green
kn service update $S --traffic blue=80 --traffic green=20
./sample.sh 200
./verify.sh
```

Clean up: `kn service delete $PREFIX-rollout`
