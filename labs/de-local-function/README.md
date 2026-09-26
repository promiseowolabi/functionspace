# Lab 07 — Build It, Run It Here

The full guide is on the course site, under **Labs → 07**. Needs `../de.env`
from lab 06 and Docker.

```bash
. ../de.env
TMPDIR=$HOME/.cache/vastde-tmp vastde functions build $PREFIX-echo -t src -H main.py -V "3.12.*"
vastde functions localrun $PREFIX-echo --detach
vastde functions invoke --event cloudevent.yaml --url http://localhost:8080/
./verify.sh
```

`src/main.py` is the echo function labs 08–10 deploy. `cloudevent.yaml` is a
well-formed element event — read its comments before editing it.

Clean up: `docker rm -f $(docker ps -q --filter ancestor=$PREFIX-echo:latest)`
