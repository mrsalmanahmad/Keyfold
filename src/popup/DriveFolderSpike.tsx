import { useEffect, useState } from 'react'
import { pickDriveFolder } from '../lib/drivePicker'
import { sendMessage } from './messaging'

interface TeamFolder {
  id: string
  name: string
}

interface DriveFileSummary {
  id: string
  name: string
  modifiedTime: string
}

/**
 * Phase 1 go/no-go spike tooling, not a finished feature — see PROJECT_PLAN.md § Roadmap
 * and src/background/driveFolderSpike.ts. Lets you pick the shared team folder via Google's
 * Picker (required under drive.file scope — a pasted folder URL alone grants no access) and
 * then prove read/write access to it, so the actual open question — does that access keep
 * working for files *other* members add later, without re-picking — can be tested by hand
 * with a second Google account.
 */
export default function DriveFolderSpike() {
  const [folder, setFolder] = useState<TeamFolder | null>(null)
  const [files, setFiles] = useState<DriveFileSummary[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void sendMessage<TeamFolder | null>({ type: 'drive-spike/get-team-folder' }).then(setFolder)
  }, [])

  async function handlePick() {
    setBusy(true)
    setError(null)
    try {
      const token = await sendMessage<string>({ type: 'google/access-token' })
      const picked = await pickDriveFolder(token)
      if (picked) {
        await sendMessage({ type: 'drive-spike/set-team-folder', folder: picked })
        setFolder(picked)
        setFiles(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleForget() {
    await sendMessage({ type: 'drive-spike/forget-team-folder' })
    setFolder(null)
    setFiles(null)
  }

  async function handleList() {
    setBusy(true)
    setError(null)
    try {
      setFiles(await sendMessage<DriveFileSummary[]>({ type: 'drive-spike/list-team-folder-files' }))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateTestFile() {
    setBusy(true)
    setError(null)
    try {
      await sendMessage({ type: 'drive-spike/create-test-file' })
      await handleList()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-1 text-xs">
      <span className="font-medium text-neutral-400">Shared folder (spike)</span>
      {!folder && (
        <button onClick={() => void handlePick()} disabled={busy} className="text-left text-neutral-500 underline disabled:opacity-50">
          Pick shared folder
        </button>
      )}
      {folder && (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-neutral-500" title={folder.name}>
              {folder.name}
            </span>
            <button onClick={() => void handleForget()} className="shrink-0 text-neutral-500 underline">
              Forget
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => void handleList()} disabled={busy} className="text-neutral-500 underline disabled:opacity-50">
              List files
            </button>
            <button onClick={() => void handleCreateTestFile()} disabled={busy} className="text-neutral-500 underline disabled:opacity-50">
              Create test file
            </button>
          </div>
          {files && (
            <ul className="max-h-24 overflow-y-auto text-neutral-500">
              {files.length === 0 && <li>No files in this folder.</li>}
              {files.map((f) => (
                <li key={f.id} className="truncate">
                  {f.name}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {error && <p className="text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
