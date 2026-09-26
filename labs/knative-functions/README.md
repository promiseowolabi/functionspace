# Lab 05 — func, End to End

The full guide is on the course site, under **Labs → 05**. Needs the cluster
(and its registry on localhost:5001) from lab 00.

```bash
export PREFIX=<your-handle>
func create -l python -t cloudevents $PREFIX-fn     # run this inside this folder
cp solution/func.py $PREFIX-fn/function/func.py      # or write your own
cp solution/test_func.py $PREFIX-fn/tests/test_func.py
cd $PREFIX-fn
func deploy --builder host --registry localhost:5001 --env PREFIX=$PREFIX
func invoke --type dev.functionspace.order.created --data '{"order":"o-1","sku":"fs-001","qty":2}'
cd .. && ./verify.sh
```

Clean up: `cd $PREFIX-fn && func delete`
