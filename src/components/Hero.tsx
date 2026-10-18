'use client'

import { useEffect, useRef, useState } from 'react'
import { Brand } from './Brand'
import { siteConfig } from '@/config/site'
import { validContract, tradeLink } from '@/lib/shared/token-settings.mjs'

export function Hero() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [copyLabel, setCopyLabel] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contract = validContract(siteConfig.token.contractAddress) ? siteConfig.token.contractAddress.trim() : ''
  const href = tradeLink(siteConfig.token) || undefined
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  async function copyContract() {
    if (!contract) return
    try { await navigator.clipboard.writeText(contract); setCopyLabel('Copied') }
    catch { setCopyLabel('Copy failed, select it instead') }
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopyLabel(''), 1500)
  }
  return (
    <section className="hero" id="home">
      <nav className="nav" aria-label="Main">
        <Brand />
        <div className={`nav-links${menuOpen ? ' open' : ''}`} id="nav-links" onClick={() => setMenuOpen(false)}>
          <a href="#home">Home</a><a href="#meet">Meet TONK</a><a href="#world">TONK World</a><a href="#memes">Meme Depot</a>
        </div>
        <a className={`btn-rough nav-trade js-trade${href ? '' : ' off'}`} href={href} aria-disabled={!href} target="_blank" rel="noopener">{href ? 'Trade' : 'Trade soon'}</a>
        <button className="nav-menu" id="nav-menu" type="button" aria-label="Menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)}><span /><span /><span /></button>
      </nav>
      <div className="hero-inner">
        <div className="hero-copy">
          <p className="eyebrow">{siteConfig.hero.eyebrow}</p>
          <h1 className="headline gold-text">{siteConfig.hero.headline[0]}<br /><span>{siteConfig.hero.headline[1]}</span></h1>
          <div className="story">
            <p>He thinks he’s <b>STONK</b>.</p><p>He’s not.</p><p>Everyone calls him <b>$TONK</b></p><p>Some even call him tiny <b>$TONK</b></p><p>He fucking hates that.</p>
          </div>
          <div className="hero-cta">
            <a className="btn-rough" href="#meet">Meet TONK <span aria-hidden="true">→</span></a>
            <a className="btn-rough dark" href="#memes">Meme Depot <span aria-hidden="true">→</span></a>
          </div>
        </div>
        <div className="hero-art" role="img" aria-label={siteConfig.hero.artLabel} />
        <aside className="hero-side"><div className="contract">
          <h2>Contract</h2>
          <button className="ca" id="ca" type="button" disabled={!contract} onClick={copyContract}>
            <span className="ca-value" id="ca-value">{copyLabel || contract || 'Coming soon'}</span>
            <span className="ca-copy" id="ca-copy" hidden={!contract}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 2h7a2 2 0 0 1 2 2v7h-1.5V4a.5.5 0 0 0-.5-.5H5V2Zm-2 3h7a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm.5 1.5v7h6v-7h-6Z" /></svg></span>
          </button>
          <a className={`btn-rough js-trade${href ? '' : ' off'}`} id="trade" href={href} aria-disabled={!href} target="_blank" rel="noopener">{href ? 'Trade' : 'Trade (soon)'}</a>
          <p className="note">{contract ? 'Ethereum mainnet. Only trust the address posted here.' : 'No contract is live yet. Only trust the address posted here.'}</p>
        </div></aside>
      </div>
    </section>
  )
}
