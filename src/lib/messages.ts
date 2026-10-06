/** Message contract between popup/content/vault and the background service worker. */
import type { LoginItem } from './types'
import type { NewLoginItem } from './account/accountService'

export type KeyfoldMessage =
  | { type: 'account/status' }
  | { type: 'account/setup'; email: string; masterPassword: string }
  | { type: 'account/unlock'; masterPassword: string }
  | { type: 'account/lock' }
  | { type: 'vault/list' }
  | { type: 'item/list'; vaultId: string }
  | { type: 'item/add'; vaultId: string; item: NewLoginItem }
  | { type: 'item/update'; vaultId: string; item: LoginItem }
  | { type: 'item/delete'; vaultId: string; itemId: string }

export interface AccountStatus {
  accountExists: boolean
  unlocked: boolean
}

export type KeyfoldResponse = { ok: true; data?: unknown } | { ok: false; error: string }
