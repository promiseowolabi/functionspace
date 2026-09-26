/**
 * Lab contract tests.
 *
 * Two places must agree that no reviewer would notice drifting apart:
 *
 *  1. The completion code. `fs_code` in labs/common/lib.sh prints it; lab-code.ts
 *     recomputes it in the browser. If they disagree, every reader's paste fails.
 *  2. The check ids. The site lists what verify.sh checks (src/data/labs.ts);
 *     verify.sh is what actually checks. A renamed check makes the page lie.
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LABS } from '@/data/labs'
import { checkLabCode, isValidPrefix, labCode, normaliseCode } from '@/lib/lab-code'

const ROOT = new URL('..', import.meta.url).pathname
const LIB = join(ROOT, 'labs/common/lib.sh')

function bashCode(lab: string, prefix: string): string {
  return execFileSync('bash', ['-c', `. "${LIB}"; fs_code "$1" "$2"`, 'x', lab, prefix], {
    encoding: 'utf8',
  }).trim()
}

describe('completion codes', () => {
  it('bash and TypeScript produce the same code', async () => {
    for (const [lab, prefix] of [
      ['kind-knative', 'alice'],
      ['de-element-trigger', 'bob-2'],
      ['traffic-split', 'zz9'],
    ]) {
      expect(await labCode(lab, prefix), `${lab}/${prefix}`).toBe(bashCode(lab, prefix))
    }
  })

  it('pins a known vector (so both cannot drift together)', async () => {
    expect(await labCode('kind-knative', 'alice')).toBe('FS-KIND-KNATIVE-87bffe31')
  })

  it('accepts sloppy pastes and rejects wrong prefixes', async () => {
    expect(normaliseCode('  fs-kind-knative-87BFFE31 ')).toBe('FS-KIND-KNATIVE-87bffe31')
    expect(await checkLabCode('kind-knative', 'alice', 'fs-kind-knative-87bffe31')).toBe(true)
    expect(await checkLabCode('kind-knative', 'bob', 'FS-KIND-KNATIVE-87bffe31')).toBe(false)
  })

  it('validates prefixes the same way lib.sh does', () => {
    for (const ok of ['alice', 'bob-2', 'zz9']) expect(isValidPrefix(ok), ok).toBe(true)
    for (const bad of ['a', 'Alice', '9lives', 'trailing-', 'has_underscore', 'x'.repeat(21)]) {
      expect(isValidPrefix(bad), bad).toBe(false)
    }
  })
})

describe('verify.sh ⇄ the lab registry', () => {
  for (const lab of LABS) {
    const path = join(ROOT, 'labs', lab.id, 'verify.sh')
    it(`${lab.id}: checks exactly the ids the site lists, and finishes with its own id`, () => {
      expect(existsSync(path), `${path} missing`).toBe(true)
      const src = readFileSync(path, 'utf8')
      const ids = [...src.matchAll(/^\s*check\s+([a-z0-9-]+)\s/gm)].map((m) => m[1])
      expect(ids).toEqual(lab.checks.map((c) => c.id))
      expect(src).toMatch(new RegExp(`^finish ${lab.id}$`, 'm'))
      expect(src).toContain('. "$HERE/../common/lib.sh"')
    })
  }
})
