import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowRight, Database, Terminal } from 'lucide-react'
import {
  TRACKS,
  TOTAL_TRACK_LESSONS,
  ORDERED_LESSON_IDS,
  HALF_LABEL,
  type Half,
} from '@/lib/tracks'
import TrackCard from '@/components/TrackCard'
import { LABS } from '@/data/labs'

const HALVES: Half[] = ['knative', 'dataengine', 'synthesis']

export default function Home() {
  const kindLabs = LABS.filter((l) => l.platform === 'kind')
  const vastLabs = LABS.filter((l) => l.platform === 'vast')

  return (
    <div className="mx-auto max-w-app px-6 pb-24 pt-24 lg:px-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto max-w-3xl text-center"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">
          functionspace · a serverless functions course
        </p>
        <h1 className="mt-5 text-5xl font-semibold tracking-tight text-text-1 sm:text-6xl">
          An event happened. Your function ran.
          <br />
          <span className="text-accent">Learn everything in between.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-body-lg text-text-2">
          {TOTAL_TRACK_LESSONS} lessons across {TRACKS.length} tracks and {LABS.length} hands-on labs.
          Take Knative apart on a cluster you create in three minutes — revisions, the activator, the
          autoscaler, brokers, triggers, <code>func</code>. Then run event-driven functions next to
          the data on a VAST cluster with DataEngine: functions, triggers, pipelines, S3 events.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to={`/lesson/${ORDERED_LESSON_IDS[0]}`}
            className="inline-flex items-center gap-2 rounded-md border border-accent/60 bg-accent/10 px-5 py-2.5 font-mono text-sm text-accent transition-colors hover:bg-accent/20"
          >
            start the curriculum <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/labs"
            className="inline-flex items-center gap-2 rounded-md border border-line bg-surface-1 px-5 py-2.5 font-mono text-sm text-text-2 transition-colors hover:text-text-1"
          >
            <Terminal className="h-4 w-4" /> go to the labs
          </Link>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2 font-mono text-[11px] text-text-3">
          {['knative v1.23', 'kind', 'cloudevents', 'vast dataengine', 'verify.sh', 'local-first'].map((chip) => (
            <span key={chip} className="rounded-full border border-line px-2.5 py-1">
              {chip}
            </span>
          ))}
        </div>
        <p className="mx-auto mt-5 max-w-xl text-body-sm text-text-3">
          Every number in a lesson was measured on a real cluster or read from a real default, and
          says which. Vendor facts carry the month they were verified.
        </p>
      </motion.div>

      {/* tracks, grouped by half */}
      {HALVES.map((half, hi) => (
        <section key={half} className="mt-16">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.14em] text-text-3">
            {HALF_LABEL[half]}
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {TRACKS.filter((t) => t.half === half).map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 + (hi * 3 + i) * 0.05, ease: [0.16, 1, 0.3, 1] }}
              >
                <TrackCard track={t} />
              </motion.div>
            ))}
          </div>
        </section>
      ))}

      {/* the two lab platforms */}
      <div className="mt-12 grid gap-4 md:grid-cols-2">
        <Link
          to="/labs"
          className="group block rounded-lg border border-line bg-surface-1 p-6 transition-colors hover:border-accent/50"
        >
          <div className="flex items-center gap-2.5">
            <Terminal className="h-5 w-5 text-accent" />
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-3">knative on kind</p>
          </div>
          <p className="mt-3 text-h4 font-medium text-text-1">{kindLabs.length} labs on your laptop</p>
          <p className="mt-2 text-body-sm text-text-2">
            Docker, kind and the <code>kn</code> CLI are all you need. Every lab ends in a{' '}
            <code>verify.sh</code> that inspects the cluster and prints a completion code.
          </p>
          <p className="mt-4 font-mono text-[11px] text-accent">
            start with lab 00 <ArrowRight className="inline h-3 w-3" />
          </p>
        </Link>
        <Link
          to="/labs"
          className="group block rounded-lg border border-amber/40 bg-surface-1 p-6 transition-colors hover:border-amber/70"
        >
          <div className="flex items-center gap-2.5">
            <Database className="h-5 w-5 text-amber" />
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-3">vast dataengine</p>
          </div>
          <p className="mt-3 text-h4 font-medium text-text-1">{vastLabs.length} labs on your VAST cluster</p>
          <p className="mt-2 text-body-sm text-text-2">
            Bring a VAST cluster with DataEngine enabled, a tenant login and the <code>vastde</code>{' '}
            CLI from your VAST administrator. You fill in one <code>de.env</code>; every lab reads it.
          </p>
          <p className="mt-4 font-mono text-[11px] text-amber">
            start with lab 06 <ArrowRight className="inline h-3 w-3" />
          </p>
        </Link>
      </div>

      <Link
        to="/capstone"
        className="group mt-4 block rounded-lg border border-line bg-surface-1 p-5 transition-colors hover:border-accent/50"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-3">the capstone</p>
        <p className="mt-2 font-medium text-text-1">Same function, two platforms</p>
        <p className="mt-1.5 text-body-sm text-text-2">
          One object-processing function behind a Knative broker and behind a DataEngine S3 trigger —
          measured, compared, and written up.
        </p>
      </Link>
    </div>
  )
}
