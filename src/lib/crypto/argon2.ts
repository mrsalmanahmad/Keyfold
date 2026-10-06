import { argon2id } from 'hash-wasm'
import type { Bytes } from '../types'

/** Master Key derivation parameters — see PROJECT_PLAN.md § Security and encryption model. */
export const ARGON2_PARAMS = {
  memorySizeKb: 64 * 1024,
  iterations: 3,
  parallelism: 1,
  hashLengthBytes: 32,
} as const

/**
 * Derives the Master Key from the user's master password. Never stored, never sent —
 * the result must only ever live in chrome.storage.session for the duration of the unlock.
 */
export async function deriveMasterKey(password: string, salt: Bytes): Promise<Bytes> {
  const hash = await argon2id({
    password,
    salt,
    memorySize: ARGON2_PARAMS.memorySizeKb,
    iterations: ARGON2_PARAMS.iterations,
    parallelism: ARGON2_PARAMS.parallelism,
    hashLength: ARGON2_PARAMS.hashLengthBytes,
    outputType: 'binary',
  })
  return hash as Bytes
}

export function generateSalt(): Bytes {
  return crypto.getRandomValues(new Uint8Array(16))
}
