import type { KeyValueStore } from '../lib/storage/KeyValueStore'
import type { AutofillMatch } from '../lib/messages'
import type { UnlockedAccount } from '../lib/account/accountService'
import { listVaultIds, listItemsInVault, openVault } from '../lib/account/accountService'
import { sameRegistrableDomain } from '../lib/autofill/domainMatch'
import type { PendingFormSubmission } from './pendingSubmissions'

export async function findMatchesForOrigin(
  store: KeyValueStore,
  account: UnlockedAccount,
  origin: string,
): Promise<AutofillMatch[]> {
  const matches: AutofillMatch[] = []
  for (const vaultId of await listVaultIds(store)) {
    const opened = await openVault(store, vaultId, account)
    const items = await listItemsInVault(store, vaultId, opened.vaultKey)
    for (const item of items) {
      if (item.url && sameRegistrableDomain(item.url, origin)) {
        matches.push({ vaultId, itemId: item.itemId, title: item.title, username: item.username })
      }
    }
  }
  return matches
}

export interface ExistingItemRef {
  vaultId: string
  itemId: string
}

export interface ExistingItemMatch {
  ref: ExistingItemRef
  /** True when the submitted password is identical to what's already stored — nothing to prompt for. */
  passwordUnchanged: boolean
}

/** Same username on the same registrable domain → treat a new submission as an update, not a duplicate. */
export async function findExistingItemForSubmission(
  store: KeyValueStore,
  account: UnlockedAccount,
  submission: Pick<PendingFormSubmission, 'origin' | 'username' | 'password'>,
): Promise<ExistingItemMatch | undefined> {
  for (const vaultId of await listVaultIds(store)) {
    const opened = await openVault(store, vaultId, account)
    const items = await listItemsInVault(store, vaultId, opened.vaultKey)
    const found = items.find(
      (item) => item.username === submission.username && item.url && sameRegistrableDomain(item.url, submission.origin),
    )
    if (found) {
      return { ref: { vaultId, itemId: found.itemId }, passwordUnchanged: found.password === submission.password }
    }
  }
  return undefined
}
