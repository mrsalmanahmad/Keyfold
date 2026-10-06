import { randomInt } from '../crypto/randomInt'
import { WORDLIST } from './wordlist'

export interface PassphraseGeneratorOptions {
  wordCount: number
  separator: string
  includeNumber: boolean
}

export const MIN_PASSPHRASE_WORDS = 3
export const MAX_PASSPHRASE_WORDS = 10

export function generatePassphrase(options: PassphraseGeneratorOptions): string {
  if (options.wordCount < MIN_PASSPHRASE_WORDS || options.wordCount > MAX_PASSPHRASE_WORDS) {
    throw new Error(`wordCount must be between ${MIN_PASSPHRASE_WORDS} and ${MAX_PASSPHRASE_WORDS}`)
  }

  const words = Array.from({ length: options.wordCount }, () => WORDLIST[randomInt(WORDLIST.length)])
  if (options.includeNumber) {
    const position = randomInt(words.length)
    words[position] = `${words[position]}${randomInt(100)}`
  }

  return words.join(options.separator)
}
