import { sessionStore } from './chromeStore'

const PENDING_SUBMISSION_TTL_MS = 5 * 60_000
const key = (tabId: number) => `keyfold.pendingSubmission.${tabId}`

export interface PendingFormSubmission {
  origin: string
  username: string
  password: string
  recordedAt: number
}

export async function savePendingSubmission(tabId: number, submission: PendingFormSubmission): Promise<void> {
  await sessionStore.set(key(tabId), submission)
}

export async function loadPendingSubmission(tabId: number): Promise<PendingFormSubmission | undefined> {
  const submission = await sessionStore.get<PendingFormSubmission>(key(tabId))
  if (!submission) return undefined
  if (Date.now() - submission.recordedAt > PENDING_SUBMISSION_TTL_MS) {
    await clearPendingSubmission(tabId)
    return undefined
  }
  return submission
}

export async function clearPendingSubmission(tabId: number): Promise<void> {
  await sessionStore.remove(key(tabId))
}
