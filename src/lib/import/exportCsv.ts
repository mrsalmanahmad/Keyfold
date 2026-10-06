import Papa from 'papaparse'
import type { LoginItem } from '../types'

/** Chrome's import/export CSV column order — round-trips through parseImportCsv('chrome', ...). */
export function exportItemsToCsv(items: LoginItem[]): string {
  const rows = items.map((item) => ({
    name: item.title,
    url: item.url ?? '',
    username: item.username,
    password: item.password,
    note: item.notes ?? '',
  }))
  return Papa.unparse(rows, { columns: ['name', 'url', 'username', 'password', 'note'] })
}
