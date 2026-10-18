import { readFile, readdir, access, stat } from 'node:fs/promises'
import { resolve, relative, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'

const root = fileURLToPath(new URL('../', import.meta.url))
const publicRoot = resolve(root, 'public')
const errors = []; let references = 0, syntaxChecks = 0
const digest = bytes => createHash('sha256').update(bytes).digest('hex')
async function walk(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) files.push(...await walk(path)); else files.push(path)
  }
  return files
}
async function checkReference(value, base, file) {
  if (!value || /^(?:https?:|data:|blob:|#|mailto:)/.test(value)) return
  const path = value.startsWith('/') ? resolve(publicRoot, '.' + value.split(/[?#]/)[0]) : resolve(base, value.split(/[?#]/)[0])
  references++
  try { await access(path) } catch { errors.push(`${relative(root, file)}: missing ${value}`) }
}
const publicFiles = await walk(publicRoot)
const sourceFiles = await walk(resolve(root, 'src'))
for (const file of [...publicFiles, ...sourceFiles]) {
  const extension = extname(file)
  if (!['.css', '.js', '.mjs', '.tsx', '.ts'].includes(extension)) continue
  const text = await readFile(file, 'utf8')
  if (extension === '.css') for (const match of text.matchAll(/url\(\s*(?:"([^"]+)"|'([^']+)'|([^\s)]+))\s*\)/g)) await checkReference(match[1] || match[2] || match[3], dirname(file), file)
  if (['.tsx', '.ts', '.js'].includes(extension)) for (const match of text.matchAll(/['"](\/(?:img|video|runtime|vendor)\/[^'"]+)['"]/g)) await checkReference(match[1], dirname(file), file)
  if (['.js', '.mjs'].includes(extension)) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' }); syntaxChecks++
    if (result.status !== 0) errors.push(result.stderr)
  }
  if (/3dpsiabfinr98Q4yBJ42TvrPcbHubdvxAWaCnTm2Vjrh|jup\.ag|ahs4x65slgdafklt\.public\.blob/.test(text)) errors.push(`Original token/backend link in active source ${relative(root, file)}`)
}
const memes = JSON.parse(await readFile(resolve(publicRoot, 'data/memes.json'), 'utf8'))
for (const meme of memes) {
  await checkReference(meme.url, publicRoot, 'public/data/memes.json')
  const path = resolve(publicRoot, '.' + meme.url)
  if ((await stat(path)).size !== meme.size) errors.push(`Gallery size mismatch: ${meme.id}`)
  if (meme.poster) await checkReference(meme.poster, publicRoot, 'public/data/memes.json')
}
const uploaded = JSON.parse(await readFile(resolve(root, 'reference/uploaded-file-map.json'), 'utf8'))
for (const item of uploaded) {
  const data = await readFile(resolve(root, item.packaged_path))
  if (digest(data) !== item.sha256 || data.length !== item.bytes) errors.push(`Uploaded file changed: ${item.uploaded_filename}`)
}
const css = await readFile(resolve(root, 'src/app/globals.css'))
const referenceCss = await readFile(resolve(root, 'reference/original-public-source/style.css'))
if (!css.equals(referenceCss)) errors.push('globals.css differs from the original reference stylesheet')
const wasm = await readFile(resolve(publicRoot, 'vendor/ffmpeg/core/ffmpeg-core.wasm'))
if (!wasm.subarray(0, 4).equals(Buffer.from([0,97,115,109]))) errors.push('FFmpeg binary has an invalid WASM header')
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1 }
else console.log(JSON.stringify({ ok: true, originalStylesheetByteIdentical: true, publicFiles: publicFiles.length, localAssetReferences: references, javascriptSyntaxChecks: syntaxChecks, suppliedFilesVerified: uploaded.length, galleryItems: memes.length, images: publicFiles.filter(file => /\.(jpg|png|gif)$/.test(file)).length, videos: publicFiles.filter(file => file.endsWith('.mp4')).length, fontFiles: publicFiles.filter(file => file.endsWith('.woff2')).length }, null, 2))
