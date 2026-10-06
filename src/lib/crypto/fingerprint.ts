/**
 * Turns a public key into a short, pronounceable word sequence for out-of-band
 * confirmation on invite (see PROJECT_PLAN.md § Key verification). Two people read
 * the same words aloud/compare on screen to confirm a key wasn't substituted by a
 * Drive editor — deterministic and collision-resistant via SHA-256, not meant to be
 * memorized long-term.
 */

import type { Bytes } from '../types'

const ONSETS = ['ba', 'be', 'bi', 'bo', 'bu', 'da', 'de', 'di', 'do', 'du', 'fa', 'fe', 'fi', 'fo', 'fu', 'ga']
const RIMES = ['lin', 'mon', 'tar', 'zek', 'rav', 'nos', 'dex', 'fil', 'gor', 'hun', 'jiv', 'kol', 'lum', 'pex', 'qui', 'rog']

export async function publicKeyFingerprint(publicKey: Bytes, wordCount = 4): Promise<string[]> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', publicKey))
  const words: string[] = []
  for (let i = 0; i < wordCount; i++) {
    const byte = digest[i]
    words.push(ONSETS[byte >> 4] + RIMES[byte & 0x0f])
  }
  return words
}
