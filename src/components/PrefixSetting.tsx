import { useState } from 'react'
import { useProgress } from '@/lib/progress'
import { isValidPrefix } from '@/lib/lab-code'

/** The reader's resource prefix — shown on the Labs page and on each lab page. */
export default function PrefixSetting() {
  const prefix = useProgress((s) => s.settings.prefix)
  const updateSettings = useProgress((s) => s.updateSettings)
  const [draft, setDraft] = useState(prefix ?? '')
  const valid = isValidPrefix(draft)

  return (
    <div className="rounded-lg border border-line bg-surface-1 p-5">
      <p className="font-mono text-label uppercase text-text-3">your prefix</p>
      <p className="mt-2 text-body-sm text-text-2">
        Every lab names its objects from one short handle — <code>alice-hello</code>,{' '}
        <code>alice-echo</code> — so several people can share a cluster or a tenant without
        colliding. Use the same value as <code>PREFIX</code> in your shell; completion codes are
        derived from it.
      </p>
      <form
        className="mt-4 flex flex-wrap items-center gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) updateSettings({ prefix: draft })
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value.trim().toLowerCase())}
          placeholder="e.g. alice"
          aria-label="prefix"
          className="w-48 rounded-md border border-line bg-surface-2 px-3 py-2 font-mono text-body-sm text-text-1 outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={!valid || draft === prefix}
          className="rounded-md border border-accent/60 bg-accent/10 px-4 py-2 font-mono text-[12px] text-accent transition-colors hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          save
        </button>
        {prefix && (
          <span className="font-mono text-[11px] text-text-3">
            saved: <span className="text-text-1">{prefix}</span>
          </span>
        )}
      </form>
      {draft && !valid && (
        <p className="mt-2 font-mono text-[11px] text-amber">
          3–20 characters: lowercase letters, digits and hyphens; start with a letter, end with a
          letter or digit.
        </p>
      )}
    </div>
  )
}

