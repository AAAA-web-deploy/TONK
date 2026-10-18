import { upload } from './local-upload.js'
import { memePath, posterPath, newId, cleanTitle, cleanDescription, CONTENT } from '../shared/meme-path.js'
import { kindOf, processImage, processGif, processVideo } from './process.js'

// Runs only after hydration. AbortSignal cleanup prevents duplicate listeners in React Strict Mode.
export async function mountGallery(signal) {
  const listen = (target, type, listener, options = {}) => target?.addEventListener(type, listener, { ...options, signal })
  const fetch = (input, options = {}) => globalThis.fetch(input, { ...options, signal })
const $ = id => document.getElementById(id)
const grid = $('grid')
const search = $('search')
const tabs = $('tabs')
const fileInput = $('file-input')
const dropzone = $('dropzone')
const postModal = $('post-modal')
const postList = $('post-list')
const postGo = $('post-go')
const linkModal = $('link-modal')
const linkForm = $('link-form')
const linkInput = $('link-input')
const linkTitle = $('link-title')
const linkError = $('link-error')
const viewer = $('viewer')
const toast = $('toast')

const state = { memes: [], tab: 'all', q: '', admin: null, loaded: false, selecting: false, selected: new Set() }
const canTouch = matchMedia('(hover: none)').matches

const el = (tag, props = {}, ...kids) => {
  const node = document.createElement(tag)
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v
    else if (k === 'text') node.textContent = v
    else if (k.startsWith('on')) listen(node, k.slice(2), v)
    else if (v === true) node.setAttribute(k, '')
    else if (v !== false && v != null) node.setAttribute(k, v)
  }
  node.append(...kids.filter(Boolean))
  return node
}

let toastTimer
const say = text => {
  if (signal.aborted) return
  toast.textContent = text
  toast.hidden = false
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.hidden = true }, 2400)
}

const fileName = m => `${(m.title || 'tonk').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'tonk'}.${m.ext}`
const fetchBlob = async m => {
  const res = await fetch(m.url)
  if (!res.ok) throw new Error('fetch failed')
  return res.blob()
}

// ---------- actions ----------

const pngFor = async m => {
  const blob = await fetchBlob(m)
  if (blob.type === 'image/png') return blob
  const bmp = await createImageBitmap(blob)
  const c = document.createElement('canvas')
  c.width = bmp.width
  c.height = bmp.height
  c.getContext('2d').drawImage(bmp, 0, 0)
  return new Promise((resolve, reject) => c.toBlob(b => (b ? resolve(b) : reject(new Error('png'))), 'image/png'))
}

const copyMeme = async m => {
  try {
    // Safari needs the ClipboardItem built synchronously in the click, holding a promise
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngFor(m) })])
    say('Copied. Paste it into your post')
  } catch {
    say('Your browser blocked copying. Use download')
  }
}

const downloadMeme = async m => {
  try {
    const blob = await fetchBlob(m)
    const a = el('a', { href: URL.createObjectURL(blob), download: fileName(m) })
    document.body.append(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 10000)
  } catch {
    window.open(m.url, '_blank', 'noopener')
  }
}

const shareMeme = async m => {
  try {
    const blob = await fetchBlob(m)
    const file = new File([blob], fileName(m), { type: blob.type || CONTENT[m.ext] })
    await navigator.share({ files: [file] })
  } catch (e) {
    if (e?.name !== 'AbortError') downloadMeme(m)
  }
}

const canShareFiles = (() => {
  try { return canTouch && !!navigator.canShare?.({ files: [new File([''], 'x.png', { type: 'image/png' })] }) } catch { return false }
})()

const deleteIds = async ids => {
  const res = await fetch('/api/delete', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-admin-key': state.admin },
    body: JSON.stringify({ ids }),
  }).catch(() => null)
  if (!res?.ok) {
    const error = (await res?.json().catch(() => null))?.error || 'Delete failed'
    if (res?.status === 401) logOut()
    say(error)
    return false
  }
  const gone = new Set(ids)
  state.memes = state.memes.filter(x => !gone.has(x.id))
  for (const id of ids) state.selected.delete(id)
  if (viewer.open) viewer.close()
  render()
  return true
}

const deleteMeme = async m => {
  if (!confirm(`Delete "${m.title || 'this meme'}" for everyone?`)) return
  if (await deleteIds([m.id])) say('Deleted')
}

const actionsFor = (m, big = false) => {
  const btn = (label, fn, cls = '') => el('button', {
    class: `act ${cls}`, type: 'button', text: label,
    onclick: e => { e.stopPropagation(); fn(m) },
  })
  return el('div', { class: big ? 'v-actions' : 'm-actions' },
    m.type === 'image' && !canTouch && btn('Copy', copyMeme),
    canShareFiles ? btn('Share', shareMeme) : null,
    btn('Download', downloadMeme),
    state.admin && btn('Delete', deleteMeme, 'danger'),
  )
}

// ---------- media ----------

const duration = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

const mediaFor = (m, big = false) => {
  if (m.ext !== 'mp4') return el('img', { src: m.url, alt: m.title || 'TONK meme', loading: big ? 'eager' : 'lazy', decoding: 'async' })
  const v = el('video', {
    src: m.url, poster: m.poster, muted: true, loop: true, playsinline: true,
    preload: big ? 'auto' : 'metadata', 'aria-label': m.title || 'TONK meme',
  })
  v.muted = true
  if (big) {
    v.controls = true
    v.autoplay = true
    v.muted = m.type === 'gif'
  }
  return v
}

// GIF-style mp4s loop while on screen; videos play on hover
const inView = new IntersectionObserver(entries => {
  for (const { target, isIntersecting } of entries) {
    if (isIntersecting) target.play().catch(() => {})
    else target.pause()
  }
}, { rootMargin: '100px' })

// ---------- cards ----------

const card = m => {
  const media = mediaFor(m)
  const frame = el('div', { class: 'm-media', style: `aspect-ratio:${m.w}/${m.h}` }, media)
  if (m.type !== 'image') {
    const badge = el('span', { class: 'm-badge', text: m.type === 'gif' ? 'GIF' : 'VIDEO' })
    if (m.type === 'video') listen(media, 'loadedmetadata', () => { badge.textContent = `▶ ${duration(media.duration)}` }, { once: true })
    frame.append(badge)
  }
  const picked = state.selected.has(m.id)
  const node = el('figure', {
    class: `m-card${state.selecting ? ' selecting' : ''}${picked ? ' picked' : ''}`,
    title: m.title || '',
    onclick: () => (state.selecting ? toggleSelect(m.id) : openViewer(m)),
  }, frame, state.selecting ? null : actionsFor(m))
  if (state.admin && !state.selecting) {
    node.append(el('button', {
      class: 'm-x', type: 'button', 'aria-label': 'Delete meme', title: 'Delete',
      onclick: e => { e.stopPropagation(); deleteMeme(m) },
    }, '×'))
  }
  if (state.selecting) node.append(el('span', { class: 'm-check', 'aria-hidden': 'true' }, picked ? '✓' : ''))
  if (m.ext === 'mp4') {
    if (m.type === 'gif') inView.observe(media)
    else if (!canTouch) {
      listen(node, 'mouseenter', () => media.play().catch(() => {}))
      listen(node, 'mouseleave', () => media.pause())
    }
  }
  return node
}

const uploadCard = () => el('div', { class: 'u-card', onclick: e => { if (!e.target.closest('button')) fileInput.click() } },
  el('strong', { text: 'Upload memes' }),
  el('span', { class: 'u-icon', 'aria-hidden': 'true' }),
  el('span', { text: canTouch ? 'Tap to pick photos & videos or' : 'Drag & drop your files or' }),
  el('button', { class: 'btn-gold', type: 'button', text: 'Paste image or URL', onclick: pasteButton }),
  el('small', { text: 'Images, GIFs & videos · auto-sized for X' }),
)

const importCard = () => el('div', { class: 'u-card u-import' },
  el('strong', { text: 'Already posted it on X?' }),
  el('button', { class: 'btn-gold', type: 'button', text: 'Import from X', onclick: () => openLink('x') }),
)

// ---------- layout ----------

const columnCount = () => {
  const w = grid.clientWidth
  return w >= 1000 ? 4 : w >= 700 ? 3 : 2
}

const visible = () => {
  const words = state.q.toLowerCase().split(/\s+/).filter(Boolean)
  return state.memes.filter(m =>
    (state.tab === 'all' || m.type === state.tab) &&
    words.every(w => `${m.title || ''} ${m.description || ''}`.toLowerCase().includes(w)))
}

let lastCols = 0
function render() {
  if (signal.aborted) return
  inView.disconnect()
  const cols = columnCount()
  lastCols = cols
  const columns = Array.from({ length: cols }, () => el('div', { class: 'col' }))
  const heights = new Array(cols).fill(0)
  const place = (node, ratio) => {
    const i = heights.indexOf(Math.min(...heights))
    columns[i].append(node)
    heights[i] += ratio + 0.06
  }

  if (!state.selecting) {
    place(uploadCard(), 0.7)
    place(importCard(), 0.4)
  }

  const list = visible()
  for (const m of list) place(card(m), m.h / m.w)

  grid.replaceChildren(...columns)
  if (state.loaded && !list.length) {
    grid.append(el('p', { class: 'empty', text: state.memes.length ? 'No memes match that' : 'No memes yet. Be the first' }))
  }

  for (const b of tabs.querySelectorAll('button')) b.classList.toggle('on', b.dataset.tab === state.tab)
  renderTeamBar()
}

listen(window, 'resize', () => { if (columnCount() !== lastCols) render() })
listen(tabs, 'click', e => {
  const b = e.target.closest('button')
  if (!b) return
  state.tab = b.dataset.tab
  render()
})
listen(search, 'input', () => { state.q = search.value; render() })

// ---------- viewer ----------

function openViewer(m) {
  const body = viewer.querySelector('.v-body')
  body.replaceChildren(...[
    el('div', { class: 'v-media', style: `--ar:${m.w / m.h}` }, mediaFor(m, true)),
    m.title && el('p', { class: 'v-title', text: m.title }),
    m.description && el('p', { class: 'v-desc', text: m.description }),
    actionsFor(m, true),
  ].filter(Boolean))
  viewer.showModal()
}
listen(viewer, 'close', () => { if (!viewer.open) viewer.querySelector('.v-body').replaceChildren() })

for (const d of [viewer, postModal, linkModal]) {
  listen(d, 'click', e => { if (e.target === d) d.close() })
  listen(d.querySelector('.x-close'), 'click', () => d.close())
}

// ---------- posting ----------

let queue = []
let posting = false

// Camera / screenshot filenames make bad titles; leave those for the title writer
const JUNK_NAME = /^(image|clipboard|blob|link|photo|video|vid)?[\s_.:-]*\d*[\s\d_.:-]*$/i
const nameFrom = file => {
  const base = (file.name || '').replace(/\.\w+$/, '')
  if (!base || JUNK_NAME.test(base) || /^(img|dsc|pxl|mvimg|screen ?shot|screen recording|whatsapp|signal|telegram)\b|^(img|dsc|pxl)_/i.test(base)) return ''
  return base.replace(/[_-]+/g, ' ').trim()
}

function openPost(files, title = '') {
  if (posting) return say('Hang on, still posting')
  const accepted = [...files].filter(f => kindOf(f))
  if (!accepted.length) return say('Only images, GIFs and videos')
  queue = accepted.slice(0, 20).map(file => {
    const kind = kindOf(file)
    const url = URL.createObjectURL(file)
    const label = kind === 'video' ? 'Video' : kind === 'gif' ? 'GIF' : 'Image'
    const status = el('span', { class: 'p-status', text: label })
    const input = el('input', { class: 'p-name', type: 'text', maxlength: '80', placeholder: 'Title', value: title || nameFrom(file), 'aria-label': 'Title' })
    const desc = el('textarea', { class: 'p-desc', rows: '3', maxlength: '200', placeholder: 'Description', 'aria-label': 'Description' })
    const thumb = kind === 'video'
      ? el('video', { src: url, muted: true, playsinline: true, preload: 'metadata' })
      : el('img', { src: url, alt: '' })
    const row = el('li', { class: 'p-row' }, el('div', { class: 'p-thumb' }, thumb), el('div', { class: 'p-info' }, input, desc, status))
    const q = { file, kind, url, row, input, desc, status, label, touched: { input: !!title, desc: false } }
    listen(input, 'input', () => { q.touched.input = true })
    listen(desc, 'input', () => { q.touched.desc = true })
    q.suggesting = suggest(q)
    return q
  })
  postList.replaceChildren(...queue.map(q => q.row))
  postGo.disabled = false
  postGo.textContent = queue.length === 1 ? 'Post meme' : `Post ${queue.length} memes`
  postModal.showModal()
}

// A small JPEG of the first frame, for the title writer
const previewFor = async (file, kind) => {
  let src
  let w
  let h
  if (kind === 'video') {
    const v = el('video', { muted: true, playsinline: true, preload: 'auto' })
    v.muted = true
    v.src = URL.createObjectURL(file)
    await new Promise((resolve, reject) => { v.onloadeddata = resolve; v.onerror = reject; setTimeout(reject, 10000) })
    await new Promise(resolve => { v.onseeked = resolve; v.currentTime = Math.min(0.5, (v.duration || 1) / 2); setTimeout(resolve, 2000) })
    src = v
    w = v.videoWidth
    h = v.videoHeight
  } else {
    src = await createImageBitmap(file)
    w = src.width
    h = src.height
  }
  const s = Math.min(1, 512 / Math.max(w, h))
  const c = el('canvas')
  c.width = Math.round(w * s)
  c.height = Math.round(h * s)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#0b0a08'
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.drawImage(src, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.8)
}

async function suggest(q) {
  q.status.textContent = 'Writing a title…'
  q.row.classList.add('thinking')
  try {
    const image = await previewFor(q.file, q.kind)
    const res = await fetch('/api/describe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ image }) })
    const d = res.ok ? await res.json() : {}
    if (d.title && !q.touched.input) q.input.value = d.title
    if (d.description && !q.touched.desc) q.desc.value = d.description
  } catch {}
  q.row.classList.remove('thinking')
  if (!posting) q.status.textContent = q.label
}

listen(postModal, 'close', () => {
  if (posting) return
  for (const q of queue) URL.revokeObjectURL(q.url)
  queue = []
})
listen(postModal, 'cancel', e => { if (posting) e.preventDefault() })

const send = (pathname, blob, onPct) => upload(pathname, blob, {
  access: 'public',
  handleUploadUrl: '/api/upload',
  contentType: blob.type,
  multipart: blob.size > 8 * 1024 * 1024,
  onUploadProgress: ({ percentage }) => onPct?.(percentage),
})

async function postOne(q) {
  const set = t => { q.status.textContent = t }
  // give the title writer a few seconds to finish before posting
  await Promise.race([q.suggesting, new Promise(r => setTimeout(r, 8000))])
  set(q.kind === 'image' ? 'Sizing for X…' : 'Checking for X…')
  const out = q.kind === 'image' ? await processImage(q.file)
    : q.kind === 'gif' ? await processGif(q.file, set)
      : await processVideo(q.file, set)

  const id = newId()
  const title = cleanTitle(q.input.value)
  const description = cleanDescription(q.desc.value)
  const type = q.kind
  let poster = null
  if (out.poster) poster = (await send(posterPath(id), new File([out.poster], 'p.jpg', { type: 'image/jpeg' }))).url
  const file = new File([out.blob], `m.${out.ext}`, { type: CONTENT[out.ext] })
  const res = await send(memePath({ id, type, w: out.w, h: out.h, title, description, ext: out.ext }), file, p => set(`Uploading ${Math.round(p)}%`))
  set('Live ✓')
  q.row.classList.add('done')
  return { id, type, w: out.w, h: out.h, title, description, ext: out.ext, url: res.url, poster }
}

listen(postGo, 'click', async () => {
  if (posting || !queue.length) return
  posting = true
  postGo.disabled = true
  postGo.textContent = 'Posting…'
  for (const q of queue) { q.input.disabled = true; q.desc.disabled = true }
  let ok = 0
  for (const q of queue) {
    try {
      const meme = await postOne(q)
      state.memes.unshift(meme)
      ok++
      render()
    } catch (e) {
      q.status.textContent = e?.message || 'Upload failed'
      q.row.classList.add('failed')
    }
  }
  posting = false
  if (ok === queue.length) {
    setTimeout(() => postModal.close(), 700)
    say(ok === 1 ? 'Posted. It’s live' : `Posted ${ok} memes`)
  } else {
    postGo.textContent = 'Close'
    postGo.disabled = false
    postGo.onclick = () => { postGo.onclick = null; postModal.close() }
  }
  if (state.tab !== 'all' || state.q) { state.tab = 'all'; state.q = ''; search.value = ''; render() }
})

// files: picker, drag & drop, paste
listen(fileInput, 'change', () => { if (fileInput.files.length) openPost(fileInput.files); fileInput.value = '' })

let dragDepth = 0
const hasFiles = e => [...(e.dataTransfer?.types || [])].includes('Files')
listen(window, 'dragenter', e => { if (hasFiles(e)) { dragDepth++; dropzone.hidden = false } })
listen(window, 'dragleave', e => { if (hasFiles(e) && --dragDepth <= 0) { dragDepth = 0; dropzone.hidden = true } })
listen(window, 'dragover', e => { if (hasFiles(e)) e.preventDefault() })
listen(window, 'drop', e => {
  if (!hasFiles(e)) return
  e.preventDefault()
  dragDepth = 0
  dropzone.hidden = true
  openPost(e.dataTransfer.files)
})

listen(window, 'paste', e => {
  const files = [...(e.clipboardData?.files || [])]
  if (files.length) {
    e.preventDefault()
    if (linkModal.open) linkModal.close()
    openPost(files)
    return
  }
  const text = e.clipboardData?.getData('text')?.trim()
  const typing = e.target.closest?.('input, textarea')
  if (!typing && /^https?:\/\//.test(text || '')) {
    e.preventDefault()
    openLink(/\/\/((www|mobile)\.)?(x|twitter)\.com\//.test(text) ? 'x' : 'url', text)
  }
})

async function pasteButton(e) {
  e.stopPropagation()
  // try the clipboard first (Chrome/Safari ask once); otherwise ask for a link
  try {
    for (const item of await navigator.clipboard.read()) {
      const type = item.types.find(t => /^image\//.test(t))
      if (type) {
        const blob = await item.getType(type)
        return openPost([new File([blob], 'clipboard', { type: blob.type })])
      }
      if (item.types.includes('text/plain')) {
        const text = (await (await item.getType('text/plain')).text()).trim()
        if (/^https?:\/\//.test(text)) return openLink(/\/\/((www|mobile)\.)?(x|twitter)\.com\//.test(text) ? 'x' : 'url', text)
      }
    }
  } catch {}
  openLink('url')
}

// ---------- links (X posts or any image link) ----------

let linkMode = 'url'
function openLink(mode, value = '') {
  linkMode = mode
  linkTitle.textContent = mode === 'x' ? 'Import from X' : 'Paste an image or link'
  linkInput.placeholder = mode === 'x' ? 'https://x.com/…/status/…' : 'Paste an image, image link or X post'
  linkInput.value = value
  linkError.textContent = ''
  linkModal.showModal()
  linkInput.focus()
  if (value) linkForm.requestSubmit()
}

const isXLink = v => /^https?:\/\/((www|mobile)\.)?(x|twitter|fxtwitter|vxtwitter|fixupx)\.com\/[^/]+\/status/.test(v)

listen(linkForm, 'submit', async e => {
  e.preventDefault()
  const value = linkInput.value.trim()
  if (!value) return
  const go = linkForm.querySelector('button[type=submit]')
  go.disabled = true
  linkError.textContent = ''
  go.textContent = isXLink(value) ? 'Importing…' : 'Loading…'
  try {
    if (isXLink(value)) {
      const res = await fetch('/api/import', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: value }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Import failed')
      state.memes.unshift(...data)
      state.tab = 'all'
      render()
      linkModal.close()
      say(data.length === 1 ? 'Imported. It’s live' : `Imported ${data.length} memes`)
    } else {
      if (linkMode === 'x') throw new Error('That’s not an X post link')
      const res = await fetch(`/api/fetch?url=${encodeURIComponent(value)}`)
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Couldn’t load that link')
      const blob = await res.blob()
      const name = decodeURIComponent(new URL(value).pathname.split('/').pop() || '')
      linkModal.close()
      openPost([new File([blob], name || 'link', { type: blob.type })])
    }
  } catch (err) {
    linkError.textContent = err.message
  } finally {
    go.disabled = false
    go.textContent = 'Go'
  }
})

// ---------- team mode (delete only) ----------

const teamBar = $('team-bar')
const teamHint = $('team-hint')
const teamSelect = $('team-select')
const teamDelete = $('team-delete')
const teamModal = $('team-modal')
const teamForm = $('team-form')
const teamCode = $('team-code')
const teamError = $('team-error')

function renderTeamBar() {
  teamBar.hidden = !state.admin
  if (!state.admin) return
  const n = state.selected.size
  teamSelect.textContent = state.selecting ? 'Cancel' : 'Select'
  teamDelete.hidden = !state.selecting
  teamDelete.disabled = !n
  teamDelete.textContent = n ? `Delete ${n}` : 'Delete selected'
  teamHint.textContent = state.selecting ? 'Tap memes to pick them' : 'Tap × on a meme to delete it'
}

function toggleSelect(id) {
  if (state.selected.has(id)) state.selected.delete(id)
  else state.selected.add(id)
  render()
}

function logOut() {
  state.admin = null
  state.selecting = false
  state.selected.clear()
  try { localStorage.removeItem('tonk-ethereum-admin') } catch {}
  render()
}

listen(teamSelect, 'click', () => {
  state.selecting = !state.selecting
  state.selected.clear()
  render()
})
listen(teamDelete, 'click', async () => {
  const ids = [...state.selected]
  if (!ids.length || !confirm(`Delete ${ids.length} meme${ids.length === 1 ? '' : 's'} for everyone?`)) return
  teamDelete.disabled = true
  if (await deleteIds(ids)) {
    state.selecting = false
    render()
    say(`Deleted ${ids.length}`)
  }
})
listen($('team-logout'), 'click', () => { logOut(); say('Logged out') })

const checkCode = async code => {
  const res = await fetch('/api/delete', { method: 'POST', headers: { 'content-type': 'application/json', 'x-admin-key': code }, body: '{"check":true}' }).catch(() => null)
  return res ? (res.ok ? true : (await res.json().catch(() => ({}))).error || 'Wrong passcode') : 'Couldn’t reach the site'
}

const openTeamLogin = () => {
  if (state.admin) return say('Already in team mode')
  teamCode.value = ''
  teamError.textContent = ''
  teamModal.showModal()
  teamCode.focus()
}
listen($('team-link'), 'click', openTeamLogin)
listen(teamModal, 'click', e => { if (e.target === teamModal) teamModal.close() })
listen(teamModal.querySelector('.x-close'), 'click', () => teamModal.close())
listen(teamForm, 'submit', async e => {
  e.preventDefault()
  const code = teamCode.value.trim()
  if (!code) return
  const result = await checkCode(code)
  if (result !== true) { teamError.textContent = result; return }
  state.admin = code
  try { localStorage.setItem('tonk-ethereum-admin', code) } catch {}
  teamModal.close()
  render()
  say('Team mode on')
})

try { state.admin = localStorage.getItem('tonk-ethereum-admin') } catch {}
if (state.admin) checkCode(state.admin).then(ok => { if (ok !== true) logOut() })
signal.addEventListener('abort', () => {
  inView.disconnect()
  clearTimeout(toastTimer)
  for (const q of queue) URL.revokeObjectURL(q.url)
  for (const dialog of [viewer, postModal, linkModal, teamModal]) if (dialog.open) dialog.close()
}, { once: true })

if (new URLSearchParams(location.search).has('admin')) {
  history.replaceState(null, '', location.pathname + location.hash)
  openTeamLogin()
}

// ---------- load ----------

render()
try {
  let list
  try {
    const res = await fetch('/api/memes', { cache: 'no-store' })
    if (!res.ok) throw new Error('No gallery API')
    list = await res.json()
    if (!Array.isArray(list)) throw new Error('Not a gallery')
  } catch {
    const res = await fetch('/data/memes.json')
    if (!res.ok) throw new Error('Missing gallery snapshot')
    list = await res.json()
  }
  state.memes = list
} catch {
  say('Memes failed to load')
}
state.loaded = true
render()

}
