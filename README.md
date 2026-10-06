# Keyfold

[![CI](https://github.com/mrsalmanahmad/Keyfold/actions/workflows/ci.yml/badge.svg)](https://github.com/mrsalmanahmad/Keyfold/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)
[![Status: pre-MVP](https://img.shields.io/badge/status-pre--MVP-orange.svg)](./PROJECT_PLAN.md)

**Zero-knowledge team password manager.** Keyfold is a Chrome extension (Manifest V3) that
stores every vault, end-to-end encrypted, in the team's own Google Drive. There's no
backend, no database, and no company server that can see your passwords — Google only ever
holds ciphertext.

> **Status:** pre-MVP, under active early development. Not ready for production use of real
> credentials yet. See the [build-status tracker](./PROJECT_PLAN.md#build-status-tracker)
> for what's actually built vs. still planned.

## Why

Team password managers usually mean trusting a third-party server with your vault (even if
it's "encrypted at rest") or paying for enterprise SSO just to share a handful of shared
logins. Keyfold's bet: most small teams already pay for Google Workspace, so let their own
Drive be the only storage — no new service to trust, breach, or pay for.

## How it works

- Every credential is AES-256-GCM encrypted client-side before it ever touches Drive.
- A per-vault key is sealed (X25519) individually to each member's public key, so Drive
  file access alone reveals nothing without a member's private key.
- Your master password never leaves your device — it's run through Argon2id locally to
  derive your Master Key.
- Removing a team member rotates the vault key and re-encrypts everything, so their old
  access stops working.

Full details, including the threat model and key hierarchy, are in
[PROJECT_PLAN.md § Security and encryption model](./PROJECT_PLAN.md#security-and-encryption-model).

## Project plan

[PROJECT_PLAN.md](./PROJECT_PLAN.md) is the living source of truth: goals and non-goals,
architecture, the full security model, tech stack, roadmap/milestones, testing strategy,
risks, and — importantly — a **build-status tracker** showing what's actually implemented
vs. still planned. If you're looking for something to work on, start there.

## Getting started

```bash
git clone https://github.com/mrsalmanahmad/Keyfold.git
cd Keyfold
npm install
npm run dev
```

Then in Chrome: `chrome://extensions` → enable Developer mode → **Load unpacked** → select
the `dist/` folder. CRXJS hot-reloads most changes. Sign-in and Drive sync aren't needed for
local-only use (vault setup, add/edit/search/copy, autofill, import all work without them) —
you only need the OAuth setup below once you're working on the Drive-backed sharing piece.

### Setting up Google OAuth (for Drive sync / sign-in work)

Chrome's "Chrome Extension" OAuth client type is keyed to a specific extension ID, so the
repo pins one via a checked-in public key (`manifest.config.ts`'s `key` field) rather than
relying on the random ID Chrome would otherwise assign per load location. **Keyfold's
extension ID is fixed: `kmcciaekndgplklkjhhammpfciphjdfl`** — it'll be the same for you, on
any machine, as long as `manifest.config.ts` is unchanged.

1. In [Google Cloud Console](https://console.cloud.google.com), create or select a project.
2. **APIs & Services → Library** → enable the **Google Drive API**.
3. **APIs & Services → OAuth consent screen** → configure it (External user type is fine for
   dev), add the `.../auth/drive.file` scope, and add your own Google account as a test user
   (required while the app is in "Testing" publishing status).
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Chrome Extension**
   - Extension ID: `kmcciaekndgplklkjhhammpfciphjdfl`
5. Copy the generated client ID (`xxxx.apps.googleusercontent.com`) into
   `manifest.config.ts`'s `oauth2.client_id`, replacing the placeholder.

The matching private key lives only in your local, gitignored `.keys/extension-key.pem` —
it isn't needed for any of this (Chrome and the Web Store only ever need the public half)
and should never be committed.

### Test

```bash
npm test          # Vitest unit tests (crypto, etc.)
npm run test:e2e  # Playwright, extension loaded
npm run typecheck
npm run lint
```

### Build a Web Store package

```bash
npm run zip
```

Produces `release/keyfold-<version>.zip`.

## Contributing

Contributions are welcome — bug fixes, features, tests, docs, or just filing a good issue.
Please read [CONTRIBUTING.md](./CONTRIBUTING.md) first: it covers dev setup, the extra bar
for anything touching the crypto/storage layers, and what to check before opening a PR.

This project follows a [Code of Conduct](./CODE_OF_CONDUCT.md).

## Security

Found a vulnerability? Please **don't** open a public issue — see
[SECURITY.md](./SECURITY.md) for how to report it privately.

## Tech stack

Chrome MV3 · TypeScript · React · Tailwind CSS · Radix UI · Zustand · WebCrypto ·
libsodium.js · hash-wasm · Vite + CRXJS · Vitest · Playwright

See [PROJECT_PLAN.md § Tech stack](./PROJECT_PLAN.md#tech-stack) for the why behind each
choice.

## License

[MIT](./LICENSE) © Salman Ahmad and contributors.
