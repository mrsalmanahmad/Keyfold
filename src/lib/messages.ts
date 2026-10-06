/** Message contract between popup/content/vault and the background service worker. */

export type KeyfoldMessage =
  | { type: 'auth/sign-in' }
  | { type: 'auth/sign-out' }
  | { type: 'vault/unlock'; masterPassword: string }
  | { type: 'vault/lock' }
  | { type: 'vault/status' }

export type KeyfoldResponse = { ok: true; data?: unknown } | { ok: false; error: string }
