import { describe, expect, it } from 'vitest'
import { registrableDomain, sameRegistrableDomain } from '../../src/lib/autofill/domainMatch'

describe('registrableDomain', () => {
  it('extracts the eTLD+1 from a full URL', () => {
    expect(registrableDomain('https://accounts.google.com/signin')).toBe('google.com')
    expect(registrableDomain('https://www.google.com')).toBe('google.com')
  })

  it('handles multi-part public suffixes', () => {
    expect(registrableDomain('https://shop.example.co.uk')).toBe('example.co.uk')
  })

  it('falls back to the bare hostname for things with no public suffix', () => {
    expect(registrableDomain('http://localhost:3000')).toBe('localhost')
    expect(registrableDomain('http://192.168.1.10')).toBe('192.168.1.10')
  })
})

describe('sameRegistrableDomain', () => {
  it('matches a subdomain against the apex domain', () => {
    expect(sameRegistrableDomain('https://accounts.google.com', 'https://www.google.com')).toBe(true)
  })

  it('does not match a look-alike domain', () => {
    expect(sameRegistrableDomain('https://google.com', 'https://google.com.evil.net')).toBe(false)
  })

  it('does not match an unrelated domain', () => {
    expect(sameRegistrableDomain('https://github.com', 'https://gitlab.com')).toBe(false)
  })
})
