/**
 * Google sign-in via chrome.identity. There's no client secret for a Chrome Extension OAuth
 * client (see README § Setting up Google OAuth), so this is just: get a token (prompting the
 * user interactively the first time), and look up which account it belongs to by calling
 * Google's userinfo endpoint — more reliable than chrome.identity.getProfileUserInfo, which
 * reflects the browser profile's default account rather than whichever account the user
 * actually picked in the OAuth consent screen.
 */
const USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo'
const REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke'

export interface GoogleAccount {
  email: string
}

export async function signInWithGoogle(): Promise<GoogleAccount> {
  const { token } = await chrome.identity.getAuthToken({ interactive: true })
  if (!token) throw new Error('Google sign-in did not return a token')
  return fetchGoogleAccount(token)
}

/** Non-interactive: resolves to null rather than prompting if there's no cached token yet. */
export async function getCachedGoogleAccount(): Promise<GoogleAccount | null> {
  try {
    const { token } = await chrome.identity.getAuthToken({ interactive: false })
    if (!token) return null
    return await fetchGoogleAccount(token)
  } catch {
    return null
  }
}

/** For Drive API calls once that lands — throws rather than silently prompting if not signed in. */
export async function getGoogleAccessToken(): Promise<string> {
  const { token } = await chrome.identity.getAuthToken({ interactive: false })
  if (!token) throw new Error('Not signed in to Google')
  return token
}

export async function signOutOfGoogle(): Promise<void> {
  const { token } = await chrome.identity.getAuthToken({ interactive: false }).catch(() => ({ token: undefined }))
  if (!token) return

  await chrome.identity.removeCachedAuthToken({ token })
  // Also revoke server-side, or Google will just hand back the same token next time without
  // re-prompting for consent — defeating the point of an explicit "disconnect".
  await fetch(`${REVOKE_ENDPOINT}?token=${token}`, { method: 'POST' }).catch(() => undefined)
}

async function fetchGoogleAccount(token: string): Promise<GoogleAccount> {
  const res = await fetch(USERINFO_ENDPOINT, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`Failed to fetch Google account info: ${res.status}`)
  const data = (await res.json()) as { email?: string }
  if (!data.email) throw new Error('Google account info response did not include an email')
  return { email: data.email }
}
