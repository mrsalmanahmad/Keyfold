import type { KeyValueStore } from '../lib/storage/KeyValueStore'

/** Thin adapter over a chrome.storage area — the only place in the codebase that touches it directly. */
export class ChromeStorageStore implements KeyValueStore {
  constructor(private readonly area: chrome.storage.StorageArea) {}

  async get<T>(key: string): Promise<T | undefined> {
    const result = await this.area.get(key)
    return result[key] as T | undefined
  }

  async set(key: string, value: unknown): Promise<void> {
    await this.area.set({ [key]: value })
  }

  async remove(key: string): Promise<void> {
    await this.area.remove(key)
  }
}

/** Persists across restarts — the encrypted account record and vault files. */
export const localStore = new ChromeStorageStore(chrome.storage.local)

/** Cleared when the browser session ends — only ever holds secrets while unlocked. */
export const sessionStore = new ChromeStorageStore(chrome.storage.session)
