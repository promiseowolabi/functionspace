#!/usr/bin/env bash
# vastde-docker.sh [status|start|stop] — a Docker 28 daemon just for vastde.
#
# vastde v5.5 talks to Docker with API 1.38 and builds with buildpacks that
# cannot save images into the containerd image store. Docker Engine 29+
# rejects API 1.38 by default and uses the containerd store on new installs,
# so `vastde functions build` fails there. Rather than change your Docker,
# this runs a Docker 28 daemon in a container (docker:28-dind) and leaves
# your own daemon, and everything on it such as the kind cluster, untouched.
#
#   status  does the daemon vastde would use work for it?
#   start   run the Docker 28 daemon and print the DOCKER_HOST line for de.env
#   stop    remove the daemon container (its images survive in a volume)
#
# It publishes 127.0.0.1:23750 (the daemon) and 127.0.0.1:8080 (the port
# `vastde functions localrun` serves on), and mounts your registry CA
# certificates read-only so `docker push` trusts the tenant registry.
set -euo pipefail

NAME=vastde-docker
PORT=23750
IMAGE=docker:28-dind
ADDR="tcp://127.0.0.1:$PORT"

# Always manage the container on your own daemon, even if DOCKER_HOST
# already points at the one this script runs.
host_docker() { env -u DOCKER_HOST docker "$@"; }

# usable — 0 if the daemon at $DOCKER_HOST (or the default) works for vastde.
usable() {
  local min store
  min=$(docker version --format '{{.Server.MinAPIVersion}}' 2>/dev/null) || {
    echo "  no Docker daemon answers${DOCKER_HOST:+ at $DOCKER_HOST}"; return 1; }
  store=$(docker info --format '{{json .DriverStatus}}' 2>/dev/null)
  local ok=0
  if [ "$(printf '%s\n1.38\n' "$min" | sort -V | head -1)" != "$min" ]; then
    echo "  ✗ minimum API version is $min; vastde needs 1.38"; ok=1
  else
    echo "  ✓ minimum API version $min accepts vastde (1.38)"
  fi
  case "$store" in
    *containerd.snapshotter*) echo "  ✗ images are in the containerd store; the vastde build cannot save into it"; ok=1 ;;
    *) echo "  ✓ classic image store" ;;
  esac
  return $ok
}

# Where your Docker reads registry CA certificates: ~/.docker/certs.d for
# Docker Desktop and OrbStack on macOS, /etc/docker/certs.d on Linux. The
# whole folder is mounted, so certificates added later are seen live.
certs_dir() {
  if [ "$(uname -s)" = Darwin ]; then
    mkdir -p "$HOME/.docker/certs.d" && echo "$HOME/.docker/certs.d"
  elif [ -d /etc/docker/certs.d ]; then
    echo /etc/docker/certs.d
  fi
}

case "${1:-status}" in
  status)
    echo "Docker daemon vastde will use: ${DOCKER_HOST:-your default}"
    if usable; then
      echo "ready for vastde."
    else
      echo "not usable by vastde — run: $0 start"
      exit 1
    fi
    ;;
  start)
    if [ "$(host_docker inspect -f '{{.State.Running}}' "$NAME" 2>/dev/null)" != true ]; then
      host_docker rm -f "$NAME" >/dev/null 2>&1 || true
      certs=$(certs_dir)
      host_docker run -d --name "$NAME" --privileged --restart unless-stopped \
        -p "127.0.0.1:$PORT:2375" -p 127.0.0.1:8080:8080 \
        -e DOCKER_TLS_CERTDIR= \
        -v "$NAME:/var/lib/docker" \
        ${certs:+-v "$certs:/etc/docker/certs.d:ro"} \
        "$IMAGE" >/dev/null
    fi
    printf 'waiting for the daemon'
    for _ in $(seq 1 60); do
      DOCKER_HOST=$ADDR docker version >/dev/null 2>&1 && break
      printf .; sleep 1
    done
    echo
    DOCKER_HOST=$ADDR usable
    echo "Add this line to ../de.env (labs 07–10 source it):"
    echo "  export DOCKER_HOST=$ADDR"
    ;;
  stop)
    host_docker rm -f "$NAME" >/dev/null 2>&1 || true
    echo "removed $NAME; its images stay in the $NAME volume (docker volume rm $NAME to free them)."
    echo "Remove the DOCKER_HOST line from ../de.env."
    ;;
  *)
    echo "usage: $0 [status|start|stop]" >&2; exit 2 ;;
esac
