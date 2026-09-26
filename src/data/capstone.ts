/**
 * Capstone — Same Function, Two Platforms.
 *
 * One object-processing core, wrapped twice: as a Knative Function behind a
 * broker on kind, and as a DataEngine function behind an element trigger on
 * the reader's VAST cluster. Both read the same object from the same S3
 * bucket, so the only variable is the platform.
 *
 * Steps are self-assessed (a checkbox each); the deliverable is the write-up.
 */

export interface CapstoneStep {
  id: string
  title: string
  /** What done looks like, stated so the reader can check it themselves. */
  done: string
  body: string[]
}

export const CAPSTONE_STEPS: CapstoneStep[] = [
  {
    id: 'core',
    title: 'Write the core once',
    done: '`core.py` exposes `summarise(key, body) -> dict`, and its tests pass with no platform installed.',
    body: [
      'The function counts rows and bytes in a CSV object, computes a SHA-256 of the body, and returns a small JSON summary. Put it in `core.py` with no imports from Knative, `func`, or DataEngine — that separation is the point of the exercise.',
      'Write two or three `pytest` cases, including an empty object and a key without a `.csv` suffix (which the core must refuse, not crash on).',
    ],
  },
  {
    id: 'knative',
    title: 'Wrap it as a Knative Function',
    done: 'A broker trigger delivers a `dev.functionspace.object.created` event to your function, which fetches the object over S3 and replies with the summary as a new CloudEvent.',
    body: [
      'Scaffold with `func create -l python -t cloudevents`, vendor `core.py` into it, and read `bucket` and `key` from the event data. Fetch the object from your VAST S3 endpoint with `boto3` — the same bucket the DataEngine side will watch.',
      'Lab 09 showed the S3 endpoint may only be reachable from hosts on the data network. If your kind cluster cannot reach it, run kind on such a host, or have the event carry the object body inline for this step and say so in the write-up — it changes what you are comparing.',
      'Deploy it to kind, create a Trigger filtering on the type, and send the event into the broker with `curl` from a pod in the cluster (lab 04 shows how).',
    ],
  },
  {
    id: 'dataengine',
    title: 'Wrap it as a DataEngine function',
    done: 'Uploading a `.csv` under your prefix fires an element trigger, and the pipeline logs show the same summary the Knative side produced for the same object.',
    body: [
      'Scaffold with `vastde functions init python-pip`, vendor the same `core.py`, and read `event.bucket` and `event.object_key` (lab 09; remember the real type is `Element.ElementCreated`). Build, push, create the function, an element trigger with a `.csv` suffix filter under your prefix, and a pipeline. Write the summary under a different prefix from the one the trigger watches.',
      'Upload one object and compare the two summaries byte for byte. If they differ, the core is not the same core.',
    ],
  },
  {
    id: 'measure',
    title: 'Measure both',
    done: 'You have a table with cold latency, warm latency, and time-to-zero (or its equivalent) for each platform, each value with how you measured it.',
    body: [
      'On Knative: time the first event after scale-to-zero and a warm one, from the pod events and the reply timestamps. Note the scale-to-zero delay you observe.',
      'On DataEngine: upload ten objects and read `dataengine.event.reception_latency` and `dataengine.function.invoke_duration` at p50 and p95 from `vastde metrics get` — platform-side numbers, free of clock skew between machines (lab 10). Record the pipeline\'s min and max concurrency alongside them; without those the numbers mean nothing.',
    ],
  },
  {
    id: 'writeup',
    title: 'Write it up',
    done: 'A one-page comparison: what each platform made easy, what it hid, your numbers, and which you would choose for an ingest-time enrichment job — with the one fact that would change your mind.',
    body: [
      'Use the X1 mapping table as your skeleton. Be explicit about anything you inferred rather than observed, the same way the course does.',
    ],
  },
]
