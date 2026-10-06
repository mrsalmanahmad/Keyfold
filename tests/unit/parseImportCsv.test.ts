import { describe, expect, it } from 'vitest'
import { detectImportSource, parseImportCsv } from '../../src/lib/import/parseImportCsv'

const LASTPASS_CSV = `url,username,password,extra,name,grouping,fav
https://example.com,alice,p@ss1,some notes,Example Site,Work,0
https://github.com,bob,p@ss2,,GitHub,,1
`

const BITWARDEN_CSV = `folder,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp
Work,0,login,Example Site,some notes,,0,https://example.com,alice,p@ss1,
,0,note,Just a note,this is not a login,,0,,,,
,1,login,GitHub,,,0,https://github.com,bob,p@ss2,
`

const CHROME_CSV = `name,url,username,password,note
Example Site,https://example.com,alice,p@ss1,some notes
GitHub,https://github.com,bob,p@ss2,
`

describe('parseImportCsv', () => {
  it('parses a LastPass export', () => {
    const items = parseImportCsv('lastpass', LASTPASS_CSV)
    expect(items).toHaveLength(2)
    expect(items[0]).toEqual({
      title: 'Example Site',
      username: 'alice',
      password: 'p@ss1',
      url: 'https://example.com',
      notes: 'some notes',
    })
    expect(items[1].notes).toBeUndefined()
  })

  it('parses a Bitwarden export, skipping non-login rows', () => {
    const items = parseImportCsv('bitwarden', BITWARDEN_CSV)
    expect(items).toHaveLength(2)
    expect(items.map((i) => i.title)).toEqual(['Example Site', 'GitHub'])
    expect(items[0].username).toBe('alice')
  })

  it('parses a Chrome export', () => {
    const items = parseImportCsv('chrome', CHROME_CSV)
    expect(items).toHaveLength(2)
    expect(items[0]).toEqual({
      title: 'Example Site',
      username: 'alice',
      password: 'p@ss1',
      url: 'https://example.com',
      notes: 'some notes',
    })
  })

  it('falls back to the hostname when a row has no name/title', () => {
    const csv = 'url,username,password,extra,name,grouping,fav\nhttps://example.com,alice,pw,,,,\n'
    const items = parseImportCsv('lastpass', csv)
    expect(items[0].title).toBe('example.com')
  })

  it('drops rows with neither a username nor a password', () => {
    const csv = 'name,url,username,password,note\nEmpty Row,https://example.com,,,\n'
    expect(parseImportCsv('chrome', csv)).toHaveLength(0)
  })
})

describe('detectImportSource', () => {
  it('detects LastPass', () => {
    expect(detectImportSource(LASTPASS_CSV)).toBe('lastpass')
  })

  it('detects Bitwarden', () => {
    expect(detectImportSource(BITWARDEN_CSV)).toBe('bitwarden')
  })

  it('detects Chrome', () => {
    expect(detectImportSource(CHROME_CSV)).toBe('chrome')
  })

  it('returns null for an unrecognized format', () => {
    expect(detectImportSource('foo,bar\n1,2\n')).toBeNull()
  })
})
