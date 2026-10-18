'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

/** Original gallery renderer in an isolated, lifecycle-managed React component. */
export function MemeDepot() {
  const [portalsReady, setPortalsReady] = useState(false)
  useEffect(() => { setPortalsReady(true) }, [])
  useEffect(() => {
    if (!portalsReady) return
    const controller = new AbortController()
    import('@/lib/client/gallery-controller.js').then(async ({ mountGallery }) => {
      if (!controller.signal.aborted) await mountGallery(controller.signal)
    }).catch(error => {
      if (!controller.signal.aborted) {
        console.error('Gallery initialization failed', error)
        const toast = document.getElementById('toast')
        if (toast) { toast.textContent = 'Memes failed to load'; toast.hidden = false }
      }
    })
    return () => controller.abort()
  }, [portalsReady])
  return <>
<section className="memes" id="memes">
      <div className="depot-head">
        <h2 className="section-title gold-text">Meme Depot</h2>
      </div>
      <div className="team-bar" id="team-bar" hidden>
        <span className="team-label">Team mode</span>
        <span className="team-hint" id="team-hint">Tap × on a meme to delete it</span>
        <span className="team-actions">
          <button className="act" id="team-select" type="button">Select</button>
          <button className="act danger" id="team-delete" type="button" hidden>Delete selected</button>
          <button className="act" id="team-logout" type="button">Log out</button>
        </span>
      </div>
      <div className="depot-bar">
        <div className="tabs" id="tabs" role="tablist">
          <button type="button" data-tab="all" className="on">All</button>
          <button type="button" data-tab="gif">GIFs</button>
          <button type="button" data-tab="image">Images</button>
          <button type="button" data-tab="video">Videos</button>
        </div>
        <label className="search">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M7 1.5a5.5 5.5 0 0 1 4.38 8.83l3.15 3.14-1.06 1.06-3.14-3.15A5.5 5.5 0 1 1 7 1.5Zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"></path></svg>
          <input id="search" type="search" placeholder="Search memes" autoComplete="off" aria-label="Search memes" />
        </label>
      </div>
      <div className="masonry" id="grid"></div>
      <input type="file" id="file-input" accept="image/png,image/jpeg,image/webp,image/avif,image/gif,video/mp4,video/quicktime,video/webm" multiple hidden />
    </section>
{portalsReady && createPortal(<><div className="dropzone" id="dropzone" hidden><p>Drop to post</p></div>

  <dialog className="modal viewer" id="viewer">
    <button className="x-close" type="button" aria-label="Close">×</button>
    <div className="v-body"></div>
  </dialog>

  <dialog className="modal" id="post-modal">
    <button className="x-close" type="button" aria-label="Close">×</button>
    <h3>Post memes</h3>
    <p className="modal-sub">We fill in a title and description. Edit them before posting</p>
    <ul className="post-list" id="post-list"></ul>
    <button className="btn-gold big" id="post-go" type="button">Post meme</button>
  </dialog>

  <dialog className="modal" id="link-modal">
    <button className="x-close" type="button" aria-label="Close">×</button>
    <h3 id="link-title">Paste an image or link</h3>
    <form id="link-form" className="link-form">
      <input id="link-input" type="url" inputMode="url" autoComplete="off" required />
      <button className="btn-gold" type="submit">Go</button>
    </form>
    <p className="link-error" id="link-error" role="alert"></p>
  </dialog>

  <dialog className="modal" id="team-modal">
    <button className="x-close" type="button" aria-label="Close">×</button>
    <h3>Team login</h3>
    <p className="modal-sub">For deleting memes from the depot</p>
    <form id="team-form" className="link-form">
      <input id="team-code" type="password" autoComplete="current-password" placeholder="Passcode" required />
      <button className="btn-gold" type="submit">Log in</button>
    </form>
    <p className="link-error" id="team-error" role="alert"></p>
  </dialog>

  <div className="toast" id="toast" role="status" hidden></div></>, document.body)}
</>
}
