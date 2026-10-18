# TONK project instructions

- Stack: real Next.js App Router, React and TypeScript. Keep the pinned dependencies and lockfile.
- Scope: preserve the TONK reference design; only the logo, Ethereum CA, own domain and corresponding trade link are intended customizations.
- The authoritative stylesheet is `src/app/globals.css`; it matches `reference/original-public-source/style.css` exactly. Do not apply a design system, CSS reset or Tailwind migration.
- Use the bundled media and fonts. Keep all supplied-file hashes intact.
- Native React components own the page structure. The original imperative gallery is an isolated client component with AbortSignal cleanup; preserve that boundary and portal timing.
- CA/logo/domain settings are in `src/config/site.ts` and `.env.local`. An empty CA is deliberate. Never invent a CA or reuse the source Solana address.
- Backend changes must remain within this project. Never connect mutations to the reference site's APIs. Preserve the private `TONK_ADMIN_KEY` boundary.
- Local/server storage is filesystem-backed. Do not claim it is durable on a serverless host without adding an actual durable adapter.
- Required checks: `npm run verify`, `npm test`, `npm run typecheck`, `npm run build`.
- Browser QA is distinct from those checks. Do not claim pixel-perfect matching without testing the same viewport, browser, zoom and loaded fonts.
- This deliverable is local-only. Do not publish or deploy unless the user requests it.
