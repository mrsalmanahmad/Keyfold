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
- [x] Open-sourced: MIT license, CONTRIBUTING/CODE_OF_CONDUCT/SECURITY docs, issue/PR templates

### Phase 1 — Spike (Week 1) — go/no-go gate
- [x] Stable extension ID pinned (`manifest.config.ts`'s `key` field; ID is
      `kmcciaekndgplklkjhhammpfciphjdfl`) — a prerequisite for creating the Chrome Extension
      OAuth client at all, since that client type is keyed to a specific extension ID. See
      README § Setting up Google OAuth
- [ ] Google Cloud project + OAuth consent screen + OAuth client ID (manual, in your Google
      account — see README; `manifest.config.ts`'s `oauth2.client_id` still has the placeholder)
- [ ] `drive.file` + Google Picker spike: a teammate picks the admin's **shared team folder**
      once, and `drive.file` scope keeps working for files *other members* add to it later
      (not just files this user personally created or picked) — see § Architecture for why
      this one question replaced the old per-vault-file sharing design
- [ ] Decision: `drive.file` scope viable, or need full `drive` scope + paid Google assessment
- [ ] Threat model doc

### Phase 2 — Crypto core
- [x] Master password → Argon2id → Master Key
- [x] User keypair (X25519 + Ed25519) generation, encrypted storage (wrapped under the Master Key)
- [x] Vault Key generation + per-member sealing ("key slots"); add/remove member with key rotation + re-encryption
- [x] Item encryption (AES-256-GCM, per-item nonce + AAD)
- [x] Key fingerprint helper for out-of-band member verification
- [x] Unit tests: round-trips + tamper tests (flipped signature byte, flipped ciphertext byte, wrong master key, revoked member's old key)
- [x] Wired into the background service worker: `account/*` and `item/*` message handlers, backed by real `chrome.storage.local` (persistent) + `chrome.storage.session` (unlocked keys only)
- [x] Real idle auto-lock: `chrome.alarms` + a `lastActivity` timestamp in session state, not a stub
- [ ] Lock/unlock, encrypt/sync round-trip across two real browsers via Drive (blocked on the week-1 `drive.file` spike below — what's wired today is local-only, single-user)

### Phase 3 — Feature complete (target Dec 20)
- [x] Sign in with Google (`chrome.identity`) — `src/background/googleAuth.ts` wraps `getAuthToken`/`removeCachedAuthToken`, looks up the signed-in account via Google's userinfo endpoint (more reliable than `getProfileUserInfo`, which reflects the browser's default profile account rather than whichever account was actually granted), and revokes server-side on disconnect so a fresh sign-in re-prompts consent. A "Connect Google Drive" control is wired into both the popup and the full vault page. Verified in a real Chrome instance: a fresh profile correctly reports "not connected" without prompting, and clicking connect correctly reaches Google's real sign-in page with no client-ID/extension-ID mismatch error — completing an actual login needs a human (Google blocks automated consent), so that final confirmation is still open. This does *not* yet touch Drive itself — `GoogleDriveAdapter` isn't wired to this token yet, and the `drive.file` cascading-access spike question is still open
- [x] Personal vault (local-only for now; "shared team vaults" still needs the Drive spike)
- [x] Add/edit/search/copy logins — popup: setup screen, unlock screen, search-first list, add/edit form, copy-to-clipboard
- [x] Password generator — random (length 8–64, A-Z/a-z/0-9/symbol toggles) and passphrase mode (3–10 words, optional number), wired into the item form
- [ ] Join-request + approval flow, roles (Owner/Editor/Viewer) — `addMember`/role plumbing exists in the crypto core; no join-request UI yet, and real sharing needs the shared team folder (Drive)
- [x] Remove member + key rotation + re-encryption (crypto/service layer; no UI trigger yet since there's no one to remove in a local-only vault)
- [x] Auto-lock
- [ ] Encrypted offline cache — currently `chrome.storage.local` *is* the only copy (no Drive to cache against yet); revisit once Drive sync lands
- [x] Encrypted import (LastPass / Bitwarden / Chrome CSV) — CSV parsing via `papaparse`, per-source column mapping, auto-detected source with manual override, preview before confirming, one batched `item/import` write (not N round-trips). Verified end-to-end in a real browser: upload → auto-detect → preview → import → items appear, fully encrypted
- [x] In-field autofill icon + save/update prompt — content script detects login forms, autofills on an exact registrable-domain match (via `tldts`), captures form submissions, and prompts to save a new login or update an existing one; "Generate password" also reachable from the field icon's menu. Verified end-to-end in a real Chrome instance against a live test page, including the update actually persisting
- [x] Full vault page — opens as a real tab (`src/vault`, reachable via "Open full vault" in the popup), not the popup's 320px strip: vault sidebar, search, add/edit/delete, CSV export, CSV import, and multi-select bulk delete, all sharing the popup's existing crud/import components and background messaging. Verified end-to-end in a real Chrome instance: added an item from the popup, saw it appear in the full page, added/edited another from the full page, exported a CSV and confirmed its contents round-trip through the existing importer, then bulk-deleted via select-all and single-select. Folders and sharing/member management are deliberately out of scope here — folders need a data-model decision and member management is blocked on the Drive spike (see below)
- [ ] Keyboard shortcuts
- [ ] Light/dark theme (WCAG AA) — Tailwind `dark:` classes used throughout, not yet checked against WCAG AA contrast
- [x] Clipboard auto-clear that survives the popup closing — moved the write + delayed clear into a `chrome.offscreen` document (`src/offscreen`), which the background creates on demand and which keeps running after the popup/vault tab that triggered the copy closes. Offscreen documents are never focused, so the async Clipboard API throws there; uses the documented workaround (a hidden textarea + `execCommand('copy')`) instead — and since clearing with an empty string turned out to be a silent no-op on the system clipboard (verified by hand), the clear overwrites with a single space instead. Verified end-to-end in a real Chrome instance: copied a password, closed the popup that triggered the copy, and confirmed via a separate page the clipboard still held the password immediately after and was overwritten a few seconds later once the timer fired
- [ ] Autofill only catches native `<form>` submissions, not SPA logins that submit via fetch/XHR without a real form submit event — fine for the MVP, revisit once testing against the "20 popular login pages" list from the QA strategy surfaces real gaps

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
- Join a team via a shared Drive folder link (admin-provisioned); roles: Owner, Editor, Viewer; remove member with key rotation
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
┌─────────────┐      ┌──────────────┐      ┌─────────────────────┐
│   Popup UI   │◄────►│   Service    │◄────►│   Google Drive       │
│ (React)      │ msg  │   Worker     │ API  │ one shared team      │
├─────────────┤      │ (all crypto, │      │ folder: member        │
│ Content      │◄────►│  all Drive   │      │ public keys + one    │
│ Script       │ msg  │  access)     │      │ file per vault       │
└─────────────┘      └──────────────┘      └─────────────────────┘
```

**One shared team folder, not one share per vault.** An admin creates a single Drive folder
(e.g. "Keyfold Team") and shares its link with edit access — posted in Slack, email,
wherever — rather than adding each teammate's Google account individually through Drive's
own sharing dialog. Every vault the team creates is just another file inside that one
folder, and every member's public key is published there too (see § Key hierarchy).
Joining is then one action per person: open the link, sign in with Google, and pick that
folder once via the Google Picker — not a separate Drive share and a separate Picker pick
for every vault.

This still requires Google sign-in (`chrome.identity`) for every member — a Drive link,
editable or not, only grants a permission; actually calling the Drive API to read or write
still needs that member's own OAuth token. What the shared-folder model removes is the
admin having to know and individually add each teammate's Google account ahead of time.

The trade-off: "anyone with the link can edit" is weaker Drive-level access control than a
named per-person share — a leaked link lets a stranger write or delete inside the folder.
But Drive access was never what kept secrets safe here: everything in the folder is
zero-knowledge encrypted, and *decrypt* access is controlled entirely by Keyfold's own
owner-signed member list (§ Security and encryption model), not by who Drive lets touch the
file. A leaked link mainly risks availability (someone deletes or corrupts the folder, which
Drive's revision history and trash can recover from) — not confidentiality. For an extra
layer, a Google Workspace admin can scope the link to "anyone in the organization" instead
of the entire internet.

---

## Security and encryption model

Everything is encrypted in the browser before it touches Drive; Google only ever stores ciphertext, and Keyfold has no server to breach.

**Key hierarchy**
1. **Master password** → Argon2id (64 MB, 3 iterations, per-user salt) → *Master Key*. Never stored, never sent.
2. **User keypair** (X25519 for encryption + Ed25519 for signing), generated on first run. Both the public keys and the Master-Key-encrypted private keys are saved in the shared team folder (not scattered in the user's own Drive) — under `drive.file` scope, that one picked folder is the only place the app can reliably *find* them again on a new device or a reinstalled profile; public keys being visible there is fine, and the private key material stays ciphertext regardless of who else can see the folder.
3. **Vault Key** (random AES-256) per vault. For each member, the Vault Key is sealed to that member's public key and stored as a small "key slot" file alongside that vault's file in the shared team folder.
4. **Item encryption**: each credential is AES-256-GCM encrypted with the Vault Key, with a fresh 96-bit nonce and the item ID as associated data.

**Sharing flow**: Drive-level access to the team folder comes from the shared link, not a
per-member grant — so holding the link is necessary but never sufficient to read anything.
A new person who opens the link, signs in, and picks the folder via the Picker can write a
"join request" there (their email, public keys, self-signed), but that alone grants no
vault access. The vault Owner reviews the request, confirms the requester's key fingerprint
out-of-band (Slack, in person, however), and explicitly approves them into a specific
vault with a specific role — only that approval seals the Vault Key to their public key.
Drive access and decrypt access are deliberately two separate gates.

**Removing a member**: generate a new Vault Key, re-encrypt items, re-seal for remaining
members, re-sign the member list. This is purely a Keyfold-side operation — it doesn't (and
can't cleanly) touch Drive's folder-level link permission, since that permission isn't
per-person to begin with. The removed member keeps whatever Drive-level folder access the
link still grants them, but with no sealed key slot left for them in any vault, that access
only ever reaches ciphertext. Note: a removed member may have copied passwords already —
the UI should prompt to rotate the actual passwords.

**Key verification**: because anyone with the shared folder link could, in principle, write
a forged "join request" or try to swap a public-key file, the vault Owner signs the member
list, and each user's key fingerprint (a short word list) is shown for out-of-band
confirmation before the Owner approves them — this is the real gate, not Drive's ACL.

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

**Team flow:** Admin creates a shared Drive folder and shares the edit link once (Slack, email, wherever) → each teammate opens the link, installs Keyfold, signs in with Google, and picks that folder via the Picker (also just once — not per vault) → Keyfold publishes their public key as a join request in the folder → Owner sees the pending request, confirms the fingerprint out-of-band, approves them into a vault with a role → shared items appear for that member.

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

**`drive.file` caveat:** the app can only see files it created or files a user picks — it does *not* automatically see every file a user could otherwise access in Drive. The open question for a **shared team folder** model: if a teammate picks that one folder via the Picker, does `drive.file` scope keep working for vault files *other members add to it later*, or only for files this specific user personally touched? If folder-level Picker selection cascades to later-added siblings, one Picker pick per person is all team sharing ever needs. If it doesn't cascade, each new vault file would need its own fresh Picker grant from every member — unworkable at team scale — forcing a move to the full `drive` scope (and the paid annual Google security assessment that comes with it). **Spike this in week 1 — it is the riskiest assumption in the plan**, and it's now a sharper, single yes/no question than it was under the old one-Drive-share-per-vault design.

---

## Roadmap and milestones

One developer full-time builds the MVP in 12 weeks; beta and Web Store review take it public about 14 weeks from start. Start date of Oct 12 is an assumption — shift the bars if it moves.

- **Go / no-go (Oct 23):** a teammate picks the shared team folder once via Picker under `drive.file`, and still has access to vault files other members add to it afterward; if not, decide on full `drive` scope + Google assessment
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
| `drive.file` + Picker folder-pick doesn't cascade to files added later by other members | Forces full `drive` scope and a paid annual Google security assessment | Week-1 spike; this is now the single question that decides it |
| The shared folder link leaks (pasted somewhere public, phished, etc.) | A stranger can write/delete ciphertext in the folder — availability, not confidentiality | Zero-knowledge encryption + owner-signed member list mean Drive access alone decrypts nothing; Drive revision history/trash recovers deleted files; Workspace admins can scope the link to "anyone in the org" |
| Concurrent edits overwrite each other | Lost passwords | Item-level merge on every write; keep Drive revisions as backup |
| Users forget master password | Permanent data loss, support load | Clear warning at setup; team recovery key in v1.x |
| A forged join request or swapped public-key file | Attacker tries to gain vault access | Owner-signed member list + fingerprint confirmation before every approval — Drive-level folder access was never the gate |
| Drive API quota / rate limits | Slow sync for big teams | Local encrypted cache, batch writes, exponential backoff |
| Web Store review rejects the listing | Launch slips 1–2 weeks | Minimal permissions, clear privacy policy, no remote code |

**Running costs:** Chrome Web Store developer fee is a one-time $5; Google Cloud project and Drive API are free at this usage; storage uses each team's existing Drive quota. Budget separately for a domain, a privacy-policy page and an optional third-party security audit.

**Launch checklist:** privacy policy, OAuth consent screen verification, Web Store listing with screenshots and a 30-second demo video, unlisted beta first, then public.
