import type { Bytes } from '../types'
import type { UserKeyMaterial } from '../crypto/keys'
import { decryptItem, encryptItem, importAesKey } from '../crypto/aes'
import { base64ToBytes, bytesToBase64 } from '../crypto/encoding'

/**
 * What actually gets written to the user's Drive folder: public keys in the clear,
 * private keys only ever as ciphertext under the Master Key (see PROJECT_PLAN.md
 * § Key hierarchy, step 2). Never construct this by hand — go through
 * encryptUserKeyMaterial so the private keys can't accidentally end up in the clear.
 */
export interface EncryptedUserKeyMaterial {
  boxPublicKey: Bytes
  signPublicKey: Bytes
  nonce: Bytes
  ciphertext: Bytes
}

const EMPTY_AAD = new Uint8Array(0) as Bytes

export async function encryptUserKeyMaterial(
  masterKey: Bytes,
  material: UserKeyMaterial,
): Promise<EncryptedUserKeyMaterial> {
  const key = await importAesKey(masterKey)
  const plaintext = new TextEncoder().encode(
    JSON.stringify({
      boxPrivateKey: bytesToBase64(material.boxPrivateKey),
      signPrivateKey: bytesToBase64(material.signPrivateKey),
    }),
  ) as Bytes
  const { nonce, ciphertext } = await encryptItem(key, plaintext, EMPTY_AAD)
  return {
    boxPublicKey: material.boxPublicKey,
    signPublicKey: material.signPublicKey,
    nonce,
    ciphertext,
  }
}

export async function decryptUserKeyMaterial(
  masterKey: Bytes,
  encrypted: EncryptedUserKeyMaterial,
): Promise<UserKeyMaterial> {
  const key = await importAesKey(masterKey)
  const plaintext = await decryptItem(
    key,
    { nonce: encrypted.nonce, ciphertext: encrypted.ciphertext },
    EMPTY_AAD,
  )
  const parsed = JSON.parse(new TextDecoder().decode(plaintext)) as {
    boxPrivateKey: string
    signPrivateKey: string
  }
  return {
    boxPublicKey: encrypted.boxPublicKey,
    boxPrivateKey: base64ToBytes(parsed.boxPrivateKey),
    signPublicKey: encrypted.signPublicKey,
    signPrivateKey: base64ToBytes(parsed.signPrivateKey),
  }
}
