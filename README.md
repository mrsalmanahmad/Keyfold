# Keyfold

Zero-knowledge team password manager: a Chrome MV3 extension that stores every vault,
encrypted, in the team's own Google Drive. No backend, no database.

See [PROJECT_PLAN.md](./PROJECT_PLAN.md) for scope, architecture, the security model, the
roadmap, and the build-status tracker (what's built vs. not yet).

## Setup

```bash
npm install
```

Before running the extension you need a Google OAuth client id (Google Cloud Console →
APIs & Services → Credentials → OAuth client ID → Chrome Extension) with the
`drive.file` scope, dropped into `manifest.config.ts` (`oauth2.client_id`).

## Develop

```bash
npm run dev
```

Then in Chrome: `chrome://extensions` → enable Developer mode → **Load unpacked** → select
the `dist/` folder. CRXJS hot-reloads on save.

## Test

```bash
npm test          # Vitest unit tests (crypto, etc.)
npm run test:e2e  # Playwright, extension loaded
npm run typecheck
npm run lint
```

## Build a Web Store package

```bash
npm run zip
```

Produces `release/keyfold-<version>.zip`.
