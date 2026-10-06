import { test, expect } from '@playwright/test'

// Real extension-loaded E2E specs (first run, unlock, autofill, save prompt,
// generator, import, auto-lock — see PROJECT_PLAN.md § Testing and QA strategy)
// land once the extension loads a persistent browser context in Phase 3.
test.skip('placeholder — extension E2E harness pending', async () => {
  expect(true).toBe(true)
})
