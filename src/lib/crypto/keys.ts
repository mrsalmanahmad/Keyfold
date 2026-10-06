import sodium from 'libsodium-wrappers'
import type { Bytes } from '../types'

/** X25519 keypair for sealing Vault Keys to a member, Ed25519 keypair for signing member lists. */
export interface UserKeyMaterial {
  boxPublicKey: Bytes
  boxPrivateKey: Bytes
  signPublicKey: Bytes
  signPrivateKey: Bytes
}

let ready: Promise<void> | null = null
async function ensureSodium(): Promise<typeof sodium> {
  if (!ready) ready = sodium.ready
  await ready
  return sodium
}

export async function generateUserKeyMaterial(): Promise<UserKeyMaterial> {
  const s = await ensureSodium()
  const box = s.crypto_box_keypair()
  const sign = s.crypto_sign_keypair()
  return {
    boxPublicKey: box.publicKey as Bytes,
    boxPrivateKey: box.privateKey as Bytes,
    signPublicKey: sign.publicKey as Bytes,
    signPrivateKey: sign.privateKey as Bytes,
  }
}

/** Seals a Vault Key to a member's X25519 public key (crypto_box_seal — anonymous sender). */
export async function sealVaultKey(vaultKey: Bytes, recipientPublicKey: Bytes): Promise<Bytes> {
  const s = await ensureSodium()
  return s.crypto_box_seal(vaultKey, recipientPublicKey) as Bytes
}

export async function unsealVaultKey(
  sealed: Bytes,
  recipientPublicKey: Bytes,
  recipientPrivateKey: Bytes,
): Promise<Bytes> {
  const s = await ensureSodium()
  return s.crypto_box_seal_open(sealed, recipientPublicKey, recipientPrivateKey) as Bytes
}

export async function signMemberList(
  canonicalMemberList: Bytes,
  signPrivateKey: Bytes,
): Promise<Bytes> {
  const s = await ensureSodium()
  return s.crypto_sign_detached(canonicalMemberList, signPrivateKey) as Bytes
}

export async function verifyMemberList(
  canonicalMemberList: Bytes,
  signature: Bytes,
  signPublicKey: Bytes,
): Promise<boolean> {
  const s = await ensureSodium()
  return s.crypto_sign_verify_detached(signature, canonicalMemberList, signPublicKey)
}
