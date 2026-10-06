# Contributing to Keyfold

Thanks for considering a contribution — Keyfold is early (pre-MVP), which means there's a
lot of room to shape it, but also that core pieces (the crypto model, the storage layer)
are still settling. Read on before diving into a big PR.

## Before you start

- Skim [PROJECT_PLAN.md](./PROJECT_PLAN.md) — it has the scope, architecture, security
  model, and a build-status tracker of what's done vs. not.
- For anything non-trivial (a new feature, a crypto change, a UX flow), **open an issue or
  discussion first**. It's much easier to agree on an approach before code is written than
  to re-review a finished PR.
- Small fixes (typos, obvious bugs, test gaps) can go straight to a PR.

## Security-sensitive changes

Keyfold is a password manager — correctness in `src/lib/crypto/` and `src/lib/storage/`
matters more than almost anything else in this repo. If your change touches key
derivation, encryption/decryption, key sealing/unsealing, signing, or the sharing/rotation
flow:

- Add or update unit tests with known-answer vectors and tamper tests (flip a byte, expect
  failure) — see `tests/unit/crypto.test.ts` for the pattern.
- Explain in the PR description *why* the change is safe, not just what it does.
- Expect closer review and more back-and-forth than a UI change gets.

Found an actual vulnerability instead of proposing a fix? See [SECURITY.md](./SECURITY.md)
— please don't open a public issue or PR for it.

## Development setup

```bash
npm install
npm run dev
```

Then in Chrome: `chrome://extensions` → enable Developer mode → **Load unpacked** → select
the `dist/` folder. CRXJS hot-reloads most changes.

You'll need a Google OAuth client ID (Google Cloud Console → APIs & Services →
Credentials → OAuth client ID → Chrome Extension, scope `drive.file`) dropped into
`manifest.config.ts` to exercise sign-in and Drive sync locally.

## Before opening a PR

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

All four should pass. CI runs the same checks plus a packaged build.

## Pull request guidelines

- Keep PRs focused — one logical change per PR is easier to review than a bundle.
- Write the PR description around *why*, not just *what* (the diff already shows what).
- Update [PROJECT_PLAN.md](./PROJECT_PLAN.md)'s build-status tracker if your change
  completes or starts a tracked item.
- Add tests for new behavior; update tests your change invalidates.
- Don't add a new dependency for something a few lines of code can do, especially in the
  crypto or storage layers — fewer moving parts there is a feature, not a limitation.

## Code style

- TypeScript, strict mode — don't suppress type errors with `any` or `@ts-ignore` without a
  comment explaining why it's unavoidable.
- Formatting is enforced by Prettier (`npm run format`) and linting by ESLint
  (`npm run lint`) — don't hand-format against the grain of the config.
- Follow existing patterns in the file/directory you're editing over introducing a new
  pattern, unless you're explicitly proposing to replace the old one everywhere.

## Reporting bugs / requesting features

Use the issue templates — they ask for the information that's actually needed to act on a
report (repro steps for bugs, problem statement for features).

## License

By contributing, you agree that your contributions will be licensed under the project's
[MIT License](./LICENSE).
