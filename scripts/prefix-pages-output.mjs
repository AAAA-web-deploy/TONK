import { readdir, readFile, writeFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'

const base = process.env.NEXT_PUBLIC_BASE_PATH || '/TONK'
const out = resolve('out')
const roots = ['img', 'fonts', 'media', 'video', 'runtime', 'data', 'vendor', 'uploads', 'api', '_next']
const textExtensions = new Set(['.html', '.css', '.js', '.json', '.txt', '.svg'])

function rewrite(text) {
  let next = text
  for (const name of roots) {
    const pattern = new RegExp(`(?<!${base.replace('/', '\\/')})\\/${name}\\/`, 'g')
    next = next.replace(pattern, `${base}/${name}/`)
  }
  return next
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) await walk(path)
    else if (textExtensions.has(extname(entry.name))) {
      const original = await readFile(path, 'utf8')
      const updated = rewrite(original)
      if (updated !== original) await writeFile(path, updated)
    }
  }
}

await walk(out)
console.log(`Prefixed Pages assets with ${base}`)
