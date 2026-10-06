import { existsSync } from 'node:fs'
import { mkdir, readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'

// Zips dist/ into release/keyfold-<version>.zip for Chrome Web Store upload.
// Uses the system `zip` binary (available in GitHub Actions ubuntu runners and
// on most dev machines) rather than adding an archiver dependency.
const pkg = JSON.parse(await readFile('package.json', 'utf8'))

if (!existsSync('dist')) {
  console.error('dist/ not found — run `npm run build` first')
  process.exit(1)
}

await mkdir('release', { recursive: true })
const outFile = path.join('release', `keyfold-${pkg.version}.zip`)

execFileSync('zip', ['-r', '-FS', `../${path.basename(outFile)}`, '.'], {
  cwd: 'dist',
  stdio: 'inherit',
})

console.log(`Wrote ${outFile}`)
