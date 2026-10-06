# Keyfold — Team Password Manager Project Plan

*2026-10-06 · Salman Ahmad*

Keyfold is a zero-knowledge team password manager that ships as a Chrome extension and stores every vault, encrypted, in the team's own Google Drive — no servers, no database, near-zero running cost. A 12-week build gets a LastPass-grade MVP to the Chrome Web Store.

> Source of truth for scope/architecture/roadmap. The live, collaborative version of this doc is at https://claude.ai/artifact/1xjiNUU92zuuqJ6a8YzWza — edit here for code-adjacent tracking, edit there for the shared/discussion copy, and keep the two in sync.

---

## Build status tracker

*Updated as work lands. Check items off with PRs/commits, don't just flip them — this is the source of truth for "what's built."*

### Phase 0 — Project scaffold
- [x] Repo init, project plan committed
- [x] Vite + CRXJS + TypeScript + React scaffold
- [x] Tailwind CSS + Radix UI wired in
- [x] MV3 manifest skeleton (service worker, popup, content script, vault page)
- [x] `StorageAdapter` interface stub (Drive-backed impl pending)
- [x] Crypto module skeleton (Argon2id / AES-GCM / X25519 wiring, no real key flows yet)
- [x] Vitest + Playwright test harness configured
- [x] GitHub Actions CI skeleton (lint, test, build, zip)

### Phase 1 — Spike (Week 1) — go/no-go gate
- [ ] `drive.file` + Google Picker spike: teammate can open a shared vault file via Picker
- [ ] Decision: `drive.file` scope viable, or need full `drive` scope + paid Google assessment
- [ ] Threat model doc

### Phase 2 — Crypto core
- [ ] Master password → Argon2id → Master Key
- [ ] User keypair (X25519 + Ed25519) generation, encrypted storage
- [ ] Vault Key generation + per-member sealing ("key slots")
- [ ] Item encryption (AES-256-GCM, per-item nonce + AAD)
- [ ] Lock/unlock, encrypt/sync round-trip across two browsers (milestone gate)

### Phase 3 — Feature complete (target Dec 20)
- [ ] Sign in with Google (`chrome.identity`)
- [ ] Personal vault + shared team vaults
- [ ] Add/edit/search/copy/autofill logins
- [ ] Password generator
- [ ] Invite members, roles (Owner/Editor/Viewer)
- [ ] Remove member + key rotation + re-encryption
- [ ] Auto-lock, encrypted offline cache
- [ ] Encrypted import (LastPass / Bitwarden / Chrome CSV)
- [ ] In-field autofill icon, save/update prompt
- [ ] Full vault page (folders, bulk edit, sharing/member mgmt, import/export)
- [ ] Keyboard shortcuts
- [ ] Light/dark theme (WCAG AA)

### Phase 4 — Release candidate (target Jan 3)
- [ ] Security checklist passed
- [ ] Imports verified end-to-end
- [ ] Web Store package submitted as unlisted

### Phase 5 — Beta & launch
- [ ] Internal beta (2–3 teams, 2 weeks)
- [ ] Crash/error reporting with zero secrets in logs
- [ ] Privacy policy, OAuth consent screen verification
- [ ] Web Store listing (screenshots, 30s demo video)
- [ ] Public launch

### v1.x (post-launch, not in MVP scope)
- [ ] Secure notes, TOTP codes, credit cards, file attachments
- [ ] Password health report (weak/reused/breached via k-anonymity HIBP)
- [ ] Edge/Brave builds, Firefox port
- [ ] Activity log per vault, admin recovery key
- [ ] Team recovery key

### Non-goals for v1
- Own backend or database of any kind
- Mobile apps
- Non-Google storage (OneDrive, Dropbox) — storage layer built as an adapter so it can come later

---

## Name and positioning

**Recommended name: Keyfold** — your keys, folded into your own Drive. Short, pronounceable, no "Google" or "Drive" in the name (Chrome Web Store and Google brand rules reject names that imply Google affiliation, so "VaultDrive" or "DriveVault" is a listing risk).

**One-line pitch:** "Team password sharing with end-to-end encryption, stored in the Google Drive you already pay for."

| Name | Why it works | Watch out for |
|---|---|---|
| Keyfold (pick) | Distinct, says "keys kept in your fold" | Check .com / .app and Web Store availability |
| Cipherloft | Encrypted + stored up in your cloud | Slightly longer |
| Lockhaven | Friendly, trust-signalling | More generic, likely taken |
| TeamSafe | Plain, says what it does | Very crowded name space |
| Vaultly | Modern SaaS feel | Several existing products use it |

Open question: run a trademark and domain check on the shortlist before design work starts.

---

## Goals and scope

The MVP must let a 5–50 person team store, autofill and share credentials end-to-end encrypted, with Google Drive as the only storage.

**MVP (v1.0)**
- Sign in with Google; set a master password that never leaves the device
- Personal vault plus shared team vaults (e.g. "QA Envs", "Prod Admin")
- Add, edit, search, copy, and autofill logins; password generator
- Invite members by email, roles: Owner, Editor, Viewer; remove member with key rotation
- Auto-lock after idle time; encrypted offline cache
- Encrypted import from LastPass / Bitwarden / Chrome CSV

**v1.x (after launch)**
- Secure notes, TOTP codes, credit cards, file attachments
- Password health report (weak, reused, breached via k-anonymity HIBP check)
- Edge / Brave builds (same MV3 code); Firefox port
- Activity log per vault; admin recovery key

**Non-goals for v1**
- Own backend or database of any kind
- Mobile apps
- Non-Google storage (OneDrive, Dropbox) — design the storage layer as an adapter so it can come later

---

## Architecture

Keyfold is a serverless MV3 extension: all crypto runs in the service worker, and Google Drive is a dumb store of encrypted files.

Popup and content script never touch keys or Drive directly; they ask the service worker, which is the only part that decrypts, encrypts and syncs.

```
┌─────────────┐      ┌──────────────┐      ┌───────────────────┐
│   Popup UI   │◄────►│   Service    │◄────►│   Google Drive     │
│ (React)      │ msg  │   Worker     │ API  │ (encrypted files    │
├─────────────┤      │ (all crypto, │      │  only — vault =     │
│ Content      │◄────►│  all Drive   │      │  1 file per vault) │
│ Script       │ msg  │  access)     │      │                     │
└─────────────┘      └──────────────┘      └───────────────────┘
```

---

## Security and encryption model

Everything is encrypted in the browser before it touches Drive; Google only ever stores ciphertext, and Keyfold has no server to breach.

**Key hierarchy**
1. **Master password** → Argon2id (64 MB, 3 iterations, per-user salt) → *Master Key*. Never stored, never sent.
2. **User keypair** (X25519 for encryption + Ed25519 for signing), generated on first run. Private keys are encrypted with the Master Key and saved in the user's own Drive; public keys are published to the team folder.
3. **Vault Key** (random AES-256) per vault. For each member, the Vault Key is sealed to that member's public key and stored as a small "key slot" file in the vault folder.
4. **Item encryption**: each credential is AES-256-GCM encrypted with the Vault Key, with a fresh 96-bit nonce and the item ID as associated data.

**Sharing flow**: the Owner shares the vault's Drive folder with the teammate's Google account (for file access), then Keyfold seals the Vault Key to the teammate's public key (for decrypt access). Drive access alone reveals nothing.

**Removing a member**: revoke the Drive share, generate a new Vault Key, re-encrypt items, re-seal for remaining members. Note: a removed member may have copied passwords already — the UI should prompt to rotate the actual passwords.

**Key verification**: because a Drive editor could swap a public-key file, the vault Owner signs the member list, and each user's key fingerprint (a short word list) is shown for out-of-band confirmation on invite.

**In-browser hygiene**
- Unlocked keys live only in `chrome.storage.session` (memory, cleared on browser close) plus auto-lock after 15 min idle (configurable)
- Strict extension CSP, no remote code, no `eval`; clipboard auto-clear after 30 s
- Autofill only on exact registrable-domain match; never fill in cross-origin iframes without a click

**Recovery**: a forgotten master password means lost data by design. v1.x adds an optional team recovery key held by the Owner, printed as a recovery sheet.

---

## Features and UX

The bar is LastPass-level polish: one click to unlock, one click to fill, nothing in the way.

| Surface | What it does |
|---|---|
| Toolbar popup (380×600) | Unlock screen; search-first list with favicons; vault switcher; matches for the current site pinned on top |
| In-field icon | Small Keyfold icon inside username/password fields; click shows matching logins inline |
| Save / update prompt | After a login form submits, a slim bar offers "Save to… [vault]" or "Update password" |
| Password generator | Length 8–64, symbols / digits toggles, passphrase mode; available in the popup and the field menu |
| Full vault page | Opens in a tab: folders, bulk edit, sharing and member management, import / export |
| Keyboard | Ctrl+Shift+L fill, Ctrl+Shift+K open popup; full keyboard navigation |
| Theme | Light / dark following the OS; accessible contrast (WCAG AA) |

**First-run flow (target < 2 min):** Sign in with Google → create master password (strength meter) → Keyfold creates its Drive folder → optional import → done.

**Team flow:** Create vault → "Invite" by email → teammate installs Keyfold, signs in, accepts → Owner confirms fingerprint → shared items appear.

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Extension platform | Chrome Manifest V3 (service worker, content scripts, popup) | Required for new Web Store listings; runs on Edge and Brave too |
| Language / build | TypeScript, Vite + CRXJS plugin | Fast HMR for extensions, typed crypto code |
| UI | React, Tailwind CSS, Radix UI primitives | Accessible components, LastPass-style polish quickly |
| State | Zustand | Small, works across popup and vault page |
| Crypto | WebCrypto (AES-GCM, HKDF) + libsodium.js (X25519 sealed boxes, Ed25519) + hash-wasm (Argon2id) | Audited primitives, no home-made crypto |
| Auth | `chrome.identity` Google OAuth, scope `drive.file` | Non-sensitive scope: avoids Google's paid annual security assessment that full `drive` scope requires |
| Storage | Google Drive API v3 via a `StorageAdapter` interface | Swappable for OneDrive / Dropbox later |
| Cache | Encrypted blobs in `chrome.storage.local`; keys in `chrome.storage.session` | Fast unlock and offline read |
| Testing | Vitest (unit), Playwright with the extension loaded (E2E) | Matches existing Playwright skills |
| CI | GitHub Actions: lint, test, build, zip for Web Store | Repeatable releases |

**`drive.file` caveat:** the app can only see files it created or files a user picks. So each vault is ONE Drive file (header with key slots and signed member list, plus encrypted items). A teammate accepting an invite picks that single file once in the Google Picker, and from then on Keyfold can read and write it. **Spike this in week 1 — it is the riskiest assumption in the plan.**

---

## Roadmap and milestones

One developer full-time builds the MVP in 12 weeks; beta and Web Store review take it public about 14 weeks from start. Start date of Oct 12 is an assumption — shift the bars if it moves.

- **Go / no-go (Oct 23):** teammate can open a shared vault file via Picker under `drive.file`; if not, decide on full `drive` scope + Google assessment
- **Crypto core done:** vault create, lock / unlock, encrypt / sync round-trip across two browsers
- **Feature complete (Dec 20):** autofill, generator, sharing, roles, rotation on removal
- **Release candidate (Jan 3):** security checklist passed, imports working, Web Store package submitted as unlisted
- **Public launch:** beta feedback fixed, listing public

---

## Testing and QA strategy

Crypto and sharing correctness gate every release; UI polish is tested, but a decrypt bug is a P0.

- **Crypto unit tests (Vitest):** known-answer vectors for Argon2id, AES-GCM and sealed boxes; tamper tests (flip one byte → must fail); nonce-uniqueness checks
- **Sharing matrix:** Owner / Editor / Viewer × add, edit, delete, invite, remove; removed member must fail to decrypt after rotation
- **Concurrency:** two browsers editing the same vault file at once — no lost items, conflict copy created when needed
- **E2E (Playwright, extension loaded):** first run, unlock, autofill on 20 popular login pages, save prompt, generator, import CSVs, auto-lock
- **Drive failure modes:** token expiry, 403 / 429 rate limits, offline, file deleted or moved by a user
- **Security review:** threat model doc in week 2; internal pen-test checklist (OWASP browser-extension risks) in week 11; external audit before marketing to larger teams
- **Beta:** 2–3 internal teams for two weeks, crash and error reporting with zero secrets in logs

---

## Risks, costs and launch

| Risk | Impact | Mitigation |
|---|---|---|
| `drive.file` + Picker flow doesn't cover team sharing cleanly | Forces full `drive` scope and a paid annual Google security assessment | Week-1 spike; single-file-per-vault design |
| Concurrent edits overwrite each other | Lost passwords | Item-level merge on every write; keep Drive revisions as backup |
| Users forget master password | Permanent data loss, support load | Clear warning at setup; team recovery key in v1.x |
| Public-key substitution by a Drive editor | Attacker gains vault access | Owner-signed member list + fingerprint confirmation |
| Drive API quota / rate limits | Slow sync for big teams | Local encrypted cache, batch writes, exponential backoff |
| Web Store review rejects the listing | Launch slips 1–2 weeks | Minimal permissions, clear privacy policy, no remote code |

**Running costs:** Chrome Web Store developer fee is a one-time $5; Google Cloud project and Drive API are free at this usage; storage uses each team's existing Drive quota. Budget separately for a domain, a privacy-policy page and an optional third-party security audit.

**Launch checklist:** privacy policy, OAuth consent screen verification, Web Store listing with screenshots and a 30-second demo video, unlisted beta first, then public.
