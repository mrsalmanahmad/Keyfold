import { describe, expect, it } from 'vitest'
import { randomInt } from '../../src/lib/crypto/randomInt'

describe('randomInt', () => {
  it('always returns a value in [0, exclusiveMax)', () => {
    for (let i = 0; i < 500; i++) {
      const value = randomInt(7)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(7)
    }
  })

  it('covers the full range given enough samples', () => {
    const seen = new Set<number>()
    for (let i = 0; i < 1000; i++) seen.add(randomInt(10))
    expect(seen.size).toBe(10)
  })

  it('rejects an exclusiveMax outside (0, 256]', () => {
    expect(() => randomInt(0)).toThrow()
    expect(() => randomInt(257)).toThrow()
    expect(() => randomInt(1.5)).toThrow()
  })
})
