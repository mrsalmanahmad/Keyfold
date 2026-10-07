import { sendMessage } from './messaging'

/**
 * Copies a value via the background's offscreen clipboard document, which clears it again
 * after a delay regardless of whether this popup (or vault tab) is still open — see
 * src/background/offscreenClipboard.ts.
 */
export async function copyWithAutoClear(value: string): Promise<void> {
  await sendMessage({ type: 'clipboard/copy', value })
}
