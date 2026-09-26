import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowLeft, Check, Download, ListChecks } from 'lucide-react'
import { labById, labNumber, LABS, PLATFORM_LABEL } from '@/data/labs'
import { LAB_GUIDES, type LabGuide } from '@/data/lab-guides'
import { lessonMeta, lessonPath } from '@/data/lessons/manifest'
import { getTrack } from '@/lib/tracks'
import { useProgress } from '@/lib/progress'
import { checkLabCode } from '@/lib/lab-code'
import { asset } from '@/lib/asset'
import PrefixSetting from '@/components/PrefixSetting'
import { RenderBlock } from '@/pages/lesson/blocks'
import { h2Offsets } from '@/pages/lesson/markdown'
import type { ContentBlock } from '@/data/lessons/types'
import NotFound from '@/pages/NotFound'

function Blocks({ blocks, id, color }: { blocks: ContentBlock[]; id: string; color: string }) {
  const offsets = h2Offsets(blocks)
  return (
    <>
      {blocks.map((b, i) => (
        <RenderBlock key={i} block={b} lesson={{ id }} trackColor={color} h2Start={offsets[i]} />
      ))}
    </>
  )
}

function Completion({ labId }: { labId: string }) {
  const prefix = useProgress((s) => s.settings.prefix)
  const done = useProgress((s) => s.labs[labId]?.done ?? false)
  const saved = useProgress((s) => s.labs[labId]?.code)
  const completeLab = useProgress((s) => s.completeLab)
  const [code, setCode] = useState('')
  const [state, setState] = useState<'idle' | 'wrong'>('idle')

  if (done) {
    return (
      <div className="rounded-lg border border-accent/50 bg-surface-1 p-5">
        <p className="flex items-center gap-2 font-mono text-label uppercase text-accent">
          <Check size={14} /> lab complete
        </p>
        {saved && <p className="mt-2 font-mono text-body-sm text-text-2">{saved}</p>}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-line bg-surface-1 p-5">
      <p className="font-mono text-label uppercase text-text-3">completion code</p>
      {!prefix ? (
        <div className="mt-3">
          <p className="mb-3 text-body-sm text-text-2">Set your prefix first — the code is derived from it.</p>
          <PrefixSetting />
        </div>
      ) : (
        <form
          className="mt-3 flex flex-wrap items-center gap-3"
          onSubmit={async (e) => {
            e.preventDefault()
            if (await checkLabCode(labId, prefix, code)) completeLab(labId, code.trim())
            else setState('wrong')
          }}
        >
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value)
              setState('idle')
            }}
            placeholder={`FS-${labId.toUpperCase()}-xxxxxxxx`}
            aria-label="completion code"
            className="min-w-[18rem] flex-1 rounded-md border border-line bg-surface-2 px-3 py-2 font-mono text-body-sm text-text-1 outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={!code.trim()}
            className="rounded-md bg-accent px-4 py-2 font-display text-body-sm font-semibold text-accent-foreground disabled:opacity-40"
          >
            mark complete
          </button>
          {state === 'wrong' && (
            <p className="w-full font-mono text-[11px] text-amber">
              That code does not match lab {labId} for prefix “{prefix}”. Did verify.sh run with the
              same PREFIX?
            </p>
          )}
        </form>
      )}
    </div>
  )
}

export default function LabPage() {
  const { labId } = useParams()
  const lab = labById(labId)
  const [guide, setGuide] = useState<{ id: string; g: LabGuide } | null>(null)

  useEffect(() => {
    if (!lab) return
    let live = true
    LAB_GUIDES[lab.id]().then((m) => {
      if (live) setGuide({ id: lab.id, g: m.default })
    })
    return () => {
      live = false
    }
  }, [lab])

  if (!lab) return <NotFound />
  const track = getTrack(lab.trackId)!
  const lesson = lessonMeta(lab.lessonId)
  const g = guide?.id === lab.id ? guide.g : null
  const next = LABS[lab.index + 1]

  return (
    <div className="mx-auto max-w-[860px] px-6 pb-24 pt-24">
      <Link to="/labs" className="flex items-center gap-1.5 font-mono text-[11px] text-text-3 hover:text-accent">
        <ArrowLeft size={12} /> all labs
      </Link>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <p className="mt-6 font-mono text-label uppercase" style={{ color: track.color }}>
          lab {labNumber(lab)} · {PLATFORM_LABEL[lab.platform]} · ~{lab.minutes} min
        </p>
        <h1 className="mt-3 font-display text-h1 text-text-1">{lab.title}</h1>
        <p className="mt-3 text-body-lg text-text-2">{lab.hook}</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <a
            href={asset(lab.zip)}
            download
            className="inline-flex items-center gap-2 rounded-md border border-accent/60 bg-accent/10 px-4 py-2 font-mono text-[12px] text-accent hover:bg-accent/20"
          >
            <Download size={13} /> {lab.id}.zip
          </a>
          {lesson && (
            <Link to={lessonPath(lesson)} className="font-mono text-[11px] text-text-3 hover:text-accent">
              introduced in {track.code}.L{lesson.index} — {lesson.title}
            </Link>
          )}
        </div>
      </motion.div>

      {g && (
        <div className="mt-8 rounded-lg border border-line bg-surface-1 p-5">
          <p className="font-mono text-label uppercase text-text-3">you need</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {g.requires.map((r) => (
              <li key={r} className="rounded-full border border-line px-2.5 py-0.5 font-mono text-[11px] text-text-2">
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 rounded-lg border border-line bg-surface-1 p-5">
        <p className="flex items-center gap-2 font-mono text-label uppercase text-text-3">
          <ListChecks size={13} /> what verify.sh checks
        </p>
        <ol className="mt-3 space-y-1.5">
          {lab.checks.map((c, i) => (
            <li key={c.id} className="flex gap-3 text-body-sm text-text-2">
              <span className="font-mono text-[11px] text-text-3">{String(i + 1).padStart(2, '0')}</span>
              <span>
                {c.label} <span className="font-mono text-[10px] text-text-3">[{c.id}]</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <article className="mt-10">
        {g ? (
          <Blocks blocks={g.blocks} id={`lab:${lab.id}`} color={track.color} />
        ) : (
          <p className="animate-pulse font-mono text-[11px] uppercase text-text-3">loading guide…</p>
        )}
      </article>

      <section className="mt-12">
        <Completion labId={lab.id} />
      </section>

      {g && g.cleanup.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-h3 text-text-1">Clean up</h2>
          <Blocks blocks={g.cleanup} id={`lab:${lab.id}:cleanup`} color={track.color} />
        </section>
      )}

      {next && (
        <Link
          to={`/labs/${next.id}`}
          className="mt-12 block rounded-lg border border-line bg-surface-1 p-5 transition-colors hover:border-line-bright"
        >
          <p className="font-mono text-[11px] uppercase text-text-3">next · lab {labNumber(next)}</p>
          <p className="mt-1 font-display text-h4 text-text-1">{next.title}</p>
        </Link>
      )}
    </div>
  )
}
