import { describe, expect, it } from 'vitest'
import { generateUserKeyMaterial } from '../../src/lib/crypto/keys'
import { publicKeyFingerprint } from '../../src/lib/crypto/fingerprint'

describe('publicKeyFingerprint', () => {
  it('is deterministic for the same public key', async () => {
    const { boxPublicKey } = await generateUserKeyMaterial()
    const a = await publicKeyFingerprint(boxPublicKey)
    const b = await publicKeyFingerprint(boxPublicKey)
    expect(a).toEqual(b)
    expect(a).toHaveLength(4)
  })

  it('differs for different public keys', async () => {
    const a = await generateUserKeyMaterial()
    const b = await generateUserKeyMaterial()
    expect(await publicKeyFingerprint(a.boxPublicKey)).not.toEqual(await publicKeyFingerprint(b.boxPublicKey))
  })
})
