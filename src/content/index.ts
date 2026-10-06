/**
 * Finds login forms, renders the in-field Keyfold icon, autofills on pick, and shows a
 * save/update prompt after a form submits. Never touches keys or Drive directly — every
 * secret flows through a message to the background service worker. See PROJECT_PLAN.md
 * § Features and UX (In-field icon, Save / update prompt) and § In-browser hygiene
 * (autofill only on an exact registrable-domain match, enforced in the background, not
 * here — this script never decides whether a match is "close enough").
 */
import type { AutofillMatch, PendingSubmission } from '../lib/messages'
import { sendMessage } from '../lib/sendMessage'
import { detectLoginFields, setFieldValue } from './formDetection'
import { attachFieldIcon } from './fieldIcon'
import { showSaveBar } from './saveBar'
import { generatePassword } from '../lib/generator/passwordGenerator'

const attachedFields = new WeakSet<HTMLInputElement>()

async function getMatches(): Promise<AutofillMatch[]> {
  try {
    return await sendMessage<AutofillMatch[]>({ type: 'autofill/matches', origin: location.origin })
  } catch {
    return []
  }
}

async function fillMatch(
  match: AutofillMatch,
  passwordField: HTMLInputElement,
  usernameField: HTMLInputElement | null,
): Promise<void> {
  try {
    const secret = await sendMessage<{ username: string; password: string }>({
      type: 'autofill/fill',
      vaultId: match.vaultId,
      itemId: match.itemId,
    })
    if (usernameField) setFieldValue(usernameField, secret.username)
    setFieldValue(passwordField, secret.password)
  } catch (err) {
    console.error('[Keyfold] autofill failed:', err)
  }
}

function scanAndAttachIcons(): void {
  for (const { passwordField, usernameField } of detectLoginFields()) {
    for (const field of [passwordField, usernameField]) {
      if (!field || attachedFields.has(field)) continue
      attachedFields.add(field)
      attachFieldIcon(field, {
        getMatches,
        onPick: (match) => void fillMatch(match, passwordField, usernameField),
        onGenerate:
          field === passwordField
            ? () => setFieldValue(passwordField, generatePassword({
                length: 20,
                useUppercase: true,
                useLowercase: true,
                useDigits: true,
                useSymbols: true,
              }))
            : undefined,
      })
    }
  }
}

function attachSubmitCapture(): void {
  document.addEventListener(
    'submit',
    (event) => {
      if (!(event.target instanceof HTMLFormElement)) return
      const form = event.target
      const passwordField = form.querySelector<HTMLInputElement>('input[type="password"]')
      if (!passwordField?.value) return

      const detected = detectLoginFields(form).find((f) => f.passwordField === passwordField)
      void sendMessage({
        type: 'autofill/record-submission',
        origin: location.origin,
        username: detected?.usernameField?.value ?? '',
        password: passwordField.value,
      }).catch(() => undefined)
    },
    true,
  )
}

async function checkPendingSubmission(): Promise<void> {
  let pending: PendingSubmission | null
  try {
    pending = await sendMessage<PendingSubmission | null>({ type: 'autofill/pending-submission' })
  } catch {
    return
  }
  if (!pending) return

  const label = pending.existingItem
    ? `Update the saved password for ${pending.username}?`
    : `Save password for ${pending.username}?`

  showSaveBar(label, pending.existingItem ? 'Update' : 'Save', {
    onSave: () => void sendMessage({ type: 'autofill/save-submission' }).catch((err) => console.error('[Keyfold] save failed:', err)),
    onDismiss: () => void sendMessage({ type: 'autofill/dismiss-submission' }).catch(() => undefined),
  })
}

scanAndAttachIcons()
attachSubmitCapture()
void checkPendingSubmission()

new MutationObserver(() => scanAndAttachIcons()).observe(document.documentElement, {
  childList: true,
  subtree: true,
})
