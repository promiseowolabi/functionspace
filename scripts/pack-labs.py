#!/usr/bin/env python3
"""pack-labs — zip each lab folder into public/labs/<id>.zip for download.

The repository is private and the site is public, so the zips ARE the lab
distribution. Each zip unpacks to:

    functionspace-labs/
      common/lib.sh        shared verify helpers
      <id>/                the lab: README, verify.sh, manifests, source

so `./verify.sh` finds `../common/lib.sh` wherever the reader unzips it, and
several labs unzipped into the same place share one `common/` and one
`de.env`. Build artefacts, virtualenvs, local results and anything git
ignores (a reader's own `func create` project, say) never ship.

    python3 scripts/pack-labs.py
"""
import os
import re
import subprocess
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LABS = os.path.join(ROOT, "labs")
OUT_DIR = os.path.join(ROOT, "public", "labs")
TOP = "functionspace-labs"

SKIP_DIRS = {".venv", "__pycache__", ".pytest_cache", "node_modules", ".func"}
SKIP_FILES = re.compile(r"(^results\.env$|^de\.env$|\.log$|^\.DS_Store$|^build_.*\.log$)")


def lab_ids() -> list[str]:
    registry = open(os.path.join(ROOT, "src", "data", "labs.ts"), encoding="utf8").read()
    return re.findall(r"^\s+id: '([a-z0-9-]+)',\s*$", registry, flags=re.M)


def git_ignored(paths: list[str]) -> set[str]:
    """The subset of paths git ignores; empty outside a git checkout."""
    if not paths:
        return set()
    try:
        out = subprocess.run(
            ["git", "-C", ROOT, "check-ignore", "--stdin", "-z"],
            input="\0".join(paths) + "\0", capture_output=True, text=True,
        )
    except FileNotFoundError:
        return set()
    if out.returncode not in (0, 1):  # 1 = nothing ignored
        return set()
    return set(filter(None, out.stdout.split("\0")))


def add_tree(z: zipfile.ZipFile, src: str, arc: str) -> int:
    files = []
    for dirpath, dirnames, filenames in os.walk(src):
        dirnames[:] = sorted(d for d in dirnames if d not in SKIP_DIRS)
        for name in sorted(filenames):
            full = os.path.join(dirpath, name)
            if not SKIP_FILES.search(name) and not os.path.islink(full):
                files.append(full)
    ignored = git_ignored(files)
    n = 0
    for full in files:
        if full in ignored:
            continue
        rel = os.path.relpath(full, src)
        info = zipfile.ZipInfo(f"{arc}/{rel}", date_time=(2026, 1, 1, 0, 0, 0))
        mode = 0o755 if os.access(full, os.X_OK) else 0o644
        info.external_attr = (0o100000 | mode) << 16
        info.compress_type = zipfile.ZIP_DEFLATED
        with open(full, "rb") as fh:
            z.writestr(info, fh.read())
        n += 1
    return n


def main() -> int:
    os.makedirs(OUT_DIR, exist_ok=True)
    ids = lab_ids()
    if not ids:
        print("no lab ids found in src/data/labs.ts", file=sys.stderr)
        return 1
    missing = [i for i in ids if not os.path.isfile(os.path.join(LABS, i, "verify.sh"))]
    for lab in ids:
        if lab in missing:
            print(f"  skip {lab}: labs/{lab}/verify.sh missing")
            continue
        out = os.path.join(OUT_DIR, f"{lab}.zip")
        with zipfile.ZipFile(out, "w") as z:
            n = add_tree(z, os.path.join(LABS, "common"), f"{TOP}/common")
            n += add_tree(z, os.path.join(LABS, lab), f"{TOP}/{lab}")
        print(f"  {lab}.zip  {n} files  {os.path.getsize(out)} bytes")
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
