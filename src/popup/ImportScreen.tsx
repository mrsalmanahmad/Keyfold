import { useState } from 'react'
import type { ImportedItem, ImportSource } from '../lib/import/types'
import { detectImportSource, parseImportCsv } from '../lib/import/parseImportCsv'
import { sendMessage } from './messaging'

const SOURCE_LABELS: Record<ImportSource, string> = {
  lastpass: 'LastPass',
  bitwarden: 'Bitwarden',
  chrome: 'Chrome',
}

export default function ImportScreen({
  vaultId,
  onDone,
  onCancel,
}: {
  vaultId: string
  onDone: () => void
  onCancel: () => void
}) {
  const [csvText, setCsvText] = useState<string | null>(null)
  const [source, setSource] = useState<ImportSource>('chrome')
  const [items, setItems] = useState<ImportedItem[]>([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reparse(text: string, src: ImportSource) {
    try {
      setItems(parseImportCsv(src, text))
      setError(null)
    } catch (err) {
      setItems([])
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const text = await file.text()
    setCsvText(text)
    const detected = detectImportSource(text) ?? 'chrome'
    setSource(detected)
    reparse(text, detected)
  }

  function handleSourceChange(next: ImportSource) {
    setSource(next)
    if (csvText) reparse(csvText, next)
  }

  async function handleImport() {
    setImporting(true)
    setError(null)
    try {
      await sendMessage<{ imported: number }>({
        type: 'item/import',
        vaultId,
        items: items.map(({ title, username, password, url }) => ({ title, username, password, url })),
      })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setImporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 border-b border-neutral-200 p-3 text-sm dark:border-neutral-800">
      <div>
        <h2 className="font-semibold">Import logins</h2>
        <p className="text-neutral-500">Export a CSV from your current password manager, then pick it here.</p>
      </div>

      <label className="flex flex-col gap-1">
        <span>Source</span>
        <select
          value={source}
          onChange={(e) => handleSourceChange(e.target.value as ImportSource)}
          className="rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800"
        >
          {(Object.keys(SOURCE_LABELS) as ImportSource[]).map((s) => (
            <option key={s} value={s}>
              {SOURCE_LABELS[s]}
            </option>
          ))}
        </select>
      </label>

      <input type="file" accept=".csv,text/csv" onChange={(e) => void handleFileChange(e)} />

      {fileName && (
        <p className="text-neutral-500">
          {items.length > 0
            ? `Found ${items.length} login${items.length === 1 ? '' : 's'} in ${fileName}.`
            : `No importable logins found in ${fileName}.`}
        </p>
      )}

      {items.length > 0 && (
        <ul className="max-h-24 overflow-y-auto rounded border border-neutral-200 text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
          {items.slice(0, 5).map((item, i) => (
            <li key={i} className="truncate px-2 py-1">
              {item.title} — {item.username}
            </li>
          ))}
          {items.length > 5 && <li className="px-2 py-1 text-neutral-400">…and {items.length - 5} more</li>}
        </ul>
      )}

      {error && <p className="text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={() => void handleImport()}
          disabled={items.length === 0 || importing}
          className="flex-1 rounded bg-neutral-900 py-1.5 text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {importing ? 'Importing…' : `Import ${items.length || ''}`.trim()}
        </button>
        <button onClick={onCancel} className="flex-1 rounded border border-neutral-300 py-1.5 dark:border-neutral-700">
          Cancel
        </button>
      </div>
    </div>
  )
}
