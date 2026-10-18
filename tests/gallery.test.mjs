import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHandler } from '../src/lib/server/gallery-handler.mjs'
import { memePath, newId } from '../src/lib/shared/meme-path.js'
import { tradeLink, validContract } from '../src/lib/shared/token-settings.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
test('browser writes stay allowed when Next normalizes the request host to localhost', async () => {
  const storageRoot = await mkdtemp(join(tmpdir(), 'tonk-origin-'))
  try {
    const handle = createHandler({ siteRoot: resolve(root, 'public'), storageRoot, adminKey: 'local-test-key' })
    const headers = { origin: 'http://127.0.0.1:8080', host: '127.0.0.1:8080' }
    const allowed = await handle(new Request('http://localhost:8080/api/describe', { method: 'POST', headers, body: '{}' }))
    assert.equal(allowed.status, 200)
    const otherPort = await handle(new Request('http://localhost:8080/api/describe', { method: 'POST', headers: { ...headers, origin: 'http://127.0.0.1:9999' }, body: '{}' }))
    assert.equal(otherPort.status, 403)
  } finally {
    await rm(storageRoot, { recursive: true, force: true })
  }
})

test('Ethereum configuration never links a blank or Solana address to trading', () => {
  assert.equal(tradeLink({ contractAddress: '' }), '')
  assert.equal(tradeLink({ contractAddress: '3dpsiabfinr98Q4yBJ42TvrPcbHubdvxAWaCnTm2Vjrh' }), '')
  assert.equal(validContract('0x' + '0'.repeat(40)), false)
  const address = '0x' + '1'.repeat(40)
  const url = new URL(tradeLink({ contractAddress: address }))
  assert.equal(url.hostname, 'app.uniswap.org')
  assert.equal(url.searchParams.get('chain'), 'ethereum')
  assert.equal(url.searchParams.get('outputCurrency'), address)
  assert.equal(tradeLink({ contractAddress: address, tradeUrl: 'javascript:alert(1)' }), '')
})

test('local website, ranged video, upload persistence and protected deletion', async t => {
  const storageRoot = await mkdtemp(join(tmpdir(), 'tonk-qa-'))
  t.after(() => rm(storageRoot, { recursive: true, force: true }))
  const handle = createHandler({ siteRoot: resolve(root, 'public'), storageRoot, adminKey: 'local-test-key' })
  const request = (path, init) => handle(new Request('http://127.0.0.1:8080' + path, init))
  await t.test('font assets and snapshot contain the captured content', async () => {
    const response = await request('/fonts/fonts.css')
    assert.equal(response.status, 200)
    assert.match(await response.text(), /DM Sans/)
    assert.equal((await (await request('/api/memes')).json()).length, 19)
  })
  await t.test('video seeking returns the exact requested bytes', async () => {
    const response = await request('/video/tonk-teaser-v1.mp4', { headers: { range: 'bytes=0-15' } })
    const actual = Buffer.from(await response.arrayBuffer())
    assert.equal(response.status, 206)
    assert.equal(response.headers.get('content-length'), '16')
    const expected = (await readFile(resolve(root, 'public/video/tonk-teaser-v1.mp4'))).subarray(0, 16)
    assert.deepEqual(actual, expected)
    assert.equal((await request('/video/tonk-teaser-v1.mp4', { headers: { range: 'bytes=999999999-' } })).status, 416)
  })
  await t.test('server files outside site are not exposed', async () => {
    assert.equal((await request('/tools/server-core.mjs')).status, 404)
    assert.equal((await request('/.runtime/gallery.json')).status, 404)
  })
  const id = newId()
  const metadata = { id, type: 'image', w: 1, h: 1, title: 'QA image ✓', description: 'Local upload', ext: 'png' }
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64')
  const uploadPath = '/api/upload?pathname=' + encodeURIComponent(memePath(metadata))
  await t.test('read-only mode serves the gallery and rejects new uploads', async () => {
    const readOnly = createHandler({ siteRoot: resolve(root, 'public'), storageRoot, adminKey: 'local-test-key', uploadsEnabled: false })
    const response = await readOnly(new Request('http://127.0.0.1:8080' + uploadPath, { method: 'POST', headers: { 'content-type': 'image/png' }, body: png }))
    assert.equal(response.status, 403)
    const list = await (await readOnly(new Request('http://127.0.0.1:8080/api/memes'))).json()
    assert.equal(list.length, 19)
  })
  await t.test('cross-origin writes and disguised file bytes are rejected', async () => {
    assert.equal((await request(uploadPath, { method: 'POST', headers: { 'content-type': 'image/png', origin: 'https://example.com' }, body: png })).status, 403)
    assert.equal((await request(uploadPath, { method: 'POST', headers: { 'content-type': 'image/png' }, body: 'not a PNG' })).status, 400)
  })
  await t.test('upload is indexed, served locally and persists across handler restarts', async () => {
    const response = await request(uploadPath, { method: 'POST', headers: { 'content-type': 'image/png' }, body: png })
    assert.equal(response.status, 200)
    const data = await response.json()
    assert.equal(data.url, `/uploads/${id}.png`)
    assert.deepEqual(Buffer.from(await (await request('/uploads/' + id + '.png')).arrayBuffer()), png)
    const fresh = createHandler({ siteRoot: resolve(root, 'public'), storageRoot, adminKey: 'local-test-key' })
    const list = await (await fresh(new Request('http://127.0.0.1:8080/api/memes'))).json()
    assert.equal(list.length, 20)
    assert.equal(list[0].title, metadata.title)
  })
  await t.test('only the local team passcode authorizes deletion', async () => {
    const call = key => request('/api/delete', { method: 'POST', headers: { 'content-type': 'application/json', 'x-admin-key': key }, body: JSON.stringify({ ids: [id] }) })
    assert.equal((await call('wrong')).status, 401)
    assert.equal((await (await request('/api/memes')).json()).length, 20)
    assert.equal((await call('local-test-key')).status, 200)
    assert.equal((await (await request('/api/memes')).json()).length, 19)
    assert.equal((await request('/uploads/' + id + '.png')).status, 404)
  })
  await t.test('private source-site services are clearly disconnected', async () => {
    assert.equal((await request('/api/import', { method: 'POST', body: '{}' })).status, 501)
    assert.equal((await request('/api/fetch?url=https://example.com/x.jpg')).status, 501)
    assert.deepEqual(await (await request('/api/describe', { method: 'POST', body: '{}' })).json(), {})
  })
})
