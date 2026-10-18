'use client'

import { useRef, useState } from 'react'
import { siteConfig } from '@/config/site'

export function WorldSection() {
  const video = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  return <section className="world" id="world">
    <div className="world-head"><h2 className="section-title gold-text">TONK World</h2><span className="stamp">Coming soon</span></div>
    <div className="episode"><p className="episode-label">Episode 01 · Teaser</p><div className="player">
      <video id="teaser" ref={video} src={siteConfig.world.video} poster={siteConfig.world.poster} preload="none" playsInline controls onPlay={() => setPlaying(true)} onEnded={() => setPlaying(false)} />
      <button className="play" id="play" type="button" aria-label="Play the teaser" hidden={playing} onClick={() => video.current?.play().catch(() => {})}><span /></button>
    </div></div>
  </section>
}
