/** Core domain types shared across background, popup, content script and vault page. */

/** A Uint8Array pinned to a plain ArrayBuffer — what WebCrypto's DOM types expect (TS 5.7+). */
export type Bytes = Uint8Array<ArrayBuffer>

export type VaultRole = 'owner' | 'editor' | 'viewer'

export interface KeyPair {
  publicKey: Bytes
  /** Encrypted with the user's Master Key before it is ever persisted. */
  encryptedPrivateKey: Bytes
}

export interface VaultMember {
  userId: string
  email: string
  role: VaultRole
  publicKey: Bytes
  /** Vault Key sealed (crypto_box_seal) to this member's public key. */
  sealedVaultKey: Bytes
}

export interface VaultHeader {
  vaultId: string
  name: string
  createdAt: string
  /** Signed by the owner's Ed25519 key over the canonical member list, for tamper detection. */
  memberListSignature: Bytes
  members: VaultMember[]
}

export interface EncryptedItem {
  itemId: string
  /** AES-256-GCM ciphertext; nonce is per-item and never reused. */
  nonce: Bytes
  ciphertext: Bytes
  updatedAt: string
}

export interface VaultFile {
  header: VaultHeader
  items: EncryptedItem[]
}

/** Decrypted shape of an item's plaintext payload (before encryption / after decryption). */
export interface LoginItem {
  itemId: string
  title: string
  username: string
  password: string
  url?: string
  notes?: string
  updatedAt: string
}
