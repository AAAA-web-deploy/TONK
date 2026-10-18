'use client'

import { useEffect } from 'react'
import { apiOrigin, apiUrl } from '@/lib/client/analytics-origin'

const CLICKS = new Set(['buy', 'chart', 'gmgn', 'x'])
let pageViewSent = false

function trackingRefused(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean; doNotTrack?: string | null }
  if (nav.globalPrivacyControl) return true
  const dnt = nav.doNotTrack || (window as Window & { doNotTrack?: string }).doNotTrack
  return dnt === '1' || dnt === 'yes'
}

function isDashboard(): boolean {
  const path = window.location.pathname.replace(/\/+$/, '')
  return path === '/dashboard' || path.endsWith('/dashboard')
}

function endpoint(route: string): string {
  if (isDashboard() || trackingRefused()) return ''
  const origin = apiOrigin()
  if (origin) return apiUrl(route)
  const host = window.location.hostname.toLowerCase()
  if (host === 'localhost' || host === '127.0.0.1') return route
  return ''
}

export function VisitorTracker() {
  useEffect(() => {
    if (!endpoint('/api/analytics/collect')) return
    let section = (window.location.hash || '#home').replace('#', '') || 'home'
    const utm = new URLSearchParams(window.location.search)
    const payload = (type: string, eventId: string, click?: string) => ({
      type,
      eventId,
      path: `${window.location.pathname}${window.location.search}`,
      section,
      referrer: document.referrer,
      click,
      utmSource: utm.get('utm_source') || undefined,
      utmMedium: utm.get('utm_medium') || undefined,
      utmCampaign: utm.get('utm_campaign') || undefined,
    })
    const post = (route: string, body: Record<string, unknown>) => {
      const url = endpoint(route)
      if (!url) return Promise.resolve(false)
      return fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(body),
        credentials: apiOrigin() ? 'include' : 'same-origin',
        cache: 'no-store',
        keepalive: true,
      }).then(response => response.ok).catch(() => false)
    }

    if (!pageViewSent) {
      pageViewSent = true
      const pageEventId = crypto.randomUUID()
      void post('/api/analytics/collect', payload('pageview', pageEventId)).then(ok => {
        if (!ok) void post('/api/analytics/collect', payload('pageview', pageEventId))
      })
    }

    let heartbeatId = crypto.randomUUID()
    let timer = 0
    const beat = () => {
      if (document.visibilityState !== 'visible') return
      const id = heartbeatId
      void post('/api/analytics/heartbeat', payload('heartbeat', id)).then(ok => {
        if (ok) heartbeatId = crypto.randomUUID()
      })
    }
    const arm = () => {
      window.clearInterval(timer)
      if (document.visibilityState !== 'visible') return
      timer = window.setInterval(beat, 30000)
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        beat()
        arm()
      } else window.clearInterval(timer)
    }
    const onClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const link = target.closest('[data-link-role]')
      const role = link?.getAttribute('data-link-role') || ''
      if (!link || link.getAttribute('aria-disabled') === 'true' || !CLICKS.has(role)) return
      void post('/api/analytics/collect', payload('click', crypto.randomUUID(), role))
    }
    const sections = document.querySelectorAll('main section[id]')
    const observer = 'IntersectionObserver' in window
      ? new IntersectionObserver(entries => {
        const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        const next = visible[0]?.target?.id
        if (!next || next === section) return
        section = next
        void post('/api/analytics/collect', payload('section', crypto.randomUUID()))
      }, { threshold: [0.35] })
      : null
    sections.forEach(sectionNode => observer?.observe(sectionNode))
    document.addEventListener('visibilitychange', onVisibility)
    document.addEventListener('click', onClick)
    if (document.visibilityState === 'visible') arm()
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
      document.removeEventListener('click', onClick)
      observer?.disconnect()
    }
  }, [])
  return null
}
