import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { Check, Database, Terminal } from 'lucide-react'
import { LABS, labNumber, PLATFORM_LABEL, type LabPlatform } from '@/data/labs'
import { getTrack } from '@/lib/tracks'
import { useProgress } from '@/lib/progress'
import PrefixSetting from '@/components/PrefixSetting'
import { cn } from '@/lib/utils'
import { renderInline } from '@/pages/lesson/markdown'

const PLATFORM_COPY: Record<LabPlatform, { icon: typeof Terminal; needs: string; body: string }> = {
  kind: {
    icon: Terminal,
    needs: 'Docker · kind · kubectl · kn · func · hey',
    body: 'Everything runs in a kind cluster on your machine. Lab 00 creates it; every other kind lab assumes it is running. About 4 CPU and 6 GB of RAM free is comfortable.',
  },
  vast: {
    icon: Database,
    needs: 'a VAST cluster with DataEngine · a tenant login · vastde · Docker · an S3 client',
    body: 'These labs run against your own VAST cluster. Get the `vastde` CLI and a tenant with DataEngine enabled from your VAST administrator or account team. You describe your cluster once, in `de.env`, and every lab reads it.',
  },
}

export default function Labs() {
  const labs = useProgress((s) => s.labs)

  return (
    <div className="mx-auto max-w-app px-6 pb-24 pt-24 lg:px-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="section-label">hands-on</p>
        <h1 className="mt-4 font-display text-display-lg text-text-1">Labs</h1>
        <p className="mt-4 max-w-[68ch] text-body text-text-2">
          {LABS.length} labs on real infrastructure. Each one downloads as a small folder — manifests,
          source, and a <code>verify.sh</code> that inspects what you built and prints a completion
          code. Paste the code on the lab page to mark it done.
        </p>
        <p className="mt-3 max-w-[68ch] text-body-sm text-text-3">
          A completion code is a progress marker, not proof: it is derived from the lab and your
          prefix, and anyone who reads <code>verify.sh</code> can compute it. The checks are there to
          tell <em>you</em> whether it worked.
        </p>
      </motion.div>

      <div className="mt-8">
        <PrefixSetting />
      </div>

      {(['kind', 'vast'] as LabPlatform[]).map((platform) => {
        const copy = PLATFORM_COPY[platform]
        const Icon = copy.icon
        const list = LABS.filter((l) => l.platform === platform)
        return (
          <section key={platform} className="mt-14">
            <div className="flex flex-wrap items-center gap-3">
              <Icon className={cn('h-5 w-5', platform === 'kind' ? 'text-accent' : 'text-amber')} />
              <h2 className="font-display text-h3 text-text-1">{PLATFORM_LABEL[platform]}</h2>
              <span className="font-mono text-[11px] text-text-3">
                labs {labNumber(list[0])}–{labNumber(list[list.length - 1])}
              </span>
            </div>
            <p className="mt-2 max-w-[68ch] text-body-sm text-text-2">{renderInline(copy.body)}</p>
            <p className="mt-1 font-mono text-[11px] text-text-3">needs: {copy.needs}</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {list.map((lab) => {
                const track = getTrack(lab.trackId)
                const done = labs[lab.id]?.done ?? false
                return (
                  <Link
                    key={lab.id}
                    to={`/labs/${lab.id}`}
                    className="group block rounded-lg border border-line bg-surface-1 p-5 transition-colors duration-180 hover:border-line-bright"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-[11px] uppercase" style={{ color: track?.color }}>
                        lab {labNumber(lab)} · {track?.code}
                      </span>
                      {done ? (
                        <span className="flex items-center gap-1 font-mono text-[11px] text-accent">
                          <Check size={12} /> done
                        </span>
                      ) : (
                        <span className="font-mono text-[11px] text-text-3">~{lab.minutes} min</span>
                      )}
                    </div>
                    <p className="mt-2 font-display text-h4 text-text-1">{lab.title}</p>
                    <p className="mt-1.5 text-body-sm text-text-2">{lab.hook}</p>
                    <p className="mt-3 font-mono text-[11px] text-text-3">
                      {lab.checks.length} checks
                      {lab.after.length > 0 && ` · after lab ${lab.after.map((a) => labNumber(LABS.find((x) => x.id === a)!)).join(', ')}`}
                    </p>
                  </Link>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
