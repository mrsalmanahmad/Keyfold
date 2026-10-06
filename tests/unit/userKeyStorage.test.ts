import { describe, expect, it } from 'vitest'
import { generateUserKeyMaterial } from '../../src/lib/crypto/keys'
import { deriveMasterKey, generateSalt } from '../../src/lib/crypto/argon2'
import { decryptUserKeyMaterial, encryptUserKeyMaterial } from '../../src/lib/vault/userKeyStorage'

describe('encrypted user key storage', () => {
  it('round-trips private keys through Master Key encryption', async () => {
    const masterKey = await deriveMasterKey('correct horse battery staple', generateSalt())
    const material = await generateUserKeyMaterial()

    const encrypted = await encryptUserKeyMaterial(masterKey, material)
    expect(encrypted.boxPublicKey).toEqual(material.boxPublicKey)

    const decrypted = await decryptUserKeyMaterial(masterKey, encrypted)
    expect(decrypted).toEqual(material)
  })

  it('fails to decrypt with the wrong master key', async () => {
    const material = await generateUserKeyMaterial()
    const encrypted = await encryptUserKeyMaterial(
      await deriveMasterKey('right password', generateSalt()),
      material,
    )

    await expect(
      decryptUserKeyMaterial(await deriveMasterKey('wrong password', generateSalt()), encrypted),
    ).rejects.toThrow()
  })

  it('fails to decrypt if the ciphertext is tampered with', async () => {
    const masterKey = await deriveMasterKey('correct horse battery staple', generateSalt())
    const material = await generateUserKeyMaterial()
    const encrypted = await encryptUserKeyMaterial(masterKey, material)

    const tampered = new Uint8Array(encrypted.ciphertext)
    tampered[0] ^= 0x01

    await expect(
      decryptUserKeyMaterial(masterKey, { ...encrypted, ciphertext: tampered as typeof encrypted.ciphertext }),
    ).rejects.toThrow()
  })
})
