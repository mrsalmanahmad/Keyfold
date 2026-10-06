/**
 * The persistence seam for account/vault records. Kept separate from StorageAdapter
 * (which is the pluggable *remote* backend — Drive today) because this is always local:
 * chrome.storage.local for anything that should survive a restart, chrome.storage.session
 * for secrets that must die with the browser session. See PROJECT_PLAN.md § In-browser
 * hygiene.
 */
export interface KeyValueStore {
  get<T>(key: string): Promise<T | undefined>
  set(key: string, value: unknown): Promise<void>
  remove(key: string): Promise<void>
}
