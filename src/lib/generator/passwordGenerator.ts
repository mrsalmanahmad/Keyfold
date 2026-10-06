import { randomInt } from '../crypto/randomInt'

const CHARSETS = {
  // No 0/O/1/l/I: avoids characters that look identical in a lot of UI fonts.
  uppercase: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
  lowercase: 'abcdefghjkmnpqrstuvwxyz',
  digits: '23456789',
  symbols: '!@#$%^&*()-_=+[]{}',
} as const

export interface PasswordGeneratorOptions {
  length: number
  useUppercase: boolean
  useLowercase: boolean
  useDigits: boolean
  useSymbols: boolean
}

export const MIN_PASSWORD_LENGTH = 8
export const MAX_PASSWORD_LENGTH = 64

export function generatePassword(options: PasswordGeneratorOptions): string {
  if (options.length < MIN_PASSWORD_LENGTH || options.length > MAX_PASSWORD_LENGTH) {
    throw new Error(`Password length must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH}`)
  }

  const pools: string[] = []
  if (options.useUppercase) pools.push(CHARSETS.uppercase)
  if (options.useLowercase) pools.push(CHARSETS.lowercase)
  if (options.useDigits) pools.push(CHARSETS.digits)
  if (options.useSymbols) pools.push(CHARSETS.symbols)
  if (pools.length === 0) throw new Error('Select at least one character set')

  const alphabet = pools.join('')

  // Guarantee at least one character from every selected pool, then fill the rest from
  // the combined alphabet, then shuffle — otherwise a short length could plausibly miss
  // a required pool entirely by chance.
  const required = pools.map((pool) => pool[randomInt(pool.length)])
  const rest = Array.from({ length: options.length - required.length }, () => alphabet[randomInt(alphabet.length)])
  const chars = [...required, ...rest]

  // Fisher-Yates shuffle using the same unbiased source.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }

  return chars.join('')
}
