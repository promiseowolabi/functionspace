"""functionspace echo — the DataEngine function labs 07–10 build on.

Logs one line per event that says which revision handled it, what kind of
trigger fired, and (for object events) which object. That line is what the
verify scripts look for in pipeline logs.

Two things this file encodes that you would otherwise learn the hard way
(D1.L4):

* ``event.get_data()`` returns the whole CloudEvent envelope as a dict, with
  the payload nested under ``"data"`` — not just the payload.
* Whatever ``handler`` returns is not sent back to the caller. The runtime
  answers 204 and, only if the pipeline configured a sink (``K_SINK``), wraps
  the return value in a new CloudEvent and POSTs it there.
"""

import os

REVISION = 1  # lab 10 changes this to 2


def init(ctx):
    # Runs once per container, before the first event: the cold-start "init"
    # term. Put clients, models and lookups here, never in handler().
    ctx.logger.info(
        "echo init: function=%s revision=%s prefix=%s",
        getattr(ctx, "function_name", "?"),
        REVISION,
        os.environ.get("PREFIX", "?"),
    )


def _payload(event):
    """The event payload, whichever shape get_data() hands back."""
    raw = event.get_data()
    if isinstance(raw, dict) and "specversion" in raw and "data" in raw:
        return raw["data"]
    return raw


def handler(ctx, event):
    attrs = event.get_attributes()
    kind = attrs.get("type", "?")
    bucket = getattr(event, "bucket", None)
    key = getattr(event, "object_key", None)

    if key:
        ctx.logger.info("echo r%s: %s bucket=%s key=%s id=%s", REVISION, kind, bucket, key, attrs.get("id"))
    else:
        ctx.logger.info("echo r%s: %s id=%s payload=%s", REVISION, kind, attrs.get("id"), _payload(event))

    # Returned for completeness: only delivered anywhere if a sink is configured.
    return {"revision": REVISION, "type": kind, "bucket": bucket, "key": key}
