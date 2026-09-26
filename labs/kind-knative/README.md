# Lab 00 — A Knative Cluster You Own

The full guide is on the course site, under **Labs → 00**. This folder holds the
pieces you run locally.

```bash
export PREFIX=<your-handle>      # the same value you saved on the site
kn quickstart kind --registry    # ~3 minutes
./tour.sh                        # optional: what just got installed
./verify.sh                      # prints your completion code
```

Clean up (only when you are done with every kind lab):

```bash
kind delete cluster --name knative
docker rm -f kind-registry
```
