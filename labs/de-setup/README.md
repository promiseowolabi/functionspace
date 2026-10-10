# Lab 06 — Point vastde at Your Tenant

The full guide is on the course site, under **Labs → 06**.

1. Install `vastde` from https://github.com/vast-data/dataengine-cli/releases
2. Configure it (`vastde config set …`, see the guide) and check `vastde functions list`.
3. `cp de.env.example ../de.env` and fill in every value for your cluster.
   `REGISTRY_URL` is host:port, without `https://`.
4. If the registry's certificate is self-signed, install it where Docker
   reads it — `~/.docker/certs.d/<REGISTRY_URL>/ca.crt` on macOS,
   `/etc/docker/certs.d/<REGISTRY_URL>/ca.crt` on Linux (see the guide).
5. `./vastde-docker.sh status`. On Docker Engine 29+ it fails: run
   `./vastde-docker.sh start` and add the `export DOCKER_HOST=…` line it prints
   to `../de.env`. Your own Docker stays as it is.
6. `./verify.sh`

`../de.env` sits next to your lab folders so labs 07–10 all find it. It names
your environment — keep it out of version control.
