import type { StorageAdapter, StorageFileRef } from './StorageAdapter'
import type { Bytes } from '../types'

const DRIVE_FILES_API = 'https://www.googleapis.com/drive/v3/files'
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files'

/**
 * drive.file scope implementation: Keyfold can only read/write files it created itself
 * or that the user explicitly selected via the Google Picker. Each vault is one file.
 *
 * STATUS: skeleton only — auth token plumbing, the Picker integration, and real
 * request bodies are the week-1 spike (see PROJECT_PLAN.md § Roadmap, go/no-go gate).
 */
export class GoogleDriveAdapter implements StorageAdapter {
  constructor(private readonly getAccessToken: () => Promise<string>) {}

  async createFile(name: string, bytes: Bytes): Promise<StorageFileRef> {
    const token = await this.getAccessToken()
    const res = await fetch(`${DRIVE_UPLOAD_API}?uploadType=media`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
      },
      body: bytes,
    })
    if (!res.ok) throw new Error(`Drive createFile failed: ${res.status}`)
    const created = (await res.json()) as { id: string }
    await fetch(`${DRIVE_FILES_API}/${created.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    return { id: created.id, name }
  }

  async pickExistingFile(): Promise<StorageFileRef | null> {
    throw new Error('Google Picker integration not implemented yet — week-1 spike')
  }

  async readFile(ref: StorageFileRef): Promise<Bytes> {
    const token = await this.getAccessToken()
    const res = await fetch(`${DRIVE_FILES_API}/${ref.id}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`Drive readFile failed: ${res.status}`)
    return new Uint8Array(await res.arrayBuffer())
  }

  async writeFile(ref: StorageFileRef, bytes: Bytes): Promise<void> {
    const token = await this.getAccessToken()
    const res = await fetch(`${DRIVE_UPLOAD_API}/${ref.id}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
      },
      body: bytes,
    })
    if (!res.ok) throw new Error(`Drive writeFile failed: ${res.status}`)
  }

  async shareWith(_ref: StorageFileRef, _email: string, _role: 'reader' | 'writer'): Promise<void> {
    throw new Error('Not implemented — depends on week-1 drive.file sharing spike')
  }

  async revokeAccess(_ref: StorageFileRef, _email: string): Promise<void> {
    throw new Error('Not implemented — depends on week-1 drive.file sharing spike')
  }
}
