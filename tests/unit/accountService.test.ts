import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryKeyValueStore } from '../helpers/InMemoryKeyValueStore'
import {
  AccountAlreadyExistsError,
  NoAccountError,
  VaultSignatureInvalidError,
  WrongPasswordError,
  addItemToVault,
  deleteItemFromVault,
  hasAccount,
  listItemsInVault,
  openVault,
  setupAccount,
  unlockAccount,
  updateItemInVault,
  type UnlockedAccount,
} from '../../src/lib/account/accountService'
import type { SerializedVaultFile } from '../../src/lib/account/serialize'

const MASTER_PASSWORD = 'correct horse battery staple'

async function setUpFreshAccount(store: InMemoryKeyValueStore) {
  return setupAccount(store, {
    userId: 'user-1',
    email: 'owner@example.com',
    masterPassword: MASTER_PASSWORD,
    defaultVaultName: 'Personal',
  })
}

describe('accountService', () => {
  let store: InMemoryKeyValueStore

  beforeEach(() => {
    store = new InMemoryKeyValueStore()
  })

  it('reports no account before setup and an account after', async () => {
    expect(await hasAccount(store)).toBe(false)
    await setUpFreshAccount(store)
    expect(await hasAccount(store)).toBe(true)
  })

  it('refuses to set up a second account on the same device', async () => {
    await setUpFreshAccount(store)
    await expect(setUpFreshAccount(store)).rejects.toBeInstanceOf(AccountAlreadyExistsError)
  })

  it('unlocking with no account throws NoAccountError', async () => {
    await expect(unlockAccount(store, MASTER_PASSWORD)).rejects.toBeInstanceOf(NoAccountError)
  })

  it('unlocks with the correct password and rejects the wrong one', async () => {
    await setUpFreshAccount(store)
    const unlocked = await unlockAccount(store, MASTER_PASSWORD)
    expect(unlocked.userId).toBe('user-1')

    await expect(unlockAccount(store, 'definitely wrong')).rejects.toBeInstanceOf(WrongPasswordError)
  })

  it('round-trips an item through add, list, update, and delete', async () => {
    const setup = await setUpFreshAccount(store)
    const opened = await openVault(store, setup.vaultId, setup.account)
    expect(opened.role).toBe('owner')

    const added = await addItemToVault(store, setup.vaultId, opened.vaultKey, {
      title: 'Example',
      username: 'alice',
      password: 'p@ssw0rd',
      url: 'https://example.com',
    })

    let items = await listItemsInVault(store, setup.vaultId, opened.vaultKey)
    expect(items).toEqual([added])

    await updateItemInVault(store, setup.vaultId, opened.vaultKey, { ...added, password: 'new-password' })
    items = await listItemsInVault(store, setup.vaultId, opened.vaultKey)
    expect(items[0].password).toBe('new-password')
    expect(items[0].updatedAt).not.toBe(added.updatedAt)

    await deleteItemFromVault(store, setup.vaultId, added.itemId)
    items = await listItemsInVault(store, setup.vaultId, opened.vaultKey)
    expect(items).toHaveLength(0)
  })

  it('persists across a fresh unlock (items survive a "restart")', async () => {
    const setup = await setUpFreshAccount(store)
    const opened = await openVault(store, setup.vaultId, setup.account)
    await addItemToVault(store, setup.vaultId, opened.vaultKey, {
      title: 'Survives restart',
      username: 'bob',
      password: 'hunter2',
    })

    // Simulate the service worker restarting: re-derive everything from scratch.
    const reloadedAccount: UnlockedAccount = await unlockAccount(store, MASTER_PASSWORD)
    const reopened = await openVault(store, setup.vaultId, reloadedAccount)
    const items = await listItemsInVault(store, setup.vaultId, reopened.vaultKey)
    expect(items).toHaveLength(1)
    expect(items[0].title).toBe('Survives restart')
  })

  it('refuses to open a vault whose member list has been tampered with', async () => {
    const setup = await setUpFreshAccount(store)

    const key = `keyfold.vault.${setup.vaultId}`
    const serialized = (await store.get<SerializedVaultFile>(key))!
    await store.set(key, {
      ...serialized,
      header: {
        ...serialized.header,
        members: [{ ...serialized.header.members[0], email: 'attacker@example.com' }],
      },
    })

    await expect(openVault(store, setup.vaultId, setup.account)).rejects.toBeInstanceOf(
      VaultSignatureInvalidError,
    )
  })
})
