import { useEffect, useMemo, useState } from 'react'
import type { LoginItem } from '../lib/types'
import type { NewLoginItem, VaultSummary } from '../lib/account/accountService'
import { exportItemsToCsv } from '../lib/import/exportCsv'
import { sendMessage } from '../popup/messaging'
import { copyWithAutoClear } from '../popup/clipboard'
import GoogleConnection from '../popup/GoogleConnection'
import DriveFolderSpike from '../popup/DriveFolderSpike'
import ItemForm from '../popup/ItemForm'
import ImportScreen from '../popup/ImportScreen'

type FormState = { mode: 'add' } | { mode: 'edit'; item: LoginItem } | { mode: 'import' } | null

function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function VaultPage({ onLocked }: { onLocked: () => void }) {
  const [vaults, setVaults] = useState<VaultSummary[]>([])
  const [activeVaultId, setActiveVaultId] = useState<string | null>(null)
  const [items, setItems] = useState<LoginItem[]>([])
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<FormState>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const activeVault = vaults.find((v) => v.vaultId === activeVaultId) ?? null

  async function refreshItems(vaultId: string) {
    const list = await sendMessage<LoginItem[]>({ type: 'item/list', vaultId })
    setItems(list)
    setSelected(new Set())
  }

  useEffect(() => {
    void (async () => {
      try {
        const list = await sendMessage<VaultSummary[]>({ type: 'vault/list' })
        setVaults(list)
        const first = list[0] ?? null
        setActiveVaultId(first?.vaultId ?? null)
        if (first) await refreshItems(first.vaultId)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      }
    })()
  }, [])

  async function handleSelectVault(vaultId: string) {
    setActiveVaultId(vaultId)
    setForm(null)
    setQuery('')
    try {
      await refreshItems(vaultId)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (item) => item.title.toLowerCase().includes(q) || item.username.toLowerCase().includes(q),
    )
  }, [items, query])

  async function handleAdd(item: NewLoginItem) {
    if (!activeVaultId) return
    await sendMessage({ type: 'item/add', vaultId: activeVaultId, item })
    await refreshItems(activeVaultId)
    setForm(null)
  }

  async function handleUpdate(existing: LoginItem, values: NewLoginItem) {
    if (!activeVaultId) return
    await sendMessage({ type: 'item/update', vaultId: activeVaultId, item: { ...existing, ...values } })
    await refreshItems(activeVaultId)
    setForm(null)
  }

  async function handleDelete(itemId: string) {
    if (!activeVaultId) return
    await sendMessage({ type: 'item/delete', vaultId: activeVaultId, itemId })
    await refreshItems(activeVaultId)
  }

  async function handleDeleteSelected() {
    if (!activeVaultId || selected.size === 0) return
    const count = selected.size
    if (!window.confirm(`Delete ${count} selected login${count === 1 ? '' : 's'}? This can't be undone.`)) return
    await Promise.all(
      [...selected].map((itemId) => sendMessage({ type: 'item/delete', vaultId: activeVaultId, itemId })),
    )
    await refreshItems(activeVaultId)
  }

  function toggleSelected(itemId: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  function toggleSelectAll() {
    setSelected((current) => (current.size === filtered.length ? new Set() : new Set(filtered.map((i) => i.itemId))))
  }

  async function handleCopy(item: LoginItem) {
    await copyWithAutoClear(item.password)
    setCopiedItemId(item.itemId)
    setTimeout(() => setCopiedItemId((current) => (current === item.itemId ? null : current)), 2000)
  }

  function handleExport() {
    if (!activeVault || items.length === 0) return
    const safeName = activeVault.name.replace(/[^a-z0-9-]+/gi, '_').toLowerCase()
    downloadCsv(`keyfold-${safeName || 'vault'}.csv`, exportItemsToCsv(items))
  }

  async function handleLock() {
    await sendMessage({ type: 'account/lock' })
    onLocked()
  }

  return (
    <div className="flex h-screen w-full bg-white text-sm text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <aside className="flex w-56 shrink-0 flex-col border-r border-neutral-200 dark:border-neutral-800">
        <div className="border-b border-neutral-200 p-4 font-semibold dark:border-neutral-800">Keyfold</div>
        <nav className="flex-1 overflow-y-auto p-2">
          {vaults.map((v) => (
            <button
              key={v.vaultId}
              onClick={() => void handleSelectVault(v.vaultId)}
              className={`block w-full truncate rounded px-2 py-1.5 text-left ${
                v.vaultId === activeVaultId
                  ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                  : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              {v.name}
            </button>
          ))}
        </nav>
        <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
          <GoogleConnection />
        </div>
        <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
          <DriveFolderSpike />
        </div>
        <button onClick={() => void handleLock()} className="border-t border-neutral-200 p-3 text-left text-neutral-500 dark:border-neutral-800">
          Lock
        </button>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-neutral-200 p-3 dark:border-neutral-800">
          <input
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-72 max-w-full rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800"
          />
          <div className="ml-auto flex gap-2">
            {selected.size > 0 && (
              <button onClick={() => void handleDeleteSelected()} className="rounded border border-red-300 px-3 py-1.5 text-red-600 dark:border-red-900 dark:text-red-400">
                Delete {selected.size} selected
              </button>
            )}
            <button
              onClick={handleExport}
              disabled={items.length === 0}
              className="rounded border border-neutral-300 px-3 py-1.5 disabled:opacity-50 dark:border-neutral-700"
            >
              Export CSV
            </button>
            <button onClick={() => setForm({ mode: 'import' })} className="rounded border border-neutral-300 px-3 py-1.5 dark:border-neutral-700">
              Import
            </button>
            <button
              onClick={() => setForm({ mode: 'add' })}
              className="rounded bg-neutral-900 px-3 py-1.5 text-white dark:bg-neutral-100 dark:text-neutral-900"
            >
              + Add login
            </button>
          </div>
        </div>

        {error && <p className="px-3 pt-3 text-red-600 dark:text-red-400">{error}</p>}

        {form?.mode === 'add' && (
          <div className="mx-3 mt-3 max-w-md">
            <ItemForm onSubmit={handleAdd} onCancel={() => setForm(null)} />
          </div>
        )}
        {form?.mode === 'edit' && (
          <div className="mx-3 mt-3 max-w-md">
            <ItemForm item={form.item} onSubmit={(values) => handleUpdate(form.item, values)} onCancel={() => setForm(null)} />
          </div>
        )}
        {form?.mode === 'import' && activeVaultId && (
          <div className="mx-3 mt-3 max-w-md">
            <ImportScreen
              vaultId={activeVaultId}
              onDone={() => {
                setForm(null)
                if (activeVaultId) void refreshItems(activeVaultId)
              }}
              onCancel={() => setForm(null)}
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3">
          {!activeVaultId && <p className="text-center text-neutral-400">No vault available.</p>}
          {activeVaultId && filtered.length === 0 && (
            <p className="text-center text-neutral-400">{items.length === 0 ? 'No logins yet.' : 'No matches.'}</p>
          )}
          {activeVaultId && filtered.length > 0 && (
            <table className="w-full table-fixed border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800">
                  <th className="w-8 py-2">
                    <input
                      type="checkbox"
                      checked={selected.size === filtered.length}
                      onChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="py-2 font-medium">Title</th>
                  <th className="py-2 font-medium">Username</th>
                  <th className="w-48 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.itemId} className="border-b border-neutral-100 dark:border-neutral-800">
                    <td className="py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(item.itemId)}
                        onChange={() => toggleSelected(item.itemId)}
                        aria-label={`Select ${item.title}`}
                      />
                    </td>
                    <td className="truncate py-2 font-medium">{item.title}</td>
                    <td className="truncate py-2 text-neutral-500">{item.username}</td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        <button onClick={() => void handleCopy(item)} className="text-xs text-neutral-500 underline">
                          {copiedItemId === item.itemId ? 'Copied' : 'Copy'}
                        </button>
                        <button onClick={() => setForm({ mode: 'edit', item })} className="text-xs text-neutral-500 underline">
                          Edit
                        </button>
                        <button onClick={() => void handleDelete(item.itemId)} className="text-xs text-red-500 underline">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}
