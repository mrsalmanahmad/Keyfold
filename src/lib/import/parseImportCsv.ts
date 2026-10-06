import Papa from 'papaparse'
import type { ImportedItem, ImportSource } from './types'

type Row = Record<string, string>

function hostnameFrom(url: string | undefined): string | undefined {
  if (!url) return undefined
  try {
    return new URL(url).hostname
  } catch {
    return undefined
  }
}

function hasCredential(item: ImportedItem): boolean {
  return item.username !== '' || item.password !== ''
}

function fromLastPass(rows: Row[]): ImportedItem[] {
  return rows
    .map((row) => ({
      title: row.name || hostnameFrom(row.url) || 'Imported login',
      username: row.username ?? '',
      password: row.password ?? '',
      url: row.url || undefined,
      notes: row.extra || undefined,
    }))
    .filter(hasCredential)
}

function fromBitwarden(rows: Row[]): ImportedItem[] {
  return rows
    .filter((row) => (row.type || 'login').toLowerCase() === 'login')
    .map((row) => ({
      title: row.name || hostnameFrom(row.login_uri) || 'Imported login',
      username: row.login_username ?? '',
      password: row.login_password ?? '',
      url: row.login_uri || undefined,
      notes: row.notes || undefined,
    }))
    .filter(hasCredential)
}

function fromChrome(rows: Row[]): ImportedItem[] {
  return rows
    .map((row) => ({
      title: row.name || hostnameFrom(row.url) || 'Imported login',
      username: row.username ?? '',
      password: row.password ?? '',
      url: row.url || undefined,
      notes: row.note || undefined,
    }))
    .filter(hasCredential)
}

export function parseImportCsv(source: ImportSource, csvText: string): ImportedItem[] {
  const { data } = Papa.parse<Row>(csvText, { header: true, skipEmptyLines: true })
  switch (source) {
    case 'lastpass':
      return fromLastPass(data)
    case 'bitwarden':
      return fromBitwarden(data)
    case 'chrome':
      return fromChrome(data)
  }
}

/** Sniffs the header row to suggest a source — the user still confirms it before importing. */
export function detectImportSource(csvText: string): ImportSource | null {
  const headerLine = csvText.split(/\r?\n/, 1)[0]?.toLowerCase() ?? ''
  const columns = new Set(headerLine.split(',').map((c) => c.trim().replace(/^"|"$/g, '')))

  if (columns.has('login_uri') && columns.has('login_username') && columns.has('login_password')) return 'bitwarden'
  if (columns.has('extra') && columns.has('grouping') && columns.has('fav')) return 'lastpass'
  if (columns.has('name') && columns.has('url') && columns.has('username') && columns.has('password')) return 'chrome'
  return null
}
