import { useCallback, useEffect, useState } from 'react'
import type { AccountStatus } from '../lib/messages'
import { sendMessage } from './messaging'
import SetupScreen from './SetupScreen'
import LockedScreen from './LockedScreen'
import VaultScreen from './VaultScreen'

type Screen = 'loading' | 'setup' | 'locked' | 'unlocked' | 'error'

export default function App() {
  const [screen, setScreen] = useState<Screen>('loading')
  const [error, setError] = useState<string | null>(null)

  const refreshStatus = useCallback(async () => {
    try {
      const status = await sendMessage<AccountStatus>({ type: 'account/status' })
      if (!status.accountExists) setScreen('setup')
      else if (!status.unlocked) setScreen('locked')
      else setScreen('unlocked')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setScreen('error')
    }
  }, [])

  useEffect(() => {
    void refreshStatus()
  }, [refreshStatus])

  switch (screen) {
    case 'loading':
      return <CenteredMessage>Checking vault status…</CenteredMessage>
    case 'error':
      return <CenteredMessage>{error}</CenteredMessage>
    case 'setup':
      return <SetupScreen onDone={refreshStatus} />
    case 'locked':
      return <LockedScreen onUnlocked={refreshStatus} />
    case 'unlocked':
      return <VaultScreen onLocked={refreshStatus} />
  }
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-white p-4 text-center text-sm text-neutral-500 dark:bg-neutral-900">
      {children}
    </div>
  )
}
