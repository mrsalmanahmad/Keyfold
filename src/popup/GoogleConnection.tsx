import { useEffect, useState } from 'react'
import type { GoogleStatus } from '../lib/messages'
import { sendMessage } from './messaging'

type Status = GoogleStatus | 'loading'

export default function GoogleConnection() {
  const [status, setStatus] = useState<Status>('loading')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void sendMessage<GoogleStatus>({ type: 'google/status' })
      .then(setStatus)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }, [])

  async function handleConnect() {
    setBusy(true)
    setError(null)
    try {
      const next = await sendMessage<GoogleStatus>({ type: 'google/sign-in' })
      setStatus(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleDisconnect() {
    setBusy(true)
    setError(null)
    try {
      await sendMessage({ type: 'google/sign-out' })
      setStatus({ connected: false })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  if (status === 'loading') return null

  return (
    <div className="flex flex-col gap-1 text-xs">
      {status.connected ? (
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-neutral-500" title={status.email}>
            Google: {status.email}
          </span>
          <button onClick={() => void handleDisconnect()} disabled={busy} className="shrink-0 text-neutral-500 underline disabled:opacity-50">
            Disconnect
          </button>
        </div>
      ) : (
        <button onClick={() => void handleConnect()} disabled={busy} className="text-left text-neutral-500 underline disabled:opacity-50">
          {busy ? 'Connecting…' : 'Connect Google Drive'}
        </button>
      )}
      {error && <p className="text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
