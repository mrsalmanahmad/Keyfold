import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest({
  manifest_version: 3,
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
  permissions: ['identity', 'storage', 'alarms', 'activeTab'],
  host_permissions: ['https://www.googleapis.com/*'],
  oauth2: {
    // Replace with a real OAuth client id from Google Cloud Console before first run.
    client_id: 'REPLACE_WITH_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com',
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
