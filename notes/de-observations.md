# DataEngine observations (for D1/D2/X1 lessons)

Observed 2026-09-26 with the PUBLIC `vastde` v5.5.0-sp2 binary
(github.com/vast-data/dataengine-cli) and the PUBLIC builder image
`vastdataorg/vast-builder:v5.5.0-sp2`, entirely locally (no cluster). Nothing
here identifies any environment. Keep it that way: no hostnames, tenants,
registry or cluster names in this file.

## Scaffold (`vastde functions init python-pip <name>`)
- Files: main.py, requirements.txt, Aptfile, customDeps, README.md.
- main.py: `init(ctx)` + `handler(ctx, event)`; uses `ctx.logger.info`.
- README mentions optional config.yaml (envs + secrets mounted under /secrets/,
  available as `ctx.secrets`) and cloudevent.yaml for invoke.

## Build (`vastde functions build <name> -t . -H main.py -V "3.12.*"`)
- 179 s on the reference machine (builder image already present); image 1.9 GB.
- "Python version 3.12.* resolved to 3.12.13".
- It is Cloud Native Buildpacks: buildpacks vast-buildpack, vast-constraints-buildpack,
  custom-deps-buildpack, paketo-buildpacks/python 2.59.0, cpython 1.18.40,
  ca-certificates, conda-env-update; run image paketobuildpacks/run-jammy-full.
  Same family as func's default `pack` builder.
- Entrypoint `/cnb/process/web`, user 1002:1000.

## Localrun + invoke
- `vastde functions localrun <name> --detach` → container on 8080.
- `vastde functions invoke --generate-event --url http://localhost:8080/`
  → "CloudEvent sent successfully (Status: 204)".
- Generated event: type `vastdata.com:Element.ObjectCreated`,
  source `vastdata.com:trigger1.<uuid>`, subject `vastdata.com:kafka-view.default-topic`,
  datacontenttype application/json, extensions triggerext1/triggerext2, data {"msg":"hello"}.
- Runtime log lines: "Starting VAST DataEngine Runtime", "Uvicorn running on
  http://0.0.0.0:8080", "Init Handler Completed, duration: …",
  "Handler is now ready to accept requests",
  "START EventId: …, EventType: …", "Event batching mode: False",
  "Function returned: … with duration 0.59 ms", "No sink URL configured",
  "END EventId: … Duration: 0.0016s", access log `"POST / HTTP/1.1" 204`.

## What the handler receives
- `event` is `ElementTriggerVastEvent` with: as_element_event, as_function_event,
  as_manual_event, as_schedule_event, broker, bucket, data, extensions, get,
  get_attributes, get_data, get_trace_id, id, object_key, partition_key,
  subtype, timestamp, topic, trigger, trigger_id, type, version.
- `event.get_attributes()` → CE attributes dict incl. extensions.
- GOTCHA: `event.get_data()` returned the WHOLE structured envelope as a dict
  (payload nested under "data"), not just the payload.
- `ctx` is `Context` with: counter, gauge, histogram, updowncounter, meter,
  tracer, start_as_current_span, start_as_current_event_span, logger, secrets,
  function_name, pipeline_triggers_map, get/set_global_ctx.

## Runtime internals (read from site-packages/vast/dataengine/runtime/)
- handlers.py: success → `Response(status_code=204)`; exception →
  `Response(status_code=500, content=str(err))` + error metric + span error.
- The handler's RETURN VALUE is not sent back in the HTTP response. If `K_SINK`
  is set, it is wrapped in a CloudEvent and POSTed to K_SINK; else logs
  "No sink URL configured".
- Output CloudEvent (cloud_event_utils.py create_base_ce_attributes):
  type `vastdata.com:Function`, source `vastdata.com:<function_name>`,
  id = INPUT event id, subject `<broker>.<topic>`, datacontenttype JSON,
  partitionkey = input partition key, traceparent injected;
  `K_CE_OVERRIDES` (JSON) overrides attributes — the Knative ContainerSource/
  SinkBinding convention ("failed parsing knative CE overrides").
- server.py readiness probe docstring: "OPTIONS … used by Knative queue-proxy to
  detect if the container supports HTTP/2" — the runtime is written to run
  behind Knative's queue-proxy.
- Env vars read: K_SINK, K_CE_OVERRIDES, K_NAME, K_ID, K_REV_ID, K_VERSION,
  VASTSTACK_NAME, VASTSTACK_REV_ID, VAST_LOG_LEVEL, IS_TEST_CONTAINER.
- Batching mode: handler gets a list and must return a list of equal length.

## CLI behaviour (public binary v5.5.0-sp2) vs public README
- README documents `--tenant` global flag and `~/.vastde/config.yaml`.
- The binary has no `--tenant` flag (unknown flag) and reads `~/.vast/config.toml`
  (`auth.tenant` or VAST_TENANT). Teach the binary's behaviour; note the drift.
- `vastde status` is Helm release status, not a login check.

## Still to verify against a tenant (needs VPN)
- functions create/publish/revisions; triggers schedule/element; pipelines
  create/deploy/get --manifest; logs/metrics/traces; element event payload from
  a real S3 PUT; what the pipeline does on 500 (retries? DLQ topic from
  setup-dataengine); events_order field.

## The installer (`vastde install --dry-run`, chart embedded in the public binary)
Rendered offline against the kind cluster's kubeconfig (nothing applied):
- Subcharts: collector, controller-manager, knative (knative-operator + knative
  namespaces + serving default-domain job + an istio namespace).
- Knative Operator images: gcr.io/knative-releases/knative.dev/operator/cmd/operator:v1.20.0 and webhook v1.20.0.
- VAST images: vastdataorg/vast-dataengine-controller-manager:v5.5.0-sp2,
  vastdataorg/vast-dataengine-collector:v5.5.0-sp2.
- VAST CRDs (group vast.vastdata.com): VastPipeline, VastKafkaBroker, VastTenant;
  (operator.vastdata.com): VastDataEngine.
- controller-manager ClusterRole, with the chart's own comments:
  "# Knative Eventing (Brokers, Triggers)" eventing.knative.dev brokers,triggers — create/delete/…
  "# Knative Serving (Services)" serving.knative.dev services — create/delete/…
  "# Knative Sources (SinkBindings)" sources.knative.dev sinkbindings — create/delete/…
  "# Knative Kafka ConsumerGroups (required by knativeconsumergroup reconciler)"
  "# Workload resources (StatefulSets for pipeline components)"
=> A pipeline is reconciled (VastPipeline) into Knative Services, Brokers,
   Triggers and SinkBindings (hence K_SINK in the runtime). Strong evidence from
   the installer; not observed on a live compute cluster (no kubectl access).
