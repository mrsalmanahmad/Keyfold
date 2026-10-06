import { beforeEach, describe, expect, it } from 'vitest'
import { generateUserKeyMaterial, unsealVaultKey, type UserKeyMaterial } from '../../src/lib/crypto/keys'
import { createVault } from '../../src/lib/vault/createVault'
import { addMember, removeMemberAndRotate } from '../../src/lib/vault/membership'
import { decryptLoginItem, encryptLoginItem } from '../../src/lib/vault/items'
import { verifyVaultMemberList } from '../../src/lib/vault/memberList'
import type { Bytes, LoginItem, VaultFile } from '../../src/lib/types'

type TestUser = { userId: string; email: string } & UserKeyMaterial

async function makeUser(userId: string, email: string): Promise<TestUser> {
  const material = await generateUserKeyMaterial()
  return { userId, email, ...material }
}

const sampleItem: LoginItem = {
  itemId: 'item-1',
  title: 'Prod admin',
  username: 'ops@example.com',
  password: 'hunter2-but-encrypted',
  url: 'https://example.com',
  updatedAt: new Date().toISOString(),
}

describe('vault lifecycle', () => {
  let owner: TestUser
  let editor: TestUser
  let vaultFile: VaultFile
  let vaultKey: Bytes

  beforeEach(async () => {
    owner = await makeUser('owner-1', 'owner@example.com')
    editor = await makeUser('editor-1', 'editor@example.com')
    const created = await createVault('Prod Admin', {
      userId: owner.userId,
      email: owner.email,
      boxPublicKey: owner.boxPublicKey,
      signPrivateKey: owner.signPrivateKey,
    })
    vaultFile = created.vaultFile
    vaultKey = created.vaultKey
  })

  it('the owner can encrypt and decrypt an item with the vault key', async () => {
    const encrypted = await encryptLoginItem(vaultKey, sampleItem)
    const decrypted = await decryptLoginItem(vaultKey, encrypted)
    expect(decrypted).toEqual(sampleItem)
  })

  it('the member list signature verifies against the owner signing key', async () => {
    const ok = await verifyVaultMemberList(vaultFile.header, owner.signPublicKey)
    expect(ok).toBe(true)
  })

  it('signature verification fails if a member record is tampered with', async () => {
    const tamperedHeader = {
      ...vaultFile.header,
      members: [{ ...vaultFile.header.members[0], email: 'attacker@example.com' }],
    }
    const ok = await verifyVaultMemberList(tamperedHeader, owner.signPublicKey)
    expect(ok).toBe(false)
  })

  it('signature verification fails if a single byte of the signature is flipped', async () => {
    const flipped = new Uint8Array(vaultFile.header.memberListSignature) as Bytes
    flipped[0] ^= 0x01
    const ok = await verifyVaultMemberList(
      { ...vaultFile.header, memberListSignature: flipped },
      owner.signPublicKey,
    )
    expect(ok).toBe(false)
  })

  it('a newly added member can unseal the vault key and read existing items', async () => {
    vaultFile = await addMember(
      vaultFile,
      vaultKey,
      { userId: editor.userId, email: editor.email, role: 'editor', publicKey: editor.boxPublicKey },
      owner.signPrivateKey,
    )
    vaultFile = { ...vaultFile, items: [await encryptLoginItem(vaultKey, sampleItem)] }

    const editorEntry = vaultFile.header.members.find((m) => m.userId === editor.userId)!
    const unsealed = await unsealVaultKey(editorEntry.sealedVaultKey, editor.boxPublicKey, editor.boxPrivateKey)
    expect(unsealed).toEqual(vaultKey)

    const decrypted = await decryptLoginItem(unsealed, vaultFile.items[0])
    expect(decrypted).toEqual(sampleItem)
  })

  it('adding a member who is already a member throws', async () => {
    await expect(
      addMember(
        vaultFile,
        vaultKey,
        { userId: owner.userId, email: owner.email, role: 'editor', publicKey: owner.boxPublicKey },
        owner.signPrivateKey,
      ),
    ).rejects.toThrow()
  })

  it('removing a member rotates the key, re-encrypts items, and revokes the old key', async () => {
    vaultFile = await addMember(
      vaultFile,
      vaultKey,
      { userId: editor.userId, email: editor.email, role: 'editor', publicKey: editor.boxPublicKey },
      owner.signPrivateKey,
    )
    vaultFile = { ...vaultFile, items: [await encryptLoginItem(vaultKey, sampleItem)] }

    const oldVaultKey = vaultKey
    const rotated = await removeMemberAndRotate(vaultFile, vaultKey, editor.userId, owner.signPrivateKey)
    vaultFile = rotated.vaultFile
    vaultKey = rotated.vaultKey

    expect(vaultFile.header.members).toHaveLength(1)
    expect(vaultFile.header.members[0].userId).toBe(owner.userId)
    expect(vaultKey).not.toEqual(oldVaultKey)

    // Owner can still decrypt with the new key.
    const decrypted = await decryptLoginItem(vaultKey, vaultFile.items[0])
    expect(decrypted).toEqual(sampleItem)

    // The removed member's old vault key no longer decrypts the (now re-encrypted) item.
    await expect(decryptLoginItem(oldVaultKey, vaultFile.items[0])).rejects.toThrow()

    // And the removed member has no sealed key slot left to unseal in the first place.
    expect(vaultFile.header.members.some((m) => m.userId === editor.userId)).toBe(false)

    const ok = await verifyVaultMemberList(vaultFile.header, owner.signPublicKey)
    expect(ok).toBe(true)
  })

  it('removing the last member throws rather than producing an orphaned vault', async () => {
    await expect(
      removeMemberAndRotate(vaultFile, vaultKey, owner.userId, owner.signPrivateKey),
    ).rejects.toThrow()
  })

  it('removing a user who is not a member throws', async () => {
    await expect(
      removeMemberAndRotate(vaultFile, vaultKey, 'not-a-member', owner.signPrivateKey),
    ).rejects.toThrow()
  })
})
