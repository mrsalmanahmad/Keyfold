import { describe, expect, it } from 'vitest'
import { ARGON2_PARAMS, deriveMasterKey, generateSalt } from '../../src/lib/crypto/argon2'

describe('deriveMasterKey', () => {
  it('is deterministic for the same password and salt', async () => {
    const salt = generateSalt()
    const a = await deriveMasterKey('correct horse battery staple', salt)
    const b = await deriveMasterKey('correct horse battery staple', salt)
    expect(a).toEqual(b)
    expect(a.length).toBe(ARGON2_PARAMS.hashLengthBytes)
  })

  it('differs for a different password', async () => {
    const salt = generateSalt()
    const a = await deriveMasterKey('correct horse battery staple', salt)
    const b = await deriveMasterKey('wrong password', salt)
    expect(a).not.toEqual(b)
  })

  it('differs for a different salt', async () => {
    const a = await deriveMasterKey('same password', generateSalt())
    const b = await deriveMasterKey('same password', generateSalt())
    expect(a).not.toEqual(b)
  })
})
