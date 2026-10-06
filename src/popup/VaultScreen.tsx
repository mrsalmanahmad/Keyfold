import { useEffect, useMemo, useState } from 'react'
import type { LoginItem } from '../lib/types'
import type { NewLoginItem, VaultSummary } from '../lib/account/accountService'
import { sendMessage } from './messaging'
import { copyWithAutoClear } from './clipboard'
import ItemForm from './ItemForm'
import ImportScreen from './ImportScreen'

type FormState = { mode: 'add' } | { mode: 'edit'; item: LoginItem } | { mode: 'import' } | null

export default function VaultScreen({ onLocked }: { onLocked: () => void }) {
  const [vault, setVault] = useState<VaultSummary | null>(null)
  const [items, setItems] = useState<LoginItem[]>([])
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<FormState>(null)
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function refreshItems(vaultId: string) {
    const list = await sendMessage<LoginItem[]>({ type: 'item/list', vaultId })
    setItems(list)
  }

  useEffect(() => {
    void (async () => {
      try {
        const vaults = await sendMessage<VaultSummary[]>({ type: 'vault/list' })
        const first = vaults[0] ?? null
        setVault(first)
        if (first) await refreshItems(first.vaultId)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      }
    })()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (item) => item.title.toLowerCase().includes(q) || item.username.toLowerCase().includes(q),
    )
  }, [items, query])

  async function handleAdd(item: NewLoginItem) {
    if (!vault) return
    await sendMessage({ type: 'item/add', vaultId: vault.vaultId, item })
    await refreshItems(vault.vaultId)
    setForm(null)
  }

  async function handleUpdate(existing: LoginItem, values: NewLoginItem) {
    if (!vault) return
    await sendMessage({ type: 'item/update', vaultId: vault.vaultId, item: { ...existing, ...values } })
    await refreshItems(vault.vaultId)
    setForm(null)
  }

  async function handleDelete(itemId: string) {
    if (!vault) return
    await sendMessage({ type: 'item/delete', vaultId: vault.vaultId, itemId })
    await refreshItems(vault.vaultId)
  }

  async function handleCopy(item: LoginItem) {
    await copyWithAutoClear(item.password)
    setCopiedItemId(item.itemId)
    setTimeout(() => setCopiedItemId((current) => (current === item.itemId ? null : current)), 2000)
  }

  async function handleLock() {
    await sendMessage({ type: 'account/lock' })
    onLocked()
  }

  function handleOpenFullVault() {
    void chrome.tabs.create({ url: chrome.runtime.getURL('src/vault/index.html') })
  }

  return (
    <div className="flex h-full w-full flex-col bg-white text-sm text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <div className="flex items-center justify-between border-b border-neutral-200 p-3 dark:border-neutral-800">
        <span className="font-semibold">{vault?.name ?? 'Keyfold'}</span>
        <div className="flex items-center gap-3">
          <button onClick={handleOpenFullVault} className="text-xs text-neutral-500 underline">
            Open full vault
          </button>
          <button onClick={handleLock} className="text-xs text-neutral-500 underline">
            Lock
          </button>
        </div>
      </div>

      <div className="p-3">
        <input
          placeholder="Search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800"
        />
      </div>

      {error && <p className="px-3 text-red-600 dark:text-red-400">{error}</p>}

      {form?.mode === 'add' && <ItemForm onSubmit={handleAdd} onCancel={() => setForm(null)} />}
      {form?.mode === 'edit' && (
        <ItemForm item={form.item} onSubmit={(values) => handleUpdate(form.item, values)} onCancel={() => setForm(null)} />
      )}
      {form?.mode === 'import' && vault && (
        <ImportScreen
          vaultId={vault.vaultId}
          onDone={() => {
            setForm(null)
            void refreshItems(vault.vaultId)
          }}
          onCancel={() => setForm(null)}
        />
      )}
      {!form && (
        <div className="mx-3 mb-2 flex gap-2">
          <button
            onClick={() => setForm({ mode: 'add' })}
            className="flex-1 rounded border border-dashed border-neutral-300 py-1.5 text-neutral-500 dark:border-neutral-700"
          >
            + Add login
          </button>
          <button
            onClick={() => setForm({ mode: 'import' })}
            className="rounded border border-dashed border-neutral-300 px-3 py-1.5 text-neutral-500 dark:border-neutral-700"
          >
            Import
          </button>
        </div>
      )}

      <ul className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <li className="px-3 py-4 text-center text-neutral-400">
            {items.length === 0 ? 'No logins yet.' : 'No matches.'}
          </li>
        )}
        {filtered.map((item) => (
          <li
            key={item.itemId}
            className="flex items-center justify-between border-b border-neutral-100 px-3 py-2 dark:border-neutral-800"
          >
            <div className="min-w-0">
              <div className="truncate font-medium">{item.title}</div>
              <div className="truncate text-neutral-500">{item.username}</div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => handleCopy(item)} className="text-xs text-neutral-500 underline">
                {copiedItemId === item.itemId ? 'Copied' : 'Copy'}
              </button>
              <button onClick={() => setForm({ mode: 'edit', item })} className="text-xs text-neutral-500 underline">
                Edit
              </button>
              <button onClick={() => handleDelete(item.itemId)} className="text-xs text-red-500 underline">
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
