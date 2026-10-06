import type { Bytes } from '../types'

/**
 * Storage is accessed only through this interface so Drive can be swapped for
 * OneDrive/Dropbox later (see PROJECT_PLAN.md § Non-goals for v1). Every method
 * deals in opaque encrypted bytes — the adapter never sees plaintext.
 */
export interface StorageFileRef {
  id: string
  name: string
}

export interface StorageAdapter {
  /** Creates a new file in app-owned storage (drive.file scope: only files we create or the user picks). */
  createFile(name: string, bytes: Bytes): Promise<StorageFileRef>

  /** Opens an existing file the user has explicitly picked (required once per shared vault under drive.file). */
  pickExistingFile(): Promise<StorageFileRef | null>

  readFile(ref: StorageFileRef): Promise<Bytes>

  writeFile(ref: StorageFileRef, bytes: Bytes): Promise<void>

  /** Shares the underlying file/folder with another account (file-level access only — not decrypt access). */
  shareWith(ref: StorageFileRef, email: string, role: 'reader' | 'writer'): Promise<void>

  revokeAccess(ref: StorageFileRef, email: string): Promise<void>
}
