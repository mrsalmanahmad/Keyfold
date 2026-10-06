import type { KeyValueStore } from '../../src/lib/storage/KeyValueStore'

/**
 * Round-trips every value through JSON, same as chrome.storage does, so a test here would
 * catch a field that was never base64-encoded before being handed to a real storage area.
 */
export class InMemoryKeyValueStore implements KeyValueStore {
  private data = new Map<string, string>()

  async get<T>(key: string): Promise<T | undefined> {
    const raw = this.data.get(key)
    return raw === undefined ? undefined : (JSON.parse(raw) as T)
  }

  async set(key: string, value: unknown): Promise<void> {
    this.data.set(key, JSON.stringify(value))
  }

  async remove(key: string): Promise<void> {
    this.data.delete(key)
  }
}
