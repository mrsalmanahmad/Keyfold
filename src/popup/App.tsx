import { useEffect, useState } from 'react'
import type { KeyfoldResponse } from '../lib/messages'

export default function App() {
  const [unlocked, setUnlocked] = useState<boolean | null>(null)

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'vault/status' }, (res: KeyfoldResponse) => {
      if (res.ok) setUnlocked((res.data as { unlocked: boolean }).unlocked)
    })
  }, [])

  return (
    <div className="flex h-full w-full flex-col bg-white p-4 text-sm text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <h1 className="text-base font-semibold">Keyfold</h1>
      <p className="mt-2 text-neutral-500">
        {unlocked === null ? 'Checking vault status…' : unlocked ? 'Vault unlocked' : 'Vault locked'}
      </p>
      <p className="mt-4 text-xs text-neutral-400">
        Unlock screen, search-first login list and vault switcher land in Phase 3 — see
        PROJECT_PLAN.md.
      </p>
    </div>
  )
}
