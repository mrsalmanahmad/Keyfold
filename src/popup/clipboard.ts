/**
 * Copies a value and clears the clipboard ~30s later if it's still what we wrote (see
 * PROJECT_PLAN.md § In-browser hygiene). KNOWN LIMITATION: this timer lives in the popup,
 * which Chrome tears down as soon as it loses focus — so the clear only actually fires if
 * the user leaves the popup open. A clear that survives popup close needs a
 * chrome.offscreen document (service workers have no clipboard access of their own);
 * that's follow-up work, not implemented yet.
 */
const CLEAR_AFTER_MS = 30_000

export async function copyWithAutoClear(value: string): Promise<void> {
  await navigator.clipboard.writeText(value)
  setTimeout(() => {
    void (async () => {
      try {
        const current = await navigator.clipboard.readText()
        if (current === value) await navigator.clipboard.writeText('')
      } catch {
        // Clipboard read is blocked in this context — clear unconditionally rather than leak the secret indefinitely.
        await navigator.clipboard.writeText('').catch(() => undefined)
      }
    })()
  }, CLEAR_AFTER_MS)
}
