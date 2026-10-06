# Security Policy

Keyfold handles credentials. If you find a vulnerability, please help us fix it before it's
public.

## Reporting a vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Please use GitHub's private vulnerability reporting instead:

1. Go to the [Security tab](../../security/advisories) of this repository.
2. Click **"Report a vulnerability"**.
3. Describe the issue, how to reproduce it, and its potential impact.

This opens a private advisory visible only to maintainers until a fix is ready, so the
issue can't be exploited before it's patched.

We aim to acknowledge reports within 5 business days and to ship a fix (or at least a
mitigation plan) before any public disclosure.

## What's in scope

Keyfold's threat model is documented in [PROJECT_PLAN.md](./PROJECT_PLAN.md) (§ Security
and encryption model). Particularly high-value reports:

- Anything that lets ciphertext be decrypted without the Master Key
- Anything that lets a removed vault member keep decrypt access after rotation
- Anything that lets a Drive editor substitute a public key without detection
  (the member-list signature / fingerprint check being bypassable)
- Content-script or extension-page XSS, CSP bypasses, or `eval`-equivalent code execution
- Autofill triggering on the wrong origin, or filling into a cross-origin iframe without a
  click

## What's out of scope

- Reports that assume physical access to an already-unlocked, unlocked device
- Issues in third-party dependencies without a demonstrated path to impact in Keyfold
  itself (report those upstream too)
- The known, documented limitation that a forgotten master password means permanent data
  loss by design (see PROJECT_PLAN.md § Recovery)

## Supported versions

Keyfold is pre-1.0 and under active development. Until a 1.0 release, only the latest
commit on `main` is supported — please confirm an issue still reproduces there before
reporting.
