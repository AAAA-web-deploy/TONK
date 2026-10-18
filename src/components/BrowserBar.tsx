'use client'

import { useEffect, useRef, useState } from 'react'
import { siteConfig } from '@/config/site'

export function BrowserBar() {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const root = document.documentElement
    if (!root.classList.contains('has-dollar')) {
      const id = setTimeout(() => {
        root.classList.add('has-dollar')
        try { sessionStorage.setItem('tonk-dollar', '1') } catch {}
      }, 500)
      return () => clearTimeout(id)
    }
  }, [])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  async function copy(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    try {
      await navigator.clipboard.writeText(siteConfig.siteUrl || new URL('/', location.href).href)
      setCopied(true)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 1200)
    } catch { location.href = siteConfig.siteUrl || '/' }
  }
  return (
    <header className="bar"><div className="omnibox">
      <svg className="lock" viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2h.5A1.5 1.5 0 0 1 13.5 8.5v5A1.5 1.5 0 0 1 12 15H4a1.5 1.5 0 0 1-1.5-1.5V8.5A1.5 1.5 0 0 1 4 7h.5Zm1.5 0h4V5a2 2 0 1 0-4 0v2Z" /></svg>
      <a className={`url${copied ? ' copied' : ''}`} id="url" href={siteConfig.siteUrl || '/'} onClick={copy}><span className="dollar" id="dollar">$</span>{siteConfig.addressBarLabel}</a>
      <button className="reload" id="reload" type="button" aria-label="Reload" onClick={() => location.reload()}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13.6 3.2v3.6H10l1.4-1.4A4.5 4.5 0 1 0 12.5 9h1.6a6 6 0 1 1-1.6-4.9l1.1-.9Z" /></svg></button>
    </div></header>
  )
}
