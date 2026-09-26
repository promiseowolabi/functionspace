/**
 * export-lessons-md — render every lesson's blocks to plain markdown files
 * in public/lessons-md/, plus public/llms.txt (the agent manifest).
 *
 * This is the agent-native tutoring surface: any coding/chat agent can
 * ingest a lesson as clean markdown; the site links each lesson page to
 * its .md and to Claude/ChatGPT deep links.
 *
 *   npx tsx scripts/export-lessons-md.ts
 */
import { writeFileSync, mkdirSync } from 'fs'
import { ALL_LESSONS, TRACK_EXTRAS } from '../src/data/lessons'
import type { ContentBlock, Lesson } from '../src/data/lessons/types'
import { TRACKS } from '../src/lib/tracks'
import { LABS, labById, labNumber, PLATFORM_LABEL } from '../src/data/labs'

/**
 * The one place a public URL is written down. Change this and every generated
 * link moves — the manifest needs absolute URLs to be useful to an agent, and
 * exactly one constant is the price of that.
 */
const SITE = process.env.SITE_URL ?? 'https://promiseowolabi.github.io/functionspace'

function blockToMd(b: ContentBlock): string {
  switch (b.type) {
    case 'prose':
    case 'deepdive':
      return b.md
    case 'code': {
      if (b.tabs?.length) {
        return b.tabs.map((t) => `**${t.label}**\n\n\`\`\`${t.lang}\n${t.code}\n\`\`\``).join('\n\n')
      }
      return `\`\`\`${b.lang ?? ''}\n${b.code ?? ''}\n\`\`\``
    }
    case 'callout':
      return `> **[${b.variant}]** ${b.md.replace(/\n/g, '\n> ')}`
    case 'statline':
      return b.stats.map((s) => `- **${s.value}** — ${s.label}${s.hint ? ` (${s.hint})` : ''}`).join('\n')
    case 'diagram': {
      const nodes = b.nodes.map((n) => `${n.label}${n.sub ? ` (${n.sub})` : ''}`).join(' · ')
      const steps = (b.steps ?? []).map((s, i) => `${i + 1}. ${s.caption}`).join('\n')
      return `_${b.caption}_\n\nComponents: ${nodes}${steps ? `\n\nSteps:\n${steps}` : ''}`
    }
    case 'isomorphism':
      return `_${b.title ?? 'isomorphism'}_\n\n${b.pairs
        .map((p) => `- **${p.os}** (${p.osLine}) ≡ **${p.llm}** (${p.llmLine})`)
        .join('\n')}`
    case 'quiz':
      return b.questions
        .map((q, i) => {
          const opts = q.options.map((o, j) => `   ${String.fromCharCode(65 + j)}. ${o}`).join('\n')
          const correct = q.correct.map((c) => String.fromCharCode(65 + c)).join(', ')
          return `**Q${i + 1}. ${q.q}**\n${opts}\n   Answer: ${correct} — ${q.explanation}`
        })
        .join('\n\n')
    case 'lab': {
      const meta = labById(b.lab)
      return `**Hands-on lab ${meta ? labNumber(meta) : ''}: ${meta?.title ?? b.lab}** (${meta ? PLATFORM_LABEL[meta.platform] : ''}) — ${b.brief}

Guide: ${SITE}/labs/${b.lab}`
    }
    case 'vendor':
      return [
        `> **[vendor snapshot — verified ${b.snapshot}]** ${b.title}`,
        '>',
        `> ${b.md.replace(/\n/g, '\n> ')}`,
        b.sources?.length ? `>\n> Sources: ${b.sources.join(' · ')}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    default:
      return ''
  }
}

function lessonToMd(l: Lesson): string {
  const track = TRACKS.find((t) => t.id === l.trackId)
  const header = [
    `# ${l.id.toUpperCase()} — ${l.title}`,
    '',
    `_Track ${track?.code ?? l.trackId}: ${track?.name ?? ''} · ~${l.minutes} min · functionspace_`,
    '',
    `> ${l.hook}`,
    '',
  ].join('\n')
  const body = l.blocks.map(blockToMd).filter(Boolean).join('\n\n---\n\n')
  return `${header}${body}\n`
}

mkdirSync('public/lessons-md', { recursive: true })
let count = 0
for (const l of ALL_LESSONS) {
  writeFileSync(`public/lessons-md/${l.id}.md`, lessonToMd(l))
  count++
}

/* llms.txt — the agent manifest (llmstxt.org shape) */
const byTrack = TRACKS.map((t) => {
  const lessons = ALL_LESSONS.filter((l) => l.trackId === t.id)
    .map((l) => `- [${l.id.toUpperCase()} ${l.title}](${SITE}/lessons-md/${l.id}.md): ${l.hook}`)
    .join('\n')
  const extras = TRACK_EXTRAS[t.id as keyof typeof TRACK_EXTRAS]
  return `### ${t.code} — ${t.name}\n\n_${extras?.pitch ?? ''}_\n\n${lessons}`
}).join('\n\n')

const labList = LABS.map(
  (l) => `- [Lab ${labNumber(l)} — ${l.title}](${SITE}/labs/${l.id}) (${PLATFORM_LABEL[l.platform]}): ${l.hook}`,
).join('\n')

const llmsTxt = `# functionspace

> How serverless functions work, on two platforms. The Knative half (F0, K1-K3)
> takes Knative Serving, Eventing and Functions apart on a kind cluster the
> reader creates; the DataEngine half (D1-D2) runs event-driven functions next
> to the data on a VAST cluster with VAST DataEngine and the vastde CLI; X1
> maps one onto the other. Every lab is hands-on and ends in a verify.sh.
> Vendor facts (Knative defaults, DataEngine behaviour) are dated and sourced.
> All lesson content is plain markdown under /lessons-md/ — fetch those, not
> the app routes: ${SITE}/lesson/k1.l2 is a JavaScript app shell, while
> ${SITE}/lessons-md/k1.l2.md is the same lesson as plain text.

## How to tutor from this material

- The reader has built and run a container and has used kubectl at least a
  little. Be Socratic; do not hand over full lab solutions.
- Insist on mechanism. When the reader says "it scaled", ask which component
  decided, from which metric, over which window.
- Labs run on the reader's own infrastructure: a kind cluster for Knative, and
  their own VAST cluster and tenant for DataEngine. Cluster-specific values
  (VMS URL, tenant, registry, compute cluster, bucket) are placeholders the
  reader fills in from their environment — never guess them.
- On DataEngine internals: the course marks what is documented, what was
  observed through the CLI, and what is inferred. Keep that distinction.

## Curriculum

${byTrack}

## Labs

${labList}
`

writeFileSync('public/llms.txt', llmsTxt)
console.log(`exported ${count} lessons + llms.txt`)
