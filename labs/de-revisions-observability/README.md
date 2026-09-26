# Lab 10 — Revision 2, With Evidence

The full guide is on the course site, under **Labs → 10**. Needs the function,
trigger and uploads pipeline from labs 08–09.

```bash
. ../de.env
sed -i 's/^REVISION = 1.*/REVISION = 2/' ../de-local-function/src/main.py
TMPDIR=$HOME/.cache/vastde-tmp vastde functions build $PREFIX-echo -t ../de-local-function/src -H main.py -V "3.12.*" -T v2
docker tag $PREFIX-echo:v2 $REGISTRY_URL/$PREFIX/echo:v2 && docker push $REGISTRY_URL/$PREFIX/echo:v2
vastde functions update $PREFIX-echo --image-tag v2 --publish   # v5.5.0-sp2: 422 — see the guide
python3 publish-revision.py $PREFIX-echo v2                     # the workaround
../de-element-trigger/render.sh ../de-element-trigger/pipeline.yaml.tmpl | sed 's/^      revision: 1$/      revision: 2/' > pipeline.yaml
vastde pipelines update $PREFIX-uploads-pipeline --config @pipeline.yaml
vastde pipelines deploy $PREFIX-uploads-pipeline                # update alone does not roll out
# upload a file (../de-element-trigger/upload.sh), then:
./verify.sh
```
