import { OFFSCREEN_TARGET, type OffscreenCopyMessage } from '../background/offscreenClipboard'

/**
 * execCommand('copy') with an empty selection is a silent no-op on the system clipboard
 * (confirmed by hand: clearing with '' leaves the previous value in place) — a single space
 * is the smallest value that reliably overwrites it, which is all "clear" needs to do here.
 */
const CLEARED_VALUE = ' '

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!isOffscreenCopyMessage(message)) return false

  try {
    writeToClipboard(message.value)
    sendResponse({ ok: true })
    setTimeout(() => {
      try {
        writeToClipboard(CLEARED_VALUE)
      } catch (err) {
        console.error('[keyfold offscreen clipboard] scheduled clear failed:', err)
      }
    }, message.clearAfterMs)
  } catch (err) {
    console.error('[keyfold offscreen clipboard] write failed:', err)
    sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
  return true
})

/**
 * An offscreen document is never focused, so the async Clipboard API
 * (navigator.clipboard.writeText) throws "Document is not focused" here — this is Chrome's
 * documented workaround: a hidden, selected textarea + the legacy execCommand('copy'), which
 * offscreen documents are specifically allowed to use. Same reasoning rules out reading the
 * clipboard back to check "is it still what we wrote" before clearing — we clear
 * unconditionally instead, which is the safer default for a secret even if the user happened
 * to copy something else in the meantime.
 */
function writeToClipboard(value: string): void {
  const textarea = document.createElement('textarea')
  textarea.value = value
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)
  if (!copied) throw new Error('document.execCommand("copy") failed')
}

function isOffscreenCopyMessage(message: unknown): message is OffscreenCopyMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    'target' in message &&
    (message as { target: unknown }).target === OFFSCREEN_TARGET
  )
}
