/**
 * Lab completion codes.
 *
 * Every lab's `verify.sh` ends by printing `FS-<LAB>-<8 hex>`, where the hex is
 * the first 8 characters of sha256("functionspace:<lab id>:<prefix>"). The
 * site recomputes the same value from the reader's prefix and compares.
 *
 * This is a progress marker, not an exam: anyone who reads verify.sh can mint
 * a code. It exists so "I finished lab 04" is one paste instead of a checkbox,
 * and so a typo'd paste is caught. The course says so on the Labs page.
 *
 * Keep in lock-step with labs/common/lib.sh (`fs_code`) — tests/labs.test.ts
 * checks both against the same vectors.
 */

/** Prefixes become Kubernetes and DataEngine object names: DNS-1123 label rules. */
export const PREFIX_RE = /^[a-z][a-z0-9-]{1,18}[a-z0-9]$/

export function isValidPrefix(prefix: string): boolean {
  return PREFIX_RE.test(prefix)
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** The code a lab's verify.sh prints for this prefix. */
export async function labCode(labId: string, prefix: string): Promise<string> {
  const hex = (await sha256Hex(`functionspace:${labId}:${prefix}`)).slice(0, 8)
  return `FS-${labId.toUpperCase()}-${hex}`
}

/** Normalise a pasted code: trim, collapse case of the hex part. */
export function normaliseCode(pasted: string): string {
  const t = pasted.trim()
  const m = /^fs-(.+)-([0-9a-f]{8})$/i.exec(t)
  return m ? `FS-${m[1].toUpperCase()}-${m[2].toLowerCase()}` : t
}

export async function checkLabCode(labId: string, prefix: string, pasted: string): Promise<boolean> {
  return normaliseCode(pasted) === (await labCode(labId, prefix))
}
