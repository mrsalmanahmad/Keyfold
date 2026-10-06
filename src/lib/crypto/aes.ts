/** AES-256-GCM item encryption via WebCrypto. Nonces are 96-bit and never reused per key. */
import type { Bytes } from '../types'

const AES_ALGO = 'AES-GCM'
const NONCE_BYTES = 12

export async function importAesKey(rawKey: Bytes): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', rawKey, AES_ALGO, false, ['encrypt', 'decrypt'])
}

export function generateAesKeyBytes(): Bytes {
  return crypto.getRandomValues(new Uint8Array(32))
}

export interface AesCiphertext {
  nonce: Bytes
  ciphertext: Bytes
}

/** `aad` binds ciphertext to its item id so a swapped-in item from elsewhere fails to decrypt. */
export async function encryptItem(
  key: CryptoKey,
  plaintext: Bytes,
  aad: Bytes,
): Promise<AesCiphertext> {
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_BYTES))
  const buf = await crypto.subtle.encrypt(
    { name: AES_ALGO, iv: nonce, additionalData: aad },
    key,
    plaintext,
  )
  return { nonce, ciphertext: new Uint8Array(buf) }
}

export async function decryptItem(
  key: CryptoKey,
  { nonce, ciphertext }: AesCiphertext,
  aad: Bytes,
): Promise<Bytes> {
  const buf = await crypto.subtle.decrypt(
    { name: AES_ALGO, iv: nonce, additionalData: aad },
    key,
    ciphertext,
  )
  return new Uint8Array(buf)
}
