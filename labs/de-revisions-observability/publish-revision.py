#!/usr/bin/env python3
"""publish-revision.py — publish a new revision of a DataEngine function.

    python3 publish-revision.py <function-name> <image-tag>

Why this exists: with vastde v5.5.0-sp2, `vastde functions update … --publish`
fails with HTTP 422 `last_published_revision_number: Extra inputs are not
permitted` — the CLI copies a read-only field into its PUT body (see it with
--dry-run). This script makes the same PUT to the same VMS API without that
field. Delete it once your CLI version no longer shows the 422 (lab 10 guide).

It reads your existing ~/.vast/config.toml (VMS URL, tenant, user, password) and
prints no secrets.
"""
import json
import os
import ssl
import sys
import tomllib
import urllib.error
import urllib.request


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__.strip().splitlines()[2].strip())
        return 2
    name, tag = sys.argv[1], sys.argv[2]
    cfg = tomllib.load(open(os.path.expanduser("~/.vast/config.toml"), "rb"))
    base = cfg["servers"]["vms_url"].rstrip("/")
    auth = cfg["auth"]
    # Lab VMS certificates are often self-signed, as with `vastde`'s default.
    ctx = ssl.create_default_context()
    if os.environ.get("VMS_VERIFY_TLS") != "1":
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

    def call(method, path, body=None, token=None):
        req = urllib.request.Request(base + path, method=method,
                                     data=None if body is None else json.dumps(body).encode())
        req.add_header("Content-Type", "application/json")
        if token:
            req.add_header("Authorization", f"Bearer {token}")
        try:
            with urllib.request.urlopen(req, context=ctx, timeout=30) as r:
                return r.status, json.loads(r.read() or b"null")
        except urllib.error.HTTPError as e:
            return e.code, e.read().decode()

    status, tok = call("POST", f"/api/token/{auth['tenant']}",
                       {"username": auth["username"], "password": auth["password"]})
    if status >= 300:
        print(f"login failed: HTTP {status}")
        return 1
    token = tok["access"]

    # Same two calls `vastde functions get --with-revisions` makes.
    status, fns = call("GET", f"/api/latest/serverless/functions?name={name}", token=token)
    items = fns.get("data", []) if isinstance(fns, dict) else []
    fn = next((f for f in items if f.get("name") == name), None)
    if status >= 300 or fn is None:
        print(f"function {name} not found (HTTP {status})")
        return 1
    status, revs = call("GET", f"/api/latest/serverless/functions/{fn['guid']}/revisions", token=token)
    revs = revs.get("data", revs) if isinstance(revs, dict) else revs
    if status >= 300 or not revs:
        print(f"could not read revisions of {name} (HTTP {status})")
        return 1
    last = max(revs, key=lambda r: r["revision_number"])
    body = {
        "name": name,
        "description": fn.get("description"),
        "container_registry_vrn": last["container_registry_vrn"],
        "artifact_source": last["artifact_source"],
        "artifact_type": last["artifact_type"],
        "image_tag": tag,
        "is_published": True,
    }
    status, out = call("PUT", f"/api/latest/serverless/functions/{fn['guid']}", body, token)
    if status >= 300:
        print(f"update failed: HTTP {status} {out}")
        return 1
    # The PUT response carries the pre-update revision number; read it back.
    status, revs = call("GET", f"/api/latest/serverless/functions/{fn['guid']}/revisions", token=token)
    revs = revs.get("data", revs) if isinstance(revs, dict) else revs
    newest = max(revs, key=lambda r: r["revision_number"])
    state = "published" if newest.get("is_published") else "created (NOT published)"
    print(f"{name}: revision {newest['revision_number']} {state}, image tag {newest['image_tag']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
