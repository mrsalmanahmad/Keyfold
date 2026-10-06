import { parse } from 'tldts'

/**
 * The registrable domain ("eTLD+1") for a URL or bare hostname — e.g. both
 * "https://accounts.google.com" and "https://www.google.com" resolve to "google.com",
 * but "https://evil-google.com" does not. Falls back to the raw hostname for things with
 * no public suffix (localhost, bare IPs, internal dev domains) so local development still
 * matches itself exactly, which is no weaker than registrable-domain matching for real
 * public domains.
 */
export function registrableDomain(urlOrHost: string): string | null {
  try {
    const result = parse(urlOrHost, { allowPrivateDomains: true })
    return result.domain ?? result.hostname ?? null
  } catch {
    return null
  }
}

/**
 * Autofill only fires on an exact registrable-domain match (see PROJECT_PLAN.md §
 * In-browser hygiene) — never a substring or subdomain-looser check, which is how
 * look-alike phishing domains (e.g. "google.com.evil.net") trick weaker matchers.
 */
export function sameRegistrableDomain(a: string, b: string): boolean {
  const domainA = registrableDomain(a)
  const domainB = registrableDomain(b)
  return domainA !== null && domainA === domainB
}
