import type { Bytes, EncryptedItem, LoginItem } from '../types'
import { decryptItem, encryptItem, importAesKey } from '../crypto/aes'

/** Binds ciphertext to its item id so a swapped-in item from elsewhere fails to decrypt. */
function itemAad(itemId: string): Bytes {
  return new TextEncoder().encode(itemId) as Bytes
}

export async function encryptLoginItem(vaultKey: Bytes, item: LoginItem): Promise<EncryptedItem> {
  const key = await importAesKey(vaultKey)
  const plaintext = new TextEncoder().encode(JSON.stringify(item)) as Bytes
  const { nonce, ciphertext } = await encryptItem(key, plaintext, itemAad(item.itemId))
  return { itemId: item.itemId, nonce, ciphertext, updatedAt: item.updatedAt }
}

export async function decryptLoginItem(vaultKey: Bytes, encrypted: EncryptedItem): Promise<LoginItem> {
  const key = await importAesKey(vaultKey)
  const plaintext = await decryptItem(
    key,
    { nonce: encrypted.nonce, ciphertext: encrypted.ciphertext },
    itemAad(encrypted.itemId),
  )
  return JSON.parse(new TextDecoder().decode(plaintext)) as LoginItem
}
