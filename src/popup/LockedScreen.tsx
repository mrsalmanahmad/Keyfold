import { useState } from 'react'
import { sendMessage } from './messaging'

export default function LockedScreen({ onUnlocked }: { onUnlocked: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await sendMessage({ type: 'account/unlock', masterPassword: password })
      onUnlocked()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-white p-4 text-sm text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <h1 className="text-base font-semibold">Keyfold is locked</h1>
      <form className="mt-4 flex w-full flex-col gap-3" onSubmit={handleSubmit}>
        <input
          type="password"
          autoFocus
          required
          placeholder="Master password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800"
        />
        {error && <p className="text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-neutral-900 py-1.5 text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {submitting ? 'Unlocking…' : 'Unlock'}
        </button>
      </form>
    </div>
  )
}
