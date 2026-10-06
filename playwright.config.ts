import { defineConfig } from '@playwright/test'

// Extension E2E testing requires a persistent context with --load-extension,
// set up per-test via chromium.launchPersistentContext (see tests/e2e/fixtures.ts
// once it lands in Phase 3). This config covers the harness shape for now.
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  reporter: 'list',
  use: {
    trace: 'retain-on-failure',
  },
})
