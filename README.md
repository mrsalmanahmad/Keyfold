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
```

You'll need a Google OAuth client ID (Google Cloud Console → APIs & Services →
Credentials → OAuth client ID → Chrome Extension, scope `drive.file`) dropped into
`manifest.config.ts` (`oauth2.client_id`) before sign-in and Drive sync work locally.

```bash
npm run dev
```

Then in Chrome: `chrome://extensions` → enable Developer mode → **Load unpacked** → select
the `dist/` folder. CRXJS hot-reloads most changes.

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
