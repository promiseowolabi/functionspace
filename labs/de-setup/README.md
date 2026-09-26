# Lab 06 — Point vastde at Your Tenant

The full guide is on the course site, under **Labs → 06**.

1. Install `vastde` from https://github.com/vast-data/dataengine-cli/releases
2. Configure it (`vastde config set …`, see the guide) and check `vastde functions list`.
3. `cp de.env.example ../de.env` and fill in every value for your cluster.
4. `./verify.sh`

`../de.env` sits next to your lab folders so labs 07–10 all find it. It names
your environment — keep it out of version control.
