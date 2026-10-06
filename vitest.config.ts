import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Plain Node: crypto/vault logic needs no DOM, and jsdom's separate realm breaks
    // libsodium's typed-array checks (Uint8Array from one realm fails `instanceof` in
    // another). Component tests that need a DOM can opt into jsdom per-file via a
    // `// @vitest-environment jsdom` docblock.
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
})
