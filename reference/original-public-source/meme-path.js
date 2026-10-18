// Shared by the browser and the API. Each meme's metadata lives in its Blob
// pathname, so listing the store is enough to build the gallery (no database):
//   m/<id>~<type>~<w>x<h>~<base64url title>[~<base64url description>].<ext>   the meme
//   p/<id>.jpg                                       poster frame for videos

export const TYPES = { image: ['jpg', 'png'], gif: ['gif', 'mp4'], video: ['mp4'] }
export const CONTENT = { jpg: 'image/jpeg', png: 'image/png', gif: 'image/gif', mp4: 'video/mp4' }
// X's own upload limits (images 5 MB, GIFs 15 MB); videos capped lower than X's 512 MB to keep storage sane
export const LIMITS = { image: 5 * 1024 * 1024, gif: 15 * 1024 * 1024, video: 100 * 1024 * 1024, poster: 1024 * 1024 }

const enc = new TextEncoder()
const b64 = s => btoa(String.fromCharCode(...enc.encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const unb64 = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)))

// Newest first when sorted: inverted timestamp + a little randomness
export const newId = () => (1e13 - Date.now()).toString(36).padStart(9, '0') + Math.random().toString(36).slice(2, 6).padEnd(4, '0')

const clean = (t, maxBytes) => {
  let s = String(t || '').replace(/[\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim()
  while (enc.encode(s).length > maxBytes) s = s.slice(0, -1)
  return s
}
export const cleanTitle = t => clean(t, 120)
export const cleanDescription = t => clean(t, 300)

export const memePath = ({ id, type, w, h, title, description, ext }) => {
  const d = cleanDescription(description)
  return `m/${id}~${type}~${w}x${h}~${b64(cleanTitle(title))}${d ? `~${b64(d)}` : ''}.${ext}`
}

export const posterPath = id => `p/${id}.jpg`
export const POSTER_RE = /^p\/([0-9a-z]{13})\.jpg$/

const MEME_RE = /^m\/([0-9a-z]{13})~(image|gif|video)~(\d{1,5})x(\d{1,5})~([A-Za-z0-9_-]{0,200})(?:~([A-Za-z0-9_-]{1,400}))?\.(jpg|png|gif|mp4)$/

export const parseMemePath = p => {
  const m = MEME_RE.exec(p)
  if (!m) return null
  const [, id, type, w, h, t, d, ext] = m
  if (!TYPES[type].includes(ext) || +w < 1 || +h < 1) return null
  let title
  let description = ''
  try {
    title = unb64(t)
    if (d) description = unb64(d)
  } catch { return null }
  return { id, type, w: +w, h: +h, title, description, ext }
}
