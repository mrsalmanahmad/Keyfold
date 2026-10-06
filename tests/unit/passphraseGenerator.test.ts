import { describe, expect, it } from 'vitest'
import { generatePassphrase } from '../../src/lib/generator/passphraseGenerator'
import { WORDLIST } from '../../src/lib/generator/wordlist'

describe('generatePassphrase', () => {
  it('produces the requested number of words, joined by the separator', () => {
    const phrase = generatePassphrase({ wordCount: 5, separator: '-', includeNumber: false })
    const words = phrase.split('-')
    expect(words).toHaveLength(5)
    for (const word of words) expect(WORDLIST).toContain(word)
  })

  it('respects a custom separator', () => {
    const phrase = generatePassphrase({ wordCount: 4, separator: '.', includeNumber: false })
    expect(phrase.split('.')).toHaveLength(4)
  })

  it('appends a number to exactly one word when includeNumber is set', () => {
    const phrase = generatePassphrase({ wordCount: 6, separator: '-', includeNumber: true })
    const words = phrase.split('-')
    const withNumber = words.filter((w) => /\d/.test(w))
    expect(withNumber).toHaveLength(1)
  })

  it('throws for an out-of-range word count', () => {
    const base = { separator: '-', includeNumber: false }
    expect(() => generatePassphrase({ ...base, wordCount: 2 })).toThrow()
    expect(() => generatePassphrase({ ...base, wordCount: 11 })).toThrow()
  })

  it('is not deterministic across calls', () => {
    const options = { wordCount: 6, separator: '-', includeNumber: false }
    expect(generatePassphrase(options)).not.toBe(generatePassphrase(options))
  })
})
