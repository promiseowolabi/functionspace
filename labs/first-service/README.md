# Lab 01 — One Service, Two Revisions

The full guide is on the course site, under **Labs → 01**. Needs the cluster from lab 00.

```bash
export PREFIX=<your-handle>
kn service create $PREFIX-hello --image ghcr.io/knative/helloworld-go:latest --port 8080 --env TARGET=World
kn service update $PREFIX-hello --env TARGET=$PREFIX
./verify.sh
```

`service.yaml` is the same Service written declaratively.

Clean up: `kn service delete $PREFIX-hello`
