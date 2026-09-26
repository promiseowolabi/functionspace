# Lab 09 — An Upload Is an Event

The full guide is on the course site, under **Labs → 09**. Needs `../de.env`
(with BUCKET and S3_ENDPOINT filled in) and the function from lab 08.

```bash
. ../de.env
vastde triggers create element --name $PREFIX-uploads --source-bucket $BUCKET \
  --event "ObjectCreated:*" --name-prefix "$PREFIX/" \
  --topic-name $TOPIC --broker-type Internal --broker-name $BROKER
./render.sh > pipeline.yaml && vastde pipelines create --config pipeline.yaml --deploy
# on a machine that can reach the S3 endpoint:
BUCKET=… S3_ENDPOINT=… PREFIX=… ./upload.sh
vastde logs get $PREFIX-uploads-pipeline --since 10m | grep 'echo r'
./verify.sh
```
