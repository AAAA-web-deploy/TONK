export const HOSTED_API = 'https://tonk.103.161.35.238.sslip.io'

export function apiOrigin() {
  if (typeof location === 'undefined') return ''
  const host = location.hostname.toLowerCase()
  if (host === 'localhost' || host === '127.0.0.1') return ''
  const hosted = String(HOSTED_API || '').replace(/\/$/, '')
  if (!hosted) return ''
  try {
    if (new URL(hosted).host.toLowerCase() === host) return ''
  } catch {
    return ''
  }
  return hosted
}

export function apiUrl(path) {
  return `${apiOrigin()}${path}`
}
