import { describe, expect, it } from 'vitest'
import { exportItemsToCsv } from '../../src/lib/import/exportCsv'
import { parseImportCsv } from '../../src/lib/import/parseImportCsv'
import type { LoginItem } from '../../src/lib/types'

const ITEMS: LoginItem[] = [
  {
    itemId: '1',
    title: 'Example Site',
    username: 'alice',
    password: 'p@ss1',
    url: 'https://example.com',
    notes: 'some notes',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    itemId: '2',
    title: 'GitHub',
    username: 'bob',
    password: 'p@ss2',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
]

describe('exportItemsToCsv', () => {
  it('produces a Chrome-format CSV header', () => {
    const csv = exportItemsToCsv(ITEMS)
    expect(csv.split(/\r?\n/, 1)[0]).toBe('name,url,username,password,note')
  })

  it('round-trips through parseImportCsv("chrome", ...)', () => {
    const csv = exportItemsToCsv(ITEMS)
    const reimported = parseImportCsv('chrome', csv)
    expect(reimported).toEqual([
      {
        title: 'Example Site',
        username: 'alice',
        password: 'p@ss1',
        url: 'https://example.com',
        notes: 'some notes',
      },
      {
        title: 'GitHub',
        username: 'bob',
        password: 'p@ss2',
        url: undefined,
        notes: undefined,
      },
    ])
  })
})
