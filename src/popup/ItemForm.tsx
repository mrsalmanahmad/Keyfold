import { useState } from 'react'
import type { LoginItem } from '../lib/types'
import type { NewLoginItem } from '../lib/account/accountService'
import PasswordGeneratorPanel from './PasswordGeneratorPanel'

export interface ItemFormValues {
  title: string
  username: string
  password: string
  url: string
}

function initialValuesFrom(item?: LoginItem): ItemFormValues {
  return {
    title: item?.title ?? '',
    username: item?.username ?? '',
    password: item?.password ?? '',
    url: item?.url ?? '',
  }
}

export default function ItemForm({
  item,
  onSubmit,
  onCancel,
}: {
  /** Pass an existing item to edit it in place; omit to add a new one. */
  item?: LoginItem
  onSubmit: (values: NewLoginItem) => Promise<void>
  onCancel: () => void
}) {
  const [values, setValues] = useState<ItemFormValues>(() => initialValuesFrom(item))
  const [showGenerator, setShowGenerator] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update<K extends keyof ItemFormValues>(key: K, value: ItemFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({ title: values.title, username: values.username, password: values.password, url: values.url || undefined })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="border-b border-neutral-200 dark:border-neutral-800">
      <form className="flex flex-col gap-2 p-3 text-sm" onSubmit={handleSubmit}>
        <input
          required
          placeholder="Title"
          value={values.title}
          onChange={(e) => update('title', e.target.value)}
          className="rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800"
        />
        <input
          required
          placeholder="Username"
          value={values.username}
          onChange={(e) => update('username', e.target.value)}
          className="rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800"
        />
        <div className="flex gap-2">
          <input
            required
            type="password"
            placeholder="Password"
            value={values.password}
            onChange={(e) => update('password', e.target.value)}
            className="min-w-0 flex-1 rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800"
          />
          <button
            type="button"
            onClick={() => setShowGenerator((v) => !v)}
            className="shrink-0 rounded border border-neutral-300 px-2 text-xs dark:border-neutral-700"
          >
            Generate
          </button>
        </div>
        <input
          placeholder="URL (optional)"
          value={values.url}
          onChange={(e) => update('url', e.target.value)}
          className="rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800"
        />
        {error && <p className="text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded bg-neutral-900 py-1.5 text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
          >
            {submitting ? 'Saving…' : item ? 'Save changes' : 'Save'}
          </button>
          <button type="button" onClick={onCancel} className="flex-1 rounded border border-neutral-300 py-1.5 dark:border-neutral-700">
            Cancel
          </button>
        </div>
      </form>
      {showGenerator && (
        <PasswordGeneratorPanel
          onUse={(password) => {
            update('password', password)
            setShowGenerator(false)
          }}
          onClose={() => setShowGenerator(false)}
        />
      )}
    </div>
  )
}
