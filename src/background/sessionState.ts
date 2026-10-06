import type { Bytes } from '../lib/types'
import type { UserKeyMaterial } from '../lib/crypto/keys'
import { base64ToBytes, bytesToBase64 } from '../lib/crypto/encoding'
import { sessionStore } from './chromeStore'

const SESSION_KEY = 'keyfold.session'

interface SerializedSessionState {
  userId: string
  email: string
  masterKey: string
  userKeyMaterial: {
    boxPublicKey: string
    boxPrivateKey: string
    signPublicKey: string
    signPrivateKey: string
  }
  /** epoch ms of the last message handled — drives idle auto-lock. */
  lastActivity: number
}

/**
 * Only the Master Key and decrypted keypair are cached here — re-deriving the Master Key
 * from the password is deliberately slow (Argon2id), so that's the thing worth avoiding on
 * every message. Unsealing a Vault Key is cheap in comparison, so vault access just calls
 * openVault() again each time rather than caching a second layer of unlocked keys.
 */
export interface SessionState {
  userId: string
  email: string
  masterKey: Bytes
  userKeyMaterial: UserKeyMaterial
  lastActivity: number
}

export async function loadSession(): Promise<SessionState | undefined> {
  const serialized = await sessionStore.get<SerializedSessionState>(SESSION_KEY)
  if (!serialized) return undefined
  return {
    userId: serialized.userId,
    email: serialized.email,
    masterKey: base64ToBytes(serialized.masterKey),
    userKeyMaterial: {
      boxPublicKey: base64ToBytes(serialized.userKeyMaterial.boxPublicKey),
      boxPrivateKey: base64ToBytes(serialized.userKeyMaterial.boxPrivateKey),
      signPublicKey: base64ToBytes(serialized.userKeyMaterial.signPublicKey),
      signPrivateKey: base64ToBytes(serialized.userKeyMaterial.signPrivateKey),
    },
    lastActivity: serialized.lastActivity,
  }
}

export async function saveSession(state: SessionState): Promise<void> {
  const serialized: SerializedSessionState = {
    userId: state.userId,
    email: state.email,
    masterKey: bytesToBase64(state.masterKey),
    userKeyMaterial: {
      boxPublicKey: bytesToBase64(state.userKeyMaterial.boxPublicKey),
      boxPrivateKey: bytesToBase64(state.userKeyMaterial.boxPrivateKey),
      signPublicKey: bytesToBase64(state.userKeyMaterial.signPublicKey),
      signPrivateKey: bytesToBase64(state.userKeyMaterial.signPrivateKey),
    },
    lastActivity: state.lastActivity,
  }
  await sessionStore.set(SESSION_KEY, serialized)
}

export async function clearSession(): Promise<void> {
  await sessionStore.remove(SESSION_KEY)
}

export async function touchSessionActivity(): Promise<void> {
  const session = await loadSession()
  if (!session) return
  session.lastActivity = Date.now()
  await saveSession(session)
}
