import type { Bytes, VaultFile, VaultMember, VaultRole } from '../types'
import { generateAesKeyBytes } from '../crypto/aes'
import { sealVaultKey, signMemberList } from '../crypto/keys'
import { canonicalMemberListBytes } from './memberList'
import { decryptLoginItem, encryptLoginItem } from './items'

export interface NewMember {
  userId: string
  email: string
  role: VaultRole
  publicKey: Bytes
}

/** Adds a member by sealing the *current* Vault Key to their public key, then re-signs the member list. */
export async function addMember(
  vaultFile: VaultFile,
  vaultKey: Bytes,
  newMember: NewMember,
  ownerSignPrivateKey: Bytes,
): Promise<VaultFile> {
  if (vaultFile.header.members.some((m) => m.userId === newMember.userId)) {
    throw new Error(`User ${newMember.userId} is already a member of this vault`)
  }

  const sealedVaultKey = await sealVaultKey(vaultKey, newMember.publicKey)
  const members: VaultMember[] = [...vaultFile.header.members, { ...newMember, sealedVaultKey }]
  const memberListSignature = await signMemberList(canonicalMemberListBytes(members), ownerSignPrivateKey)

  return { ...vaultFile, header: { ...vaultFile.header, members, memberListSignature } }
}

/**
 * Removes a member and rotates the Vault Key: a fresh key is generated, re-sealed for
 * everyone who's left, and every item is decrypted under the old key and re-encrypted
 * under the new one. The removed member keeps whatever they already copied out of the
 * vault (the UI should prompt to rotate those passwords too), but loses the ability to
 * decrypt anything going forward — their old sealed key slot is just gone.
 */
export async function removeMemberAndRotate(
  vaultFile: VaultFile,
  oldVaultKey: Bytes,
  removeUserId: string,
  ownerSignPrivateKey: Bytes,
): Promise<{ vaultFile: VaultFile; vaultKey: Bytes }> {
  const remainingMembers = vaultFile.header.members.filter((m) => m.userId !== removeUserId)
  if (remainingMembers.length === vaultFile.header.members.length) {
    throw new Error(`User ${removeUserId} is not a member of this vault`)
  }
  if (remainingMembers.length === 0) {
    throw new Error('Cannot remove the last remaining member of a vault')
  }

  const newVaultKey = generateAesKeyBytes()
  const resealedMembers: VaultMember[] = await Promise.all(
    remainingMembers.map(async (m) => ({
      ...m,
      sealedVaultKey: await sealVaultKey(newVaultKey, m.publicKey),
    })),
  )

  const items = await Promise.all(
    vaultFile.items.map(async (encrypted) => {
      const plaintext = await decryptLoginItem(oldVaultKey, encrypted)
      return encryptLoginItem(newVaultKey, plaintext)
    }),
  )

  const memberListSignature = await signMemberList(
    canonicalMemberListBytes(resealedMembers),
    ownerSignPrivateKey,
  )

  return {
    vaultFile: {
      header: { ...vaultFile.header, members: resealedMembers, memberListSignature },
      items,
    },
    vaultKey: newVaultKey,
  }
}
