/** Message contract between popup/content/vault and the background service worker. */
import type { LoginItem } from './types'
import type { NewLoginItem } from './account/accountService'

export type KeyfoldMessage =
  | { type: 'account/status' }
  | { type: 'account/setup'; email: string; masterPassword: string }
  | { type: 'account/unlock'; masterPassword: string }
  | { type: 'account/lock' }
  | { type: 'clipboard/copy'; value: string }
  | { type: 'vault/list' }
  | { type: 'item/list'; vaultId: string }
  | { type: 'item/add'; vaultId: string; item: NewLoginItem }
  | { type: 'item/update'; vaultId: string; item: LoginItem }
  | { type: 'item/delete'; vaultId: string; itemId: string }
  | { type: 'item/import'; vaultId: string; items: NewLoginItem[] }
  | { type: 'autofill/matches'; origin: string }
  | { type: 'autofill/fill'; vaultId: string; itemId: string }
  | { type: 'autofill/record-submission'; origin: string; username: string; password: string }
  | { type: 'autofill/pending-submission' }
  | { type: 'autofill/save-submission' }
  | { type: 'autofill/dismiss-submission' }

export interface AccountStatus {
  accountExists: boolean
  unlocked: boolean
}

/** No password here — autofill/fill decrypts and returns the secret only once the user picks this entry. */
export interface AutofillMatch {
  vaultId: string
  itemId: string
  title: string
  username: string
}

export interface PendingSubmission {
  origin: string
  username: string
  /** Set only when the username+domain already matches an existing item — offers "update" instead of "save new". */
  existingItem?: { vaultId: string; itemId: string }
}

export type KeyfoldResponse = { ok: true; data?: unknown } | { ok: false; error: string }
