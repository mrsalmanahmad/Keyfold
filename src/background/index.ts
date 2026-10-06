/**
 * Service worker: the only part of the extension that ever holds decrypted keys
 * (in chrome.storage.session) or writes to persistent storage. Popup/content/vault
 * send it messages and never touch crypto or storage directly.
 */
import type { KeyfoldMessage, KeyfoldResponse } from '../lib/messages'
import {
  addItemToVault,
  deleteItemFromVault,
  hasAccount,
  listItemsInVault,
  listVaultSummaries,
  openVault,
  setupAccount,
  unlockAccount,
  updateItemInVault,
  type UnlockedAccount,
} from '../lib/account/accountService'
import { localStore } from './chromeStore'
import { clearSession, loadSession, saveSession } from './sessionState'

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

chrome.runtime.onMessage.addListener((message: KeyfoldMessage, _sender, sendResponse) => {
  handleMessage(message)
    .then((data) => sendResponse({ ok: true, data } satisfies KeyfoldResponse))
    .catch((err: unknown) =>
      sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) } satisfies KeyfoldResponse),
    )
  return true // keep the message channel open for the async response
})

async function handleMessage(message: KeyfoldMessage): Promise<unknown> {
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

    default:
      throw new Error(`Unknown message type: ${(message as { type: string }).type}`)
  }
}
