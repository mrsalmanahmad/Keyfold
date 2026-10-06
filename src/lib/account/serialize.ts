import type { EncryptedItem, VaultFile, VaultHeader, VaultMember, VaultRole } from '../types'
import type { EncryptedUserKeyMaterial } from '../vault/userKeyStorage'
import { base64ToBytes, bytesToBase64 } from '../crypto/encoding'

/**
 * chrome.storage values are JSON — Uint8Arrays don't round-trip through that, so every
 * binary field gets base64-encoded before it's persisted and decoded on the way back out.
 */

export interface SerializedEncryptedItem {
  itemId: string
  nonce: string
  ciphertext: string
  updatedAt: string
}

export interface SerializedVaultMember {
  userId: string
  email: string
  role: VaultRole
  publicKey: string
  sealedVaultKey: string
}

export interface SerializedVaultHeader {
  vaultId: string
  name: string
  createdAt: string
  memberListSignature: string
  members: SerializedVaultMember[]
}

export interface SerializedVaultFile {
  header: SerializedVaultHeader
  items: SerializedEncryptedItem[]
}

export interface SerializedEncryptedUserKeyMaterial {
  boxPublicKey: string
  signPublicKey: string
  nonce: string
  ciphertext: string
}

export interface SerializedAccountRecord {
  userId: string
  email: string
  salt: string
  encryptedUserKeyMaterial: SerializedEncryptedUserKeyMaterial
}

function serializeMember(m: VaultMember): SerializedVaultMember {
  return {
    userId: m.userId,
    email: m.email,
    role: m.role,
    publicKey: bytesToBase64(m.publicKey),
    sealedVaultKey: bytesToBase64(m.sealedVaultKey),
  }
}

function deserializeMember(m: SerializedVaultMember): VaultMember {
  return {
    userId: m.userId,
    email: m.email,
    role: m.role,
    publicKey: base64ToBytes(m.publicKey),
    sealedVaultKey: base64ToBytes(m.sealedVaultKey),
  }
}

function serializeHeader(h: VaultHeader): SerializedVaultHeader {
  return {
    vaultId: h.vaultId,
    name: h.name,
    createdAt: h.createdAt,
    memberListSignature: bytesToBase64(h.memberListSignature),
    members: h.members.map(serializeMember),
  }
}

function deserializeHeader(h: SerializedVaultHeader): VaultHeader {
  return {
    vaultId: h.vaultId,
    name: h.name,
    createdAt: h.createdAt,
    memberListSignature: base64ToBytes(h.memberListSignature),
    members: h.members.map(deserializeMember),
  }
}

function serializeEncryptedItem(i: EncryptedItem): SerializedEncryptedItem {
  return {
    itemId: i.itemId,
    nonce: bytesToBase64(i.nonce),
    ciphertext: bytesToBase64(i.ciphertext),
    updatedAt: i.updatedAt,
  }
}

function deserializeEncryptedItem(i: SerializedEncryptedItem): EncryptedItem {
  return {
    itemId: i.itemId,
    nonce: base64ToBytes(i.nonce),
    ciphertext: base64ToBytes(i.ciphertext),
    updatedAt: i.updatedAt,
  }
}

export function serializeVaultFile(v: VaultFile): SerializedVaultFile {
  return { header: serializeHeader(v.header), items: v.items.map(serializeEncryptedItem) }
}

export function deserializeVaultFile(v: SerializedVaultFile): VaultFile {
  return { header: deserializeHeader(v.header), items: v.items.map(deserializeEncryptedItem) }
}

export function serializeEncryptedUserKeyMaterial(
  m: EncryptedUserKeyMaterial,
): SerializedEncryptedUserKeyMaterial {
  return {
    boxPublicKey: bytesToBase64(m.boxPublicKey),
    signPublicKey: bytesToBase64(m.signPublicKey),
    nonce: bytesToBase64(m.nonce),
    ciphertext: bytesToBase64(m.ciphertext),
  }
}

export function deserializeEncryptedUserKeyMaterial(
  m: SerializedEncryptedUserKeyMaterial,
): EncryptedUserKeyMaterial {
  return {
    boxPublicKey: base64ToBytes(m.boxPublicKey),
    signPublicKey: base64ToBytes(m.signPublicKey),
    nonce: base64ToBytes(m.nonce),
    ciphertext: base64ToBytes(m.ciphertext),
  }
}
