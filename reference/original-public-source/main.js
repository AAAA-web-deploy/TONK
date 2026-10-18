// Fill in the contract address at launch. Empty = "coming soon" everywhere.
const CA = '3dpsiabfinr98Q4yBJ42TvrPcbHubdvxAWaCnTm2Vjrh'
// Trade buttons open Jupiter with SOL -> $TONK filled in (the /swap/SOL-<mint> form drops the token)
const SOL = 'So11111111111111111111111111111111111111112'
const TRADE_URL = CA ? `https://jup.ag/swap?sell=${SOL}&buy=${CA}` : ''

const root = document.documentElement
if (!root.classList.contains('has-dollar')) {
  setTimeout(() => {
    root.classList.add('has-dollar')
    try { sessionStorage.setItem('tonk-dollar', '1') } catch {}
  }, 500)
}

const url = document.getElementById('url')
url.addEventListener('click', async e => {
  e.preventDefault()
  try {
    await navigator.clipboard.writeText('https://tonkfun.lol')
    url.classList.add('copied')
    setTimeout(() => url.classList.remove('copied'), 1200)
  } catch {
    location.href = url.href
  }
})
document.getElementById('reload').addEventListener('click', () => location.reload())

const caBtn = document.getElementById('ca')
const caValue = document.getElementById('ca-value')
const caCopy = document.getElementById('ca-copy')

if (CA) {
  caValue.textContent = CA
  caBtn.disabled = false
  caCopy.hidden = false
  caBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(CA)
      caValue.textContent = 'Copied'
      setTimeout(() => { caValue.textContent = CA }, 1500)
    } catch {
      caValue.textContent = 'Copy failed, select it instead'
    }
  })
}

if (TRADE_URL) {
  for (const a of document.querySelectorAll('.js-trade')) {
    a.href = TRADE_URL
    a.textContent = 'Trade'
    a.classList.remove('off')
  }
}

// phone menu
const menu = document.getElementById('nav-menu')
const links = document.getElementById('nav-links')
menu.addEventListener('click', () => {
  const open = links.classList.toggle('open')
  menu.setAttribute('aria-expanded', open)
})
links.addEventListener('click', e => {
  if (e.target.closest('a')) { links.classList.remove('open'); menu.setAttribute('aria-expanded', false) }
})

// teaser: big play button over the poster, native controls after
const teaser = document.getElementById('teaser')
const play = document.getElementById('play')
play.addEventListener('click', () => { teaser.play().catch(() => {}) })
teaser.addEventListener('play', () => { play.hidden = true })
teaser.addEventListener('ended', () => { play.hidden = false })

import './gallery.js'
