import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'

const appDir = 'dist-app'
const outDir = 'dist/ui'
const entryFile = join(appDir, 'index.html')

if (!existsSync(entryFile)) {
  console.error(`Missing ${entryFile}. Run "pnpm build:app" first.`)
  process.exit(1)
}

async function listFiles(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await listFiles(full, base)))
    else if (entry.isFile()) files.push(relative(base, full).split(sep).join('/'))
  }
  return files.sort()
}

await rm(outDir, { recursive: true, force: true })
await mkdir(outDir, { recursive: true })

await cp(entryFile, join(outDir, 'index.html'))
await cp(join(appDir, '_astro'), join(outDir, '_astro'), { recursive: true })
if (existsSync(join(appDir, 'favicon.svg'))) {
  await cp(join(appDir, 'favicon.svg'), join(outDir, 'favicon.svg'))
}

const files = {}
for (const path of await listFiles(outDir)) {
  const data = await readFile(join(outDir, path))
  files[path] = createHash('sha256').update(data).digest('hex')
}

// The version is derived from the file hashes, so it only changes when the
// shell changes. Pinning the manifest would be impossible if an unrelated
// site deploy changed it.
const contentHash = createHash('sha256').update(JSON.stringify(files)).digest('hex')
const manifest = {
  apiVersion: 1,
  uiVersion: contentHash.slice(0, 7),
  entry: 'index.html',
  files,
}

await writeFile(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Packaged ${Object.keys(files).length} files into ${outDir}`)
