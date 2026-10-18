import { createReadStream } from 'node:fs'
import { mkdir, readFile, writeFile, rename, stat, unlink } from 'node:fs/promises'
import { resolve, relative, extname, join, sep } from 'node:path'
import { Readable } from 'node:stream'
import { timingSafeEqual } from 'node:crypto'
import { parseMemePath, POSTER_RE, CONTENT, LIMITS } from '../shared/meme-path.js'

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2',
  '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8',
}
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
})
const fail = (message, status) => Object.assign(new Error(message), { status })
const matchesKey = (value, key) => {
  const a = Buffer.from(value || ''), b = Buffer.from(key || '')
  return b.length > 0 && a.length === b.length && timingSafeEqual(a, b)
}
// Next.js rewrites request.url to http://localhost even when the browser used
// 127.0.0.1. Compare the Origin the browser sent with the Host it connected to.
const sameOriginWrite = (request, url) => {
  const origin = request.headers.get('origin')
  if (!origin) return true
  let sent
  try { sent = new URL(origin) } catch { return false }
  const forwardedHost = (request.headers.get('x-forwarded-host') || '').split(',')[0].trim()
  const allowed = new Set([url.host, request.headers.get('host') || '', forwardedHost].filter(Boolean).map(value => value.toLowerCase()))
  if (!allowed.has(sent.host.toLowerCase())) return false
  const forwardedProto = (request.headers.get('x-forwarded-proto') || '').split(',')[0].trim()
  return sent.protocol === `${forwardedProto || url.protocol.replace(':', '')}:`
}
async function bytes(request, limit) {
  if (Number(request.headers.get('content-length')) > limit) throw fail('That file is too large.', 413)
  const chunks = []; let size = 0
  if (request.body) for await (const chunk of request.body) {
    size += chunk.byteLength
    if (size > limit) throw fail('That file is too large.', 413)
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}
const looksLike = (data, ext) => {
  if (ext === 'jpg') return data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff
  if (ext === 'png') return data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
  if (ext === 'gif') return /^GIF8[79]a$/.test(data.subarray(0, 6).toString('ascii'))
  if (ext === 'mp4') return data.length >= 12 && data.subarray(4, 8).toString('ascii') === 'ftyp'
  return false
}
async function fileResponse(path, request) {
  let info
  try { info = await stat(path) } catch { return new Response('Not found', { status: 404 }) }
  if (!info.isFile()) return new Response('Not found', { status: 404 })
  const headers = new Headers({
    'content-type': MIME[extname(path).toLowerCase()] || 'application/octet-stream',
    'content-length': String(info.size), 'accept-ranges': 'bytes',
    'x-content-type-options': 'nosniff', 'cache-control': 'no-cache',
  })
  let start = 0, end = info.size - 1, status = 200
  const range = request.headers.get('range')
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range)
    if (!match || (!match[1] && !match[2])) return new Response(null, { status: 416, headers: { 'content-range': `bytes */${info.size}` } })
    if (!match[1]) start = Math.max(0, info.size - Number(match[2]))
    else { start = Number(match[1]); if (match[2]) end = Math.min(end, Number(match[2])) }
    if (start > end || start >= info.size || end < 0) return new Response(null, { status: 416, headers: { 'content-range': `bytes */${info.size}` } })
    status = 206
    headers.set('content-range', `bytes ${start}-${end}/${info.size}`)
    headers.set('content-length', String(end - start + 1))
  }
  return new Response(request.method === 'HEAD' ? null : Readable.toWeb(createReadStream(path, { start, end })), { status, headers })
}

// Optional local filesystem backend, authored for this package. It is not the source site's server.
export function createHandler({ siteRoot, storageRoot, adminKey = '', uploadsEnabled = true }) {
  siteRoot = resolve(siteRoot); storageRoot = resolve(storageRoot)
  const statePath = join(storageRoot, 'gallery.json')
  const uploads = join(storageRoot, 'uploads')
  let tail = Promise.resolve()
  const serial = work => { const result = tail.then(work); tail = result.catch(() => {}); return result }
  const readState = async () => {
    try { return JSON.parse(await readFile(statePath, 'utf8')) }
    catch (error) { if (error.code !== 'ENOENT') throw error; return JSON.parse(await readFile(join(siteRoot, 'data/memes.json'), 'utf8')) }
  }
  const saveState = async list => {
    await mkdir(storageRoot, { recursive: true })
    await writeFile(statePath + '.tmp', JSON.stringify(list, null, 2))
    await rename(statePath + '.tmp', statePath)
  }
  return async function handle(request) {
    try {
      const url = new URL(request.url)
      const path = decodeURIComponent(url.pathname)
      if (!['GET', 'HEAD'].includes(request.method)) {
        if (!sameOriginWrite(request, url)) return json({ error: 'This request is not allowed.' }, 403)
      }
      if (path === '/api/memes' && request.method === 'GET') return json(await readState())
      if (path === '/api/describe' && request.method === 'POST') {
        await bytes(request, 2 * 1024 * 1024)
        return json({}) // Manual titles work; no third-party AI service is connected.
      }
      if (path === '/api/import' || path === '/api/fetch') {
        return json({ error: 'Link imports are not connected yet. Upload the file instead.' }, 501)
      }
      if (path === '/api/upload' && request.method === 'POST') {
        if (!uploadsEnabled) return json({ error: 'Uploads are unavailable on this host.' }, 403)
        const pathname = url.searchParams.get('pathname') || ''
        const poster = POSTER_RE.exec(pathname)
        const meta = parseMemePath(pathname)
        if (!poster && !meta) return json({ error: 'Invalid media metadata.' }, 400)
        const ext = poster ? 'jpg' : meta.ext
        const type = poster ? 'poster' : meta.type
        if ((request.headers.get('content-type') || '').split(';')[0] !== CONTENT[ext]) return json({ error: 'Unexpected media type.' }, 415)
        const data = await bytes(request, LIMITS[type])
        if (!looksLike(data, ext)) return json({ error: 'The file does not match its media type.' }, 400)
        return await serial(async () => {
          await mkdir(uploads, { recursive: true })
          const id = poster ? poster[1] : meta.id
          const name = poster ? `${id}-poster.jpg` : `${id}.${ext}`
          const list = await readState()
          if (!poster && list.some(item => item.id === id)) return json({ error: 'This media ID already exists.' }, 409)
          await writeFile(join(uploads, name), data)
          const mediaUrl = `/uploads/${name}`
          if (!poster) {
            let posterUrl = null
            try { if ((await stat(join(uploads, `${id}-poster.jpg`))).isFile()) posterUrl = `/uploads/${id}-poster.jpg` } catch {}
            list.unshift({ ...meta, url: mediaUrl, size: data.length, poster: posterUrl })
            await saveState(list)
          }
          return json({ url: mediaUrl, pathname: name, contentType: CONTENT[ext] })
        })
      }
      if (path === '/api/delete' && request.method === 'POST') {
        if (!matchesKey(request.headers.get('x-admin-key'), adminKey)) return json({ error: 'Wrong passcode.' }, 401)
        const body = JSON.parse((await bytes(request, 16 * 1024)).toString('utf8'))
        if (body.check === true) return json({ ok: true })
        if (!Array.isArray(body.ids) || body.ids.length > 200 || !body.ids.every(id => /^[0-9a-z]{13}$/.test(id))) return json({ error: 'Invalid selection.' }, 400)
        return await serial(async () => {
          const ids = new Set(body.ids)
          const list = await readState()
          await saveState(list.filter(item => !ids.has(item.id)))
          for (const item of list.filter(item => ids.has(item.id))) {
            if (item.url?.startsWith('/uploads/')) {
              await unlink(join(uploads, `${item.id}.${item.ext}`)).catch(() => {})
              await unlink(join(uploads, `${item.id}-poster.jpg`)).catch(() => {})
            }
          }
          return json({ ok: true })
        })
      }
      if (!['GET', 'HEAD'].includes(request.method)) return json({ error: 'Method not allowed.' }, 405)
      if (path.startsWith('/api/')) return json({ error: 'Not found.' }, 404)
      if (path.startsWith('/uploads/')) {
        const name = path.slice('/uploads/'.length)
        if (!/^[0-9a-z]{13}(?:-poster)?\.(jpg|png|gif|mp4)$/.test(name)) return new Response('Not found', { status: 404 })
        return fileResponse(join(uploads, name), request)
      }
      const target = resolve(siteRoot, '.' + (path === '/' ? '/index.html' : path))
      const rel = relative(siteRoot, target)
      if (!rel || rel.startsWith('..' + sep) || rel === '..' || rel.split(sep).some(part => part.startsWith('.'))) return new Response('Not found', { status: 404 })
      return fileResponse(target, request)
    } catch (error) {
      if (error instanceof URIError || error instanceof SyntaxError) return json({ error: 'Invalid request.' }, 400)
      return json({ error: error.status ? error.message : 'The local server could not complete this request.' }, error.status || 500)
    }
  }
}
