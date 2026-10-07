/**
 * Opens Google's folder picker in a separate window pointed at docs/picker.html, a static
 * page hosted outside the extension (GitHub Pages) — not an extension page. That's
 * required, not a style choice: Chrome's MV3 platform CSP forbids any chrome-extension://
 * page from ever loading a remote script, with no exception, and Google's Picker library
 * only ships as a script loaded from apis.google.com. See docs/picker.html for its side of
 * this handshake.
 */
import { GOOGLE_PICKER_API_KEY } from './googlePickerConfig'

// GitHub Pages for this repo is configured to serve from the repo root (not /docs), so the
// live path keeps the /docs/ prefix — see PROJECT_PLAN.md § Build status tracker if that
// Pages setting ever changes.
const PICKER_PAGE_URL = 'https://mrsalmanahmad.github.io/Keyfold/docs/picker.html'
const PICKER_PAGE_ORIGIN = new URL(PICKER_PAGE_URL).origin

export interface PickedFolder {
  id: string
  name: string
}

/** Resolves to null if the user closes the picker without selecting a folder. */
export function pickDriveFolder(accessToken: string): Promise<PickedFolder | null> {
  return new Promise((resolve, reject) => {
    const pickerWindow = window.open(PICKER_PAGE_URL, 'keyfold-picker', 'width=1051,height=650')
    if (!pickerWindow) {
      reject(new Error('Could not open the Drive picker window — check your popup blocker'))
      return
    }

    let settled = false

    function finish(result: PickedFolder | null) {
      if (settled) return
      settled = true
      window.removeEventListener('message', handleMessage)
      clearInterval(closeCheck)
      resolve(result)
    }

    function handleMessage(event: MessageEvent) {
      if (event.source !== pickerWindow || event.origin !== PICKER_PAGE_ORIGIN) return

      if (event.data?.type === 'keyfold-picker-ready') {
        pickerWindow!.postMessage(
          { type: 'keyfold-picker-init', token: accessToken, apiKey: GOOGLE_PICKER_API_KEY },
          PICKER_PAGE_ORIGIN,
        )
      } else if (event.data?.type === 'keyfold-picker-result') {
        finish(event.data.folder ?? null)
      }
    }

    window.addEventListener('message', handleMessage)

    // The user can also just close the picker window without it ever posting a result.
    const closeCheck = setInterval(() => {
      if (pickerWindow.closed) finish(null)
    }, 500)
  })
}
