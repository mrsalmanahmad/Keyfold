import type { Bytes, VaultHeader, VaultMember } from '../types'
import { bytesToBase64 } from '../crypto/encoding'
import { verifyMemberList } from '../crypto/keys'

/**
 * The owner signs this canonical encoding, not the raw member array, so re-ordering or
 * re-serializing the list can't change what was actually signed. Sealed vault keys are
 * deliberately excluded — they rotate on membership changes but don't need to be covered
 * by a signature that is itself about *who the members are*.
 */
interface CanonicalMember {
  userId: string
  email: string
  role: VaultMember['role']
  publicKey: string
}

export function canonicalMemberListBytes(members: VaultMember[]): Bytes {
  const canonical: CanonicalMember[] = members
    .map((m) => ({
      userId: m.userId,
      email: m.email,
      role: m.role,
      publicKey: bytesToBase64(m.publicKey),
    }))
    .sort((a, b) => a.userId.localeCompare(b.userId))
  return new TextEncoder().encode(JSON.stringify(canonical)) as Bytes
}

/**
 * True only if `ownerSignPublicKey` actually signed exactly this member list — catches a
 * Drive editor swapping in a different public key for a member (see PROJECT_PLAN.md
 * § Key verification). Callers still need to confirm `ownerSignPublicKey` itself via the
 * out-of-band fingerprint; this alone proves consistency, not who the owner is.
 */
export async function verifyVaultMemberList(
  header: Pick<VaultHeader, 'members' | 'memberListSignature'>,
  ownerSignPublicKey: Bytes,
): Promise<boolean> {
  return verifyMemberList(
    canonicalMemberListBytes(header.members),
    header.memberListSignature,
    ownerSignPublicKey,
  )
}
