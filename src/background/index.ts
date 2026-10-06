/**
 * Service worker: the only part of the extension that ever holds decrypted keys
 * (in chrome.storage.session) or talks to Drive. Popup/content/vault send it
 * messages and never touch crypto or the network directly.
 */

import type { KeyfoldMessage, KeyfoldResponse } from '../lib/messages'

const AUTO_LOCK_ALARM = 'keyfold-auto-lock'
const DEFAULT_IDLE_MINUTES = 15

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(AUTO_LOCK_ALARM, { periodInMinutes: 1 })
})

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === AUTO_LOCK_ALARM) {
    void checkIdleAndLock()
  }
})

async function checkIdleAndLock(): Promise<void> {
  // STATUS: stub — real idle tracking (last-activity timestamp in session storage)
  // lands with the crypto core in Phase 2. See PROJECT_PLAN.md build tracker.
  void DEFAULT_IDLE_MINUTES
}

chrome.runtime.onMessage.addListener((message: KeyfoldMessage, _sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch((err: unknown) => sendResponse({ ok: false, error: String(err) }))
  return true // keep the message channel open for the async response
})

async function handleMessage(message: KeyfoldMessage): Promise<KeyfoldResponse> {
  switch (message.type) {
    case 'vault/status':
      return { ok: true, data: { unlocked: false } }
    case 'auth/sign-in':
    case 'auth/sign-out':
    case 'vault/unlock':
    case 'vault/lock':
      return { ok: false, error: `${message.type} not implemented yet` }
    default:
      return { ok: false, error: 'Unknown message type' }
  }
}
