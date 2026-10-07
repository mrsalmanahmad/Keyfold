import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

// Pins the extension's ID so it stays the same across every unpacked reload and every
// dev machine (Chrome otherwise derives a random ID per load location). This is the
// PUBLIC half of a keypair — see README § Setup for how it was generated and why the
// matching private key (.keys/extension-key.pem) must never be committed.
const EXTENSION_PUBLIC_KEY =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1yP1zKRh87bUM+og4GhlUTHUQgePmqD6y+4Dk1V6a80dxoZ1QTmc3EdQjlMaWrQJ5IgOWeO80wW8Cn3mQCiC3lqTDz1CY2Wb1YjUN7gTw4H9NUUxWKI9Bp/vw7gGiTE2iau28+0HqOUo6+R3iqGeqsfHtLy0NSwTkIBxQs9X4cUzrqFV+G/Y1madvjS+6qCKKWkedbu41PUYY/WQ8oaX6srVNRlv6ek5p/xfNt6lOaaV4M+V5cGqzwTNjS5HHdGqXtJX1VBlFTBLsQGLiuWQmmTxGxMWlmn3h5UzWbVcJqhxWgILIyI3DtucaEj2ujpRkjlgrvBTSuD5M22LfmfPYQIDAQAB'

export default defineManifest({
  manifest_version: 3,
  key: EXTENSION_PUBLIC_KEY,
  name: 'Keyfold — Team Password Manager',
  description: 'End-to-end encrypted team password sharing, stored in your own Google Drive.',
  version: pkg.version,
  icons: {
    16: 'public/icons/icon-16.png',
    48: 'public/icons/icon-48.png',
    128: 'public/icons/icon-128.png',
  },
  action: {
    default_popup: 'src/popup/index.html',
    default_icon: {
      16: 'public/icons/icon-16.png',
      48: 'public/icons/icon-48.png',
      128: 'public/icons/icon-128.png',
    },
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['https://*/*', 'http://*/*'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],
  chrome_url_overrides: undefined,
  commands: {
    // Reserved name — Chrome handles this one natively (simulates clicking the toolbar
    // icon), no onCommand listener needed.
    _execute_action: {
      suggested_key: { default: 'Ctrl+Shift+K' },
    },
    'fill-login': {
      suggested_key: { default: 'Alt+Shift+L' },
      description: 'Fill the saved login for this site',
    },
  },
  permissions: ['identity', 'storage', 'alarms', 'activeTab', 'offscreen'],
  host_permissions: ['https://www.googleapis.com/*'],
  oauth2: {
    // Replace with a real OAuth client id from Google Cloud Console before first run.
    client_id: '803207539050-gkbv8qapplbid1k9et61j306a2q35ib4.apps.googleusercontent.com',
    scopes: ['https://www.googleapis.com/auth/drive.file', 'openid', 'email'],
  },
  content_security_policy: {
    // 'wasm-unsafe-eval' (not 'unsafe-eval') is required for the Argon2id (hash-wasm) and
    // libsodium WebAssembly modules to compile at all under MV3's strict CSP — without it
    // every WebAssembly.compile() call throws, which breaks master-key derivation entirely.
    extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
  },
  web_accessible_resources: [
    {
      resources: ['src/vault/index.html'],
      matches: ['<all_urls>'],
    },
  ],
})
