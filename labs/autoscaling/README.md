# Lab 02 — Load, Panic, Zero

The full guide is on the course site, under **Labs → 02**. Needs the cluster from lab 00.

```bash
export PREFIX=<your-handle>
kn service create $PREFIX-sleepy --image ghcr.io/knative/autoscale-go:latest \
  --annotation autoscaling.knative.dev/target=10 --scale-max 10
./measure.sh            # 50 concurrent requests for 30 s, then waits for zero
./verify.sh
```

`measure.sh` runs the load generator (fortio) as a pod inside the cluster, so
there is nothing to install. It writes `results.env`, which `verify.sh` reads.

Clean up: `kn service delete $PREFIX-sleepy`
