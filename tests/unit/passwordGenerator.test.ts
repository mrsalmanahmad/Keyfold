import { describe, expect, it } from 'vitest'
import { generatePassword } from '../../src/lib/generator/passwordGenerator'

describe('generatePassword', () => {
  it('produces a password of the requested length', () => {
    for (const length of [8, 16, 32, 64]) {
      const password = generatePassword({
        length,
        useUppercase: true,
        useLowercase: true,
        useDigits: true,
        useSymbols: true,
      })
      expect(password).toHaveLength(length)
    }
  })

  it('only uses characters from the selected sets', () => {
    const password = generatePassword({
      length: 32,
      useUppercase: false,
      useLowercase: false,
      useDigits: true,
      useSymbols: false,
    })
    expect(password).toMatch(/^[2-9]+$/)
  })

  it('includes at least one character from every selected set', () => {
    for (let i = 0; i < 50; i++) {
      const password = generatePassword({
        length: 8,
        useUppercase: true,
        useLowercase: true,
        useDigits: true,
        useSymbols: true,
      })
      expect(password).toMatch(/[A-Z]/)
      expect(password).toMatch(/[a-z]/)
      expect(password).toMatch(/[0-9]/)
      expect(password).toMatch(/[!@#$%^&*()\-_=+[\]{}]/)
    }
  })

  it('throws if no character set is selected', () => {
    expect(() =>
      generatePassword({ length: 16, useUppercase: false, useLowercase: false, useDigits: false, useSymbols: false }),
    ).toThrow()
  })

  it('throws for an out-of-range length', () => {
    const base = { useUppercase: true, useLowercase: true, useDigits: true, useSymbols: true }
    expect(() => generatePassword({ ...base, length: 7 })).toThrow()
    expect(() => generatePassword({ ...base, length: 65 })).toThrow()
  })

  it('is not deterministic across calls', () => {
    const options = { length: 20, useUppercase: true, useLowercase: true, useDigits: true, useSymbols: true }
    const a = generatePassword(options)
    const b = generatePassword(options)
    expect(a).not.toBe(b)
  })
})
