import type { Bytes } from '../types'

/** btoa/atob are available in both the service worker and test (jsdom) globals. */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

export function base64ToBytes(b64: string): Bytes {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length) as Bytes
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}
