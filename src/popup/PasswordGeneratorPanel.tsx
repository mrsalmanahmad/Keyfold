import { useEffect, useState } from 'react'
import { generatePassword, MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '../lib/generator/passwordGenerator'
import { generatePassphrase } from '../lib/generator/passphraseGenerator'

export default function PasswordGeneratorPanel({
  onUse,
  onClose,
}: {
  onUse: (password: string) => void
  onClose: () => void
}) {
  const [mode, setMode] = useState<'random' | 'passphrase'>('random')
  const [length, setLength] = useState(20)
  const [useUppercase, setUseUppercase] = useState(true)
  const [useLowercase, setUseLowercase] = useState(true)
  const [useDigits, setUseDigits] = useState(true)
  const [useSymbols, setUseSymbols] = useState(true)
  const [wordCount, setWordCount] = useState(5)
  const [includeNumber, setIncludeNumber] = useState(true)
  const [preview, setPreview] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [regenerateTick, setRegenerateTick] = useState(0)

  // Regenerates whenever any option (or the "Regenerate" button) changes — reading state
  // straight from props here avoids acting on a stale value from before a setState applied.
  useEffect(() => {
    try {
      setError(null)
      setPreview(
        mode === 'random'
          ? generatePassword({ length, useUppercase, useLowercase, useDigits, useSymbols })
          : generatePassphrase({ wordCount, separator: '-', includeNumber }),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [mode, length, useUppercase, useLowercase, useDigits, useSymbols, wordCount, includeNumber, regenerateTick])

  return (
    <div className="flex flex-col gap-2 border-b border-neutral-200 bg-neutral-50 p-3 text-sm dark:border-neutral-800 dark:bg-neutral-800/50">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('random')}
          className={`flex-1 rounded py-1 ${mode === 'random' ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900' : 'border border-neutral-300 dark:border-neutral-700'}`}
        >
          Random
        </button>
        <button
          type="button"
          onClick={() => setMode('passphrase')}
          className={`flex-1 rounded py-1 ${mode === 'passphrase' ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900' : 'border border-neutral-300 dark:border-neutral-700'}`}
        >
          Passphrase
        </button>
      </div>

      <code className="break-all rounded border border-neutral-300 bg-white px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900">
        {preview}
      </code>
      {error && <p className="text-red-600 dark:text-red-400">{error}</p>}

      {mode === 'random' ? (
        <>
          <label className="flex items-center justify-between gap-2">
            <span>Length: {length}</span>
            <input
              type="range"
              min={MIN_PASSWORD_LENGTH}
              max={MAX_PASSWORD_LENGTH}
              value={length}
              onChange={(e) => setLength(Number(e.target.value))}
              className="flex-1"
            />
          </label>
          <div className="grid grid-cols-2 gap-1">
            <Toggle label="A-Z" checked={useUppercase} onChange={setUseUppercase} />
            <Toggle label="a-z" checked={useLowercase} onChange={setUseLowercase} />
            <Toggle label="0-9" checked={useDigits} onChange={setUseDigits} />
            <Toggle label="!@#" checked={useSymbols} onChange={setUseSymbols} />
          </div>
        </>
      ) : (
        <>
          <label className="flex items-center justify-between gap-2">
            <span>Words: {wordCount}</span>
            <input
              type="range"
              min={3}
              max={10}
              value={wordCount}
              onChange={(e) => setWordCount(Number(e.target.value))}
              className="flex-1"
            />
          </label>
          <Toggle label="Include a number" checked={includeNumber} onChange={setIncludeNumber} />
        </>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setRegenerateTick((t) => t + 1)}
          className="flex-1 rounded border border-neutral-300 py-1.5 dark:border-neutral-700"
        >
          Regenerate
        </button>
        <button
          type="button"
          onClick={() => preview && onUse(preview)}
          className="flex-1 rounded bg-neutral-900 py-1.5 text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          Use this
        </button>
        <button type="button" onClick={onClose} className="rounded border border-neutral-300 px-3 py-1.5 dark:border-neutral-700">
          ✕
        </button>
      </div>
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex items-center gap-1.5">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}
