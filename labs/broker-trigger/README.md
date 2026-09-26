# Lab 04 — Events With Nobody Waiting

The full guide is on the course site, under **Labs → 04**. Needs the cluster from lab 00.

```bash
export PREFIX=<your-handle>
ED=gcr.io/knative-releases/knative.dev/eventing/cmd/event_display
kn broker create $PREFIX-broker
kn service create $PREFIX-display --image $ED --scale-min 1
kn service create $PREFIX-dls     --image $ED --scale-min 1
kn service create $PREFIX-flaky   --image hashicorp/http-echo:1.0 --port 5678 --arg=-status-code=503 --arg=-text=nope
kn source ping create $PREFIX-ping --schedule "*/1 * * * *" --data "{\"from\":\"$PREFIX\"}" --sink broker:$PREFIX-broker
kn trigger create $PREFIX-heartbeat --broker $PREFIX-broker --filter type=dev.knative.sources.ping --sink ksvc:$PREFIX-display
sed "s/PREFIX/$PREFIX/g" fail-trigger.yaml | kubectl apply -f -
./send-order.sh
./verify.sh
```

Clean up:

```bash
kn trigger delete $PREFIX-heartbeat
kn trigger delete $PREFIX-orders-fail
kn source ping delete $PREFIX-ping
kn service delete $PREFIX-display $PREFIX-dls $PREFIX-flaky
kn broker delete $PREFIX-broker
```
