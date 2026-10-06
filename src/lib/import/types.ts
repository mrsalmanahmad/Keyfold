export type ImportSource = 'lastpass' | 'bitwarden' | 'chrome'

export interface ImportedItem {
  title: string
  username: string
  password: string
  url?: string
  notes?: string
}
