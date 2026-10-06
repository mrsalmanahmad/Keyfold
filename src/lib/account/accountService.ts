import type { Bytes, LoginItem, VaultRole } from '../types'
import type { KeyValueStore } from '../storage/KeyValueStore'
import { deriveMasterKey, generateSalt } from '../crypto/argon2'
import { bytesToBase64, base64ToBytes } from '../crypto/encoding'
import { generateUserKeyMaterial, unsealVaultKey, type UserKeyMaterial } from '../crypto/keys'
import { createVault } from '../vault/createVault'
import { decryptLoginItem, encryptLoginItem } from '../vault/items'
import { verifyVaultMemberList } from '../vault/memberList'
import { decryptUserKeyMaterial, encryptUserKeyMaterial } from '../vault/userKeyStorage'
import {
  deserializeEncryptedUserKeyMaterial,
  deserializeVaultFile,
  serializeEncryptedUserKeyMaterial,
  serializeVaultFile,
  type SerializedAccountRecord,
  type SerializedVaultFile,
} from './serialize'

const ACCOUNT_KEY = 'keyfold.account'
const VAULT_IDS_KEY = 'keyfold.vaultIds'
const vaultKey = (vaultId: string) => `keyfold.vault.${vaultId}`

export class AccountAlreadyExistsError extends Error {
  constructor() {
    super('An account already exists on this device')
  }
}

export class NoAccountError extends Error {
  constructor() {
    super('No account exists on this device yet')
  }
}

export class WrongPasswordError extends Error {
  constructor() {
    super('Incorrect master password')
  }
}

export class VaultSignatureInvalidError extends Error {
  constructor(vaultId: string) {
    super(`Vault ${vaultId}'s member list signature does not match its owner's key`)
  }
}

export interface SetupAccountInput {
  userId: string
  email: string
  masterPassword: string
  defaultVaultName: string
}

export interface UnlockedAccount {
  userId: string
  email: string
  masterKey: Bytes
  userKeyMaterial: UserKeyMaterial
}

/** First run: generates the user's keypair, wraps it under a fresh Master Key, and creates a default vault. */
export async function setupAccount(
  store: KeyValueStore,
  input: SetupAccountInput,
): Promise<{ account: UnlockedAccount; vaultId: string; vaultKey: Bytes }> {
  if (await store.get(ACCOUNT_KEY)) throw new AccountAlreadyExistsError()

  const salt = generateSalt()
  const masterKey = await deriveMasterKey(input.masterPassword, salt)
  const userKeyMaterial = await generateUserKeyMaterial()
  const encryptedUserKeyMaterial = await encryptUserKeyMaterial(masterKey, userKeyMaterial)

  const record: SerializedAccountRecord = {
    userId: input.userId,
    email: input.email,
    salt: bytesToBase64(salt),
    encryptedUserKeyMaterial: serializeEncryptedUserKeyMaterial(encryptedUserKeyMaterial),
  }
  await store.set(ACCOUNT_KEY, record)

  const { vaultFile, vaultKey: newVaultKey } = await createVault(input.defaultVaultName, {
    userId: input.userId,
    email: input.email,
    boxPublicKey: userKeyMaterial.boxPublicKey,
    signPrivateKey: userKeyMaterial.signPrivateKey,
  })
  await store.set(vaultKey(vaultFile.header.vaultId), serializeVaultFile(vaultFile))
  await store.set(VAULT_IDS_KEY, [vaultFile.header.vaultId])

  return {
    account: { userId: input.userId, email: input.email, masterKey, userKeyMaterial },
    vaultId: vaultFile.header.vaultId,
    vaultKey: newVaultKey,
  }
}

export async function hasAccount(store: KeyValueStore): Promise<boolean> {
  return (await store.get(ACCOUNT_KEY)) !== undefined
}

/** Derives the Master Key from the password and decrypts the user's keypair with it. */
export async function unlockAccount(
  store: KeyValueStore,
  masterPassword: string,
): Promise<UnlockedAccount> {
  const record = await store.get<SerializedAccountRecord>(ACCOUNT_KEY)
  if (!record) throw new NoAccountError()

  const salt = base64ToBytes(record.salt)
  const masterKey = await deriveMasterKey(masterPassword, salt)

  try {
    const userKeyMaterial = await decryptUserKeyMaterial(
      masterKey,
      deserializeEncryptedUserKeyMaterial(record.encryptedUserKeyMaterial),
    )
    return { userId: record.userId, email: record.email, masterKey, userKeyMaterial }
  } catch {
    throw new WrongPasswordError()
  }
}

export interface OpenedVault {
  vaultId: string
  name: string
  role: VaultRole
  vaultKey: Bytes
}

/** Unseals this user's Vault Key and verifies the owner's signature over the member list before trusting it. */
export async function openVault(
  store: KeyValueStore,
  vaultIdToOpen: string,
  account: UnlockedAccount,
): Promise<OpenedVault> {
  const serialized = await store.get<SerializedVaultFile>(vaultKey(vaultIdToOpen))
  if (!serialized) throw new Error(`Vault ${vaultIdToOpen} not found`)
  const vaultFile = deserializeVaultFile(serialized)

  const member = vaultFile.header.members.find((m) => m.userId === account.userId)
  if (!member) throw new Error(`${account.userId} is not a member of vault ${vaultIdToOpen}`)

  const ownerMember = vaultFile.header.members.find((m) => m.role === 'owner')
  if (!ownerMember) throw new Error(`Vault ${vaultIdToOpen} has no owner`)

  // The signature only proves anything if it's checked against a sign public key the
  // client already trusts — never the one embedded in this same (Drive-editor-writable)
  // header, or an attacker could rewrite both the content and the "owner" key together.
  // Right now that trust only exists when the current user *is* the owner, since they
  // hold their own sign key from account setup. Verifying a shared vault as a non-owner
  // needs the pinned-owner-key flow from PROJECT_PLAN.md § Key verification (fingerprint
  // confirmation on invite) — not wired up yet, since real sharing is still blocked on
  // the Drive spike.
  if (ownerMember.userId !== account.userId) {
    throw new Error('Opening a shared vault as a non-owner needs a pinned owner key — not implemented yet')
  }
  const signatureValid = await verifyVaultMemberList(vaultFile.header, account.userKeyMaterial.signPublicKey)
  if (!signatureValid) throw new VaultSignatureInvalidError(vaultIdToOpen)

  const unsealedVaultKey = await unsealVaultKey(
    member.sealedVaultKey,
    account.userKeyMaterial.boxPublicKey,
    account.userKeyMaterial.boxPrivateKey,
  )

  return { vaultId: vaultIdToOpen, name: vaultFile.header.name, role: member.role, vaultKey: unsealedVaultKey }
}

export async function listVaultIds(store: KeyValueStore): Promise<string[]> {
  return (await store.get<string[]>(VAULT_IDS_KEY)) ?? []
}

export interface VaultSummary {
  vaultId: string
  name: string
  role: VaultRole
}

export async function listVaultSummaries(
  store: KeyValueStore,
  account: UnlockedAccount,
): Promise<VaultSummary[]> {
  const ids = await listVaultIds(store)
  const opened = await Promise.all(ids.map((id) => openVault(store, id, account)))
  return opened.map(({ vaultId, name, role }) => ({ vaultId, name, role }))
}

export async function listItemsInVault(
  store: KeyValueStore,
  vaultIdToList: string,
  openedVaultKey: Bytes,
): Promise<LoginItem[]> {
  const serialized = await store.get<SerializedVaultFile>(vaultKey(vaultIdToList))
  if (!serialized) throw new Error(`Vault ${vaultIdToList} not found`)
  const vaultFile = deserializeVaultFile(serialized)
  return Promise.all(vaultFile.items.map((item) => decryptLoginItem(openedVaultKey, item)))
}

export type NewLoginItem = Omit<LoginItem, 'itemId' | 'updatedAt'>

export async function addItemToVault(
  store: KeyValueStore,
  vaultIdToAddTo: string,
  openedVaultKey: Bytes,
  newItem: NewLoginItem,
): Promise<LoginItem> {
  const serialized = await store.get<SerializedVaultFile>(vaultKey(vaultIdToAddTo))
  if (!serialized) throw new Error(`Vault ${vaultIdToAddTo} not found`)
  const vaultFile = deserializeVaultFile(serialized)

  const item: LoginItem = { ...newItem, itemId: crypto.randomUUID(), updatedAt: new Date().toISOString() }
  const encrypted = await encryptLoginItem(openedVaultKey, item)
  vaultFile.items.push(encrypted)
  await store.set(vaultKey(vaultIdToAddTo), serializeVaultFile(vaultFile))

  return item
}

export async function updateItemInVault(
  store: KeyValueStore,
  vaultIdToUpdate: string,
  openedVaultKey: Bytes,
  item: LoginItem,
): Promise<void> {
  const serialized = await store.get<SerializedVaultFile>(vaultKey(vaultIdToUpdate))
  if (!serialized) throw new Error(`Vault ${vaultIdToUpdate} not found`)
  const vaultFile = deserializeVaultFile(serialized)

  const index = vaultFile.items.findIndex((i) => i.itemId === item.itemId)
  if (index === -1) throw new Error(`Item ${item.itemId} not found in vault ${vaultIdToUpdate}`)

  const updated: LoginItem = { ...item, updatedAt: new Date().toISOString() }
  vaultFile.items[index] = await encryptLoginItem(openedVaultKey, updated)
  await store.set(vaultKey(vaultIdToUpdate), serializeVaultFile(vaultFile))
}

export async function deleteItemFromVault(
  store: KeyValueStore,
  vaultIdToDeleteFrom: string,
  itemId: string,
): Promise<void> {
  const serialized = await store.get<SerializedVaultFile>(vaultKey(vaultIdToDeleteFrom))
  if (!serialized) throw new Error(`Vault ${vaultIdToDeleteFrom} not found`)
  const vaultFile = deserializeVaultFile(serialized)
  vaultFile.items = vaultFile.items.filter((i) => i.itemId !== itemId)
  await store.set(vaultKey(vaultIdToDeleteFrom), serializeVaultFile(vaultFile))
}
