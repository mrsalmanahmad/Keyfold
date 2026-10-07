/**
 * Clipboard writes need a `chrome.offscreen` document: the service worker has no DOM, and the
 * popup's own clipboard access dies the instant the popup closes — which defeats the whole
 * point of an auto-clear timer (see the removed logic in src/popup/clipboard.ts). The offscreen
 * document stays alive independent of the popup, so the clear still fires.
 */
export const OFFSCREEN_TARGET = 'keyfold-offscreen-clipboard'

export interface OffscreenCopyMessage {
  target: typeof OFFSCREEN_TARGET
  type: 'copy-with-auto-clear'
  value: string
  clearAfterMs: number
}

const OFFSCREEN_DOCUMENT_PATH = 'src/offscreen/index.html'
const CLEAR_AFTER_MS = 30_000

async function ensureOffscreenDocument(): Promise<void> {
  if (await chrome.offscreen.hasDocument()) return
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT_PATH,
    reasons: [chrome.offscreen.Reason.CLIPBOARD],
    justification: "Write a password to the clipboard and clear it again later, even if the popup has closed.",
  })
}

export async function copyToClipboardWithAutoClear(value: string): Promise<void> {
  await ensureOffscreenDocument()
  await chrome.runtime.sendMessage({
    target: OFFSCREEN_TARGET,
    type: 'copy-with-auto-clear',
    value,
    clearAfterMs: CLEAR_AFTER_MS,
  } satisfies OffscreenCopyMessage)
}
