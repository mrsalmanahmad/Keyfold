/**
 * Service worker: the only part of the extension that ever holds decrypted keys
 * (in chrome.storage.session) or writes to persistent storage. Popup/content/vault
 * send it messages and never touch crypto or storage directly.
 */
import type { KeyfoldMessage, KeyfoldResponse, PendingSubmission } from '../lib/messages'
import {
  addItemToVault,
  deleteItemFromVault,
  hasAccount,
  listItemsInVault,
  listVaultIds,
  listVaultSummaries,
  openVault,
  setupAccount,
  unlockAccount,
  updateItemInVault,
  type UnlockedAccount,
} from '../lib/account/accountService'
import { localStore } from './chromeStore'
import { clearSession, loadSession, saveSession } from './sessionState'
import { findExistingItemForSubmission, findMatchesForOrigin } from './autofillService'
import { clearPendingSubmission, loadPendingSubmission, savePendingSubmission } from './pendingSubmissions'

const AUTO_LOCK_ALARM = 'keyfold-auto-lock'
const IDLE_LOCK_MINUTES = 15
const DEFAULT_VAULT_NAME = 'Personal'

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(AUTO_LOCK_ALARM, { periodInMinutes: 1 })
})

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === AUTO_LOCK_ALARM) void checkIdleAndLock()
})

async function checkIdleAndLock(): Promise<void> {
  const session = await loadSession()
  if (!session) return
  const idleMs = Date.now() - session.lastActivity
  if (idleMs > IDLE_LOCK_MINUTES * 60_000) await clearSession()
}

/** Every call that needs to be unlocked goes through here, which also resets the idle clock. */
async function requireSession(): Promise<UnlockedAccount> {
  const session = await loadSession()
  if (!session) throw new Error('Vault is locked')
  await saveSession({ ...session, lastActivity: Date.now() })
  return session
}

chrome.runtime.onMessage.addListener((message: KeyfoldMessage, sender, sendResponse) => {
  handleMessage(message, sender)
    .then((data) => sendResponse({ ok: true, data } satisfies KeyfoldResponse))
    .catch((err: unknown) =>
      sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) } satisfies KeyfoldResponse),
    )
  return true // keep the message channel open for the async response
})

async function handleMessage(message: KeyfoldMessage, sender: chrome.runtime.MessageSender): Promise<unknown> {
  switch (message.type) {
    case 'account/status': {
      const [accountExists, session] = await Promise.all([hasAccount(localStore), loadSession()])
      return { accountExists, unlocked: Boolean(session) }
    }

    case 'account/setup': {
      const { account, vaultId } = await setupAccount(localStore, {
        userId: crypto.randomUUID(),
        email: message.email,
        masterPassword: message.masterPassword,
        defaultVaultName: DEFAULT_VAULT_NAME,
      })
      await saveSession({ ...account, lastActivity: Date.now() })
      return { vaultId }
    }

    case 'account/unlock': {
      const account = await unlockAccount(localStore, message.masterPassword)
      await saveSession({ ...account, lastActivity: Date.now() })
      return undefined
    }

    case 'account/lock': {
      await clearSession()
      return undefined
    }

    case 'vault/list': {
      const session = await requireSession()
      return listVaultSummaries(localStore, session)
    }

    case 'item/list': {
      const session = await requireSession()
      const opened = await openVault(localStore, message.vaultId, session)
      return listItemsInVault(localStore, message.vaultId, opened.vaultKey)
    }

    case 'item/add': {
      const session = await requireSession()
      const opened = await openVault(localStore, message.vaultId, session)
      return addItemToVault(localStore, message.vaultId, opened.vaultKey, message.item)
    }

    case 'item/update': {
      const session = await requireSession()
      const opened = await openVault(localStore, message.vaultId, session)
      await updateItemInVault(localStore, message.vaultId, opened.vaultKey, message.item)
      return undefined
    }

    case 'item/delete': {
      const session = await requireSession()
      // openVault re-checks membership and the member-list signature before we mutate anything.
      await openVault(localStore, message.vaultId, session)
      await deleteItemFromVault(localStore, message.vaultId, message.itemId)
      return undefined
    }

    // Fires passively on every page load, so it deliberately doesn't touch requireSession()
    // (no idle-timer reset, no throwing when locked — "no matches" is the right answer then).
    case 'autofill/matches': {
      const session = await loadSession()
      if (!session) return []
      return findMatchesForOrigin(localStore, session, message.origin)
    }

    // Clicking a specific match is a real user action, so this one goes through requireSession().
    case 'autofill/fill': {
      const session = await requireSession()
      const opened = await openVault(localStore, message.vaultId, session)
      const items = await listItemsInVault(localStore, message.vaultId, opened.vaultKey)
      const item = items.find((i) => i.itemId === message.itemId)
      if (!item) throw new Error('Item not found')
      return { username: item.username, password: item.password }
    }

    case 'autofill/record-submission': {
      const tabId = requireTabId(sender)
      await savePendingSubmission(tabId, {
        origin: message.origin,
        username: message.username,
        password: message.password,
        recordedAt: Date.now(),
      })
      return undefined
    }

    case 'autofill/pending-submission': {
      const tabId = requireTabId(sender)
      const pending = await loadPendingSubmission(tabId)
      if (!pending) return null
      const session = await loadSession()
      const match = session ? await findExistingItemForSubmission(localStore, session, pending) : undefined
      if (match?.passwordUnchanged) {
        // Nothing actually changed (e.g. the user just signed in with an autofilled
        // password) — nothing to prompt for.
        await clearPendingSubmission(tabId)
        return null
      }
      return { origin: pending.origin, username: pending.username, existingItem: match?.ref } satisfies PendingSubmission
    }

    case 'autofill/save-submission': {
      const tabId = requireTabId(sender)
      const pending = await loadPendingSubmission(tabId)
      if (!pending) throw new Error('No pending submission to save')
      const session = await requireSession()

      const match = await findExistingItemForSubmission(localStore, session, pending)
      const vaultId = match?.ref.vaultId ?? (await listVaultIds(localStore))[0]
      if (!vaultId) throw new Error('No vault available to save into')
      const opened = await openVault(localStore, vaultId, session)

      if (match) {
        const items = await listItemsInVault(localStore, vaultId, opened.vaultKey)
        const item = items.find((i) => i.itemId === match.ref.itemId)!
        await updateItemInVault(localStore, vaultId, opened.vaultKey, { ...item, password: pending.password })
      } else {
        await addItemToVault(localStore, vaultId, opened.vaultKey, {
          title: new URL(pending.origin).hostname,
          username: pending.username,
          password: pending.password,
          url: pending.origin,
        })
      }
      await clearPendingSubmission(tabId)
      return undefined
    }

    case 'autofill/dismiss-submission': {
      const tabId = requireTabId(sender)
      await clearPendingSubmission(tabId)
      return undefined
    }

    default:
      throw new Error(`Unknown message type: ${(message as { type: string }).type}`)
  }
}

function requireTabId(sender: chrome.runtime.MessageSender): number {
  if (sender.tab?.id === undefined) throw new Error('This message must come from a content script with a tab')
  return sender.tab.id
}
