/**
 * Phase 1 go/no-go spike tooling (see PROJECT_PLAN.md § Roadmap): lets a user pick the
 * admin's shared team folder via the Google Picker (required once under drive.file scope —
 * a pasted folder URL alone grants the app no access, only an explicit Picker selection
 * does) and then prove read/write access to it. This is deliberately throwaway diagnostic
 * tooling to answer one question — does that access keep working for files *other* members
 * add later, without this user re-picking anything — not the final vault storage wiring
 * (that's GoogleDriveAdapter, still a skeleton pending the answer).
 */
import { localStore } from './chromeStore'
import { getGoogleAccessToken } from './googleAuth'

const TEAM_FOLDER_KEY = 'keyfold.spike.teamFolder'
const DRIVE_FILES_API = 'https://www.googleapis.com/drive/v3/files'

export interface TeamFolderRef {
  id: string
  name: string
}

export async function setTeamFolder(ref: TeamFolderRef): Promise<void> {
  await localStore.set(TEAM_FOLDER_KEY, ref)
}

export async function getTeamFolder(): Promise<TeamFolderRef | null> {
  return (await localStore.get<TeamFolderRef>(TEAM_FOLDER_KEY)) ?? null
}

export async function forgetTeamFolder(): Promise<void> {
  await localStore.remove(TEAM_FOLDER_KEY)
}

export interface DriveFileSummary {
  id: string
  name: string
  modifiedTime: string
}

export async function listFilesInTeamFolder(): Promise<DriveFileSummary[]> {
  const folder = await getTeamFolder()
  if (!folder) throw new Error('No shared team folder picked yet')
  const token = await getGoogleAccessToken()

  const query = encodeURIComponent(`'${folder.id}' in parents and trashed = false`)
  const res = await fetch(`${DRIVE_FILES_API}?q=${query}&fields=files(id,name,modifiedTime)`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Drive files.list failed: ${res.status} ${await res.text()}`)
  const data = (await res.json()) as { files: DriveFileSummary[] }
  return data.files
}

/** Proves write access, not just read — creates a small timestamped text file in the folder. */
export async function createTestFileInTeamFolder(): Promise<DriveFileSummary> {
  const folder = await getTeamFolder()
  if (!folder) throw new Error('No shared team folder picked yet')
  const token = await getGoogleAccessToken()

  const metadata = {
    name: `keyfold-spike-test-${new Date().toISOString()}.txt`,
    parents: [folder.id],
  }
  const boundary = crypto.randomUUID()
  const body =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    'Content-Type: text/plain\r\n\r\n' +
    'Created by the Keyfold drive.file spike — safe to delete.\r\n' +
    `--${boundary}--`

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  })
  if (!res.ok) throw new Error(`Drive file create failed: ${res.status} ${await res.text()}`)
  return (await res.json()) as DriveFileSummary
}
