# Lab 08 — Your First Pipeline

The full guide is on the course site, under **Labs → 08**. Needs `../de.env`
from lab 06 and the `$PREFIX-echo:latest` image from lab 07.

```bash
. ../de.env
docker tag $PREFIX-echo:latest $REGISTRY_URL/$PREFIX/echo:latest && docker push $REGISTRY_URL/$PREFIX/echo:latest
vastde functions create --name $PREFIX-echo --container-registry $REGISTRY \
  --artifact-source $PREFIX/echo --artifact-type image --image-tag latest --publish
vastde triggers create schedule --name $PREFIX-tick --cron-schedule "*/5 * * * *" \
  --topic-name $TOPIC --broker-type Internal --broker-name $BROKER
./render.sh > pipeline.yaml && vastde pipelines create --config pipeline.yaml --deploy
# wait for a five-minute boundary, then:
vastde logs get $PREFIX-tick-pipeline --since 15m --order-by desc --limit 1000
./verify.sh
```

If no event arrives within one interval of the pipeline becoming Ready, see
the guide: recreate the trigger rather than updating it.
