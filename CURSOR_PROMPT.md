# Paste this into Cursor

This is my TONK website codebase. Use the existing Next.js App Router and TypeScript project. My reference is https://tonkfun.lol/. I want the existing site reproduced with the same visible design and behavior, changing only my logo, Ethereum contract address and Ethereum trade destination.

Read `README.md`, `AGENTS.md`, `src/config/site.ts`, and `reference/verification.json` before editing. Install with `npm ci`, copy `.env.example` to `.env.local` if needed, and run `npm run dev`.

Constraints:

1. Preserve `src/app/globals.css` byte-for-byte unless a measured browser comparison proves a specific mismatch. It is the actual reference stylesheet. Use `src/app/overrides.css` only for the requested logo substitution or a narrowly justified Next.js integration fix.
2. Preserve the original typography, golden text texture, parchment edges, hero gradients/position, section spacing, six reaction cards, teaser frame, gallery ordering, masonry columns, modal styling and mobile breakpoints. Do not redesign the page, add sections, rewrite the story, or replace supplied artwork.
3. Keep all 32 images, three videos, 11 fonts and the local FFmpeg dependencies. All 23 files from my supplied archive are mapped and hashed in `reference/uploaded-file-map.json`.
4. My logo is `public/img/logo.png`. `NEXT_PUBLIC_LOGO_MODE=image` uses it while retaining the original logo box width. `wordmark` restores the exact reference wordmark for comparison.
5. I will provide my Ethereum CA. Set it through `NEXT_PUBLIC_TOKEN_CA` or `src/config/site.ts`; leave it empty until provided. Never use the reference's Solana mint or invent an address. Preserve the Ethereum-only CA validation and Uniswap link.
6. Keep the gallery renderer isolated in `MemeDepot.tsx` and `src/lib/client/gallery-controller.js`. Preserve its AbortSignal listener cleanup so React Strict Mode does not duplicate handlers. Mount overlay dialogs outside `<main>` through the existing portal.
7. Use this project's Next.js API routes and storage only. The filesystem backend needs persistent storage in production. X imports, arbitrary image-link imports and AI descriptions require independent configured services; do not claim that the original private services were recovered.
8. Verify desktop at 1440 and 1920 pixels and mobile at 390 pixels, with equal viewport/zoom on the reference. Compare after the local fonts load. Check navigation, logo box, hero artwork, CA copying, trade links, six expressions, teaser play/seek, filters/search, viewer, copy/download, uploads and team deletion.
9. Run `npm run verify`, `npm test`, `npm run typecheck`, and `npm run build`. Report browser checks separately from build/API checks. Never claim pixel equality without browser comparison.
10. Keep changes local and do not deploy until I request deployment. Return precise changes and remaining configuration requirements.

Start from this codebase; do not replace it with a starter template or migrate to another framework.
