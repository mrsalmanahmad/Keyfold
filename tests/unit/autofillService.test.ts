import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryKeyValueStore } from '../helpers/InMemoryKeyValueStore'
import { addItemToVault, openVault, setupAccount, type UnlockedAccount } from '../../src/lib/account/accountService'
import { findExistingItemForSubmission, findMatchesForOrigin } from '../../src/background/autofillService'

describe('autofillService', () => {
  let store: InMemoryKeyValueStore
  let account: UnlockedAccount
  let vaultId: string

  beforeEach(async () => {
    store = new InMemoryKeyValueStore()
    const setup = await setupAccount(store, {
      userId: 'user-1',
      email: 'owner@example.com',
      masterPassword: 'correct horse battery staple',
      defaultVaultName: 'Personal',
    })
    account = setup.account
    vaultId = setup.vaultId
    const opened = await openVault(store, vaultId, account)
    await addItemToVault(store, vaultId, opened.vaultKey, {
      title: 'GitHub',
      username: 'alice',
      password: 'p@ssw0rd',
      url: 'https://github.com/login',
    })
  })

  describe('findMatchesForOrigin', () => {
    it('matches a subdomain against the stored apex URL', async () => {
      const matches = await findMatchesForOrigin(store, account, 'https://docs.github.com')
      expect(matches).toHaveLength(1)
      expect(matches[0].username).toBe('alice')
    })

    it('returns nothing for an unrelated origin', async () => {
      const matches = await findMatchesForOrigin(store, account, 'https://gitlab.com')
      expect(matches).toHaveLength(0)
    })

    it('never includes the password', async () => {
      const matches = await findMatchesForOrigin(store, account, 'https://github.com')
      expect(matches[0]).not.toHaveProperty('password')
    })
  })

  describe('findExistingItemForSubmission', () => {
    it('finds an item with the same username and domain, flagging an unchanged password', async () => {
      const match = await findExistingItemForSubmission(store, account, {
        origin: 'https://github.com',
        username: 'alice',
        password: 'p@ssw0rd',
      })
      expect(match?.ref.vaultId).toBe(vaultId)
      expect(match?.passwordUnchanged).toBe(true)
    })

    it('flags a changed password for the same username/domain', async () => {
      const match = await findExistingItemForSubmission(store, account, {
        origin: 'https://github.com',
        username: 'alice',
        password: 'a-new-password',
      })
      expect(match?.passwordUnchanged).toBe(false)
    })

    it('finds nothing for a different username', async () => {
      const match = await findExistingItemForSubmission(store, account, {
        origin: 'https://github.com',
        username: 'bob',
        password: 'p@ssw0rd',
      })
      expect(match).toBeUndefined()
    })
  })
})
