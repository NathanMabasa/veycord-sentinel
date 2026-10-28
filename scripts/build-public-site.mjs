import { build } from 'vite'
import react from '@vitejs/plugin-react'
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

// Explicit config avoids Vite's private gateway and .env loading in this build.
const clientDirectory = path.resolve('build/public-client')
await build({
  configFile: false, envDir: false, plugins: [react()],
  define: { 'import.meta.env.VITE_PUBLIC_DEMO': JSON.stringify('true'), 'import.meta.env.VITE_GITHUB_REPOSITORY': JSON.stringify('NathanMabasa/veycord-sentinel') },
  build: { outDir: clientDirectory, emptyOutDir: true, sourcemap: false },
})

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2' }
const assets = Object.create(null)
async function collect(directory, prefix = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = `${prefix}/${entry.name}`
    const filename = path.join(directory, entry.name)
    if (entry.isDirectory()) await collect(filename, relative)
    else if (entry.isFile() && types[path.extname(entry.name)]) assets[relative] = { base64: (await readFile(filename)).toString('base64'), contentType: types[path.extname(entry.name)] }
    else if (entry.name !== '_headers') throw new Error(`Unsupported public asset: ${relative}`)
  }
}
await collect(clientDirectory)
await rm('dist', { recursive: true, force: true })
await build({
  configFile: false, envDir: false, publicDir: false,
  plugins: [{ name: 'public-assets', resolveId: id => id === 'virtual:sentinel-public-assets' ? '\0sentinel-public-assets' : undefined, load: id => id === '\0sentinel-public-assets' ? `export default ${JSON.stringify(assets)}` : undefined }],
  build: { outDir: 'dist/server', emptyOutDir: true, sourcemap: false, target: 'es2022', minify: true,
    lib: { entry: 'server/public-worker.ts', formats: ['es'], fileName: () => 'index.js' },
  },
})
const worker = await readFile('dist/server/index.js')
if (worker.length > 8 * 1024 * 1024) throw new Error('Public Worker exceeds the conservative 8 MiB artifact budget')
let manifest = { d1: null, r2: null }
try { manifest = JSON.parse(await readFile('.openai/hosting.json', 'utf8')) } catch (error) { if (error.code !== 'ENOENT') throw error }
if (manifest.static) throw new Error('Public API deployment requires a Worker, not static-only hosting')
await mkdir('dist/.openai', { recursive: true })
await writeFile('dist/.openai/hosting.json', `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Public Worker built: ${Object.keys(assets).length} assets, ${worker.length} bytes; no database bindings.`)
