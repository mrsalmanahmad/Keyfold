import type { Bytes, VaultFile, VaultHeader, VaultMember } from '../types'
import { generateAesKeyBytes } from '../crypto/aes'
import { sealVaultKey, signMemberList } from '../crypto/keys'
import { canonicalMemberListBytes } from './memberList'

export interface VaultOwner {
  userId: string
  email: string
  boxPublicKey: Bytes
  signPrivateKey: Bytes
}

/** Creates a brand-new vault: a fresh Vault Key, sealed to the owner, with a signed, single-member list. */
export async function createVault(
  name: string,
  owner: VaultOwner,
): Promise<{ vaultFile: VaultFile; vaultKey: Bytes }> {
  const vaultKey = generateAesKeyBytes()
  const sealedVaultKey = await sealVaultKey(vaultKey, owner.boxPublicKey)

  const ownerMember: VaultMember = {
    userId: owner.userId,
    email: owner.email,
    role: 'owner',
    publicKey: owner.boxPublicKey,
    sealedVaultKey,
  }
  const members = [ownerMember]
  const memberListSignature = await signMemberList(canonicalMemberListBytes(members), owner.signPrivateKey)

  const header: VaultHeader = {
    vaultId: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString(),
    memberListSignature,
    members,
  }

  return { vaultFile: { header, items: [] }, vaultKey }
}
