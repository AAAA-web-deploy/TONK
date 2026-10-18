# TONK — Next.js codebase

A complete Next.js App Router project prepared from the actual TONK browser source and the assets supplied in this chat. The original stylesheet is preserved byte-for-byte. The page is implemented with Next.js/React components, with the original gallery behavior mounted in a React component that cleans up its event listeners on unmount and in Strict Mode.

Your supplied Ethereum logo is included. The Ethereum CA is intentionally blank until you provide it. The original hero, story, six reactions, teaser, gallery artwork and visible copy are retained.

## Run in Cursor

Use Node.js **20.9 or newer** (Node.js 22 LTS is a suitable default).

1. Extract the ZIP completely and open the inner `TONK_NextJS` folder in Cursor. `package.json` must be visible at the workspace root.
2. Install the pinned dependencies:

```sh
npm ci
```

3. Copy `.env.example` to `.env.local`, then edit it. On Windows Command Prompt:

```bat
copy .env.example .env.local
```

4. Start Next.js:

```sh
npm run dev
```

5. Open http://127.0.0.1:3000.

On Windows, `START_WINDOWS.cmd` performs the initial install and launches the development server. Internet access is needed for the first npm install; the artwork, videos, fonts and FFmpeg files are already included.

## Your contract address and logo

Set these values in `.env.local`:

```dotenv
NEXT_PUBLIC_TOKEN_CA=YOUR_ACTUAL_0x_ETHEREUM_ADDRESS
NEXT_PUBLIC_SITE_URL=https://YOUR-DOMAIN/
NEXT_PUBLIC_ADDRESS_BAR_LABEL=YOUR-DOMAIN
NEXT_PUBLIC_LOGO_MODE=image
```

The package itself leaves `NEXT_PUBLIC_TOKEN_CA` empty. Empty, malformed, all-zero and Solana addresses do not enable trading. A valid Ethereum address is used by both CA copying and the Ethereum Uniswap link. You can optionally set `NEXT_PUBLIC_TRADE_URL` to your own HTTPS swap link.

`public/img/logo.png` is the exact logo you supplied. In image mode, it occupies the original text wordmark's box; a hidden text spacer preserves the original responsive width. Set `NEXT_PUBLIC_LOGO_MODE=wordmark` to restore the reference's exact `$TONK` text logo. This mode is also useful for visual comparison.

Public environment values are compiled into the client bundle. Restart the development server after changing them, and rebuild before production deployment. Set `TONK_ADMIN_KEY` to your own private team passcode if you want team deletion. Never use `NEXT_PUBLIC_` for that private passcode.

## Editing map

| File or directory | What to edit |
| --- | --- |
| `src/config/site.ts` | Token settings, logo mode, domain, hero heading and main media paths. |
| `src/components/Hero.tsx` | Original story, navigation, hero buttons and contract card. |
| `src/components/MeetSection.tsx` | Six reaction-image cards. |
| `src/components/WorldSection.tsx` | Teaser section and playback button. |
| `src/components/MemeDepot.tsx` | Gallery/overlay React markup and lifecycle boundary. |
| `src/lib/client/gallery-controller.js` | Original gallery layout, filtering, search, viewer, sharing, uploads and team controls. |
| `src/lib/client/process.js` | Original client media processing, using local FFmpeg dependencies. |
| `src/app/globals.css` | Actual original stylesheet, including textures and every responsive breakpoint. |
| `src/app/overrides.css` | Only the custom-logo positioning. |
| `public/data/memes.json` | All 19 captured gallery records, in their original order. |
| `public/img/`, `public/media/`, `public/video/` | All images, videos and posters. |
| `public/fonts/` | All 11 font files for the original four font families. |
| `public/vendor/ffmpeg/` | Browser wrapper, core JavaScript, 32 MB WASM binary and license notices. |
| `src/lib/server/gallery-handler.mjs` | Independent filesystem gallery backend. |
| `src/app/api/[...path]/route.ts` | Next.js gallery API entry points. |
| `src/app/uploads/[name]/route.ts` | Uploaded-media delivery with video byte-range support. |
| `reference/` | Original public source, source URLs, original-file mapping and checks. |

All 23 files from your supplied archive are retained byte-for-byte. Long gallery filenames were shortened for Windows extraction; the original filenames and SHA-256 hashes remain in `reference/uploaded-file-map.json`. The project contains 32 images, three videos and 11 font files.

## Commands

```sh
npm run verify       # asset coverage, supplied-file hashes and original CSS identity
npm test             # token configuration and gallery API behavior
npm run typecheck    # TypeScript
npm run build        # optimized Next.js production build
npm start            # production server after a build
```

`npm start` binds to localhost by default. Use `npx next start --hostname 0.0.0.0` on your own production host, or use the included Dockerfile. Webpack is selected explicitly so the local browser FFmpeg module can retain its dynamic import without bundling its 32 MB binary into application JavaScript.

## Gallery APIs and persistence

| Route | Behavior |
| --- | --- |
| `GET /api/memes` | Captured gallery plus this project's saved uploads/deletions. |
| `POST /api/upload` | Processed image/GIF/video upload to this project's storage. |
| `POST /api/delete` | Team-passcode check and protected deletion. |
| `GET /uploads/:name` | Saved media, including byte-range requests. |
| `POST /api/describe` | Returns no automatic description until an independent AI service is connected. Manual titles/descriptions work. |
| `POST /api/import`, `GET /api/fetch` | Clearly report that external-link imports are not connected. Uploading local files works. |

Uploads are enabled in development by default. `.env.example` explicitly enables them; set `UPLOADS_ENABLED=false` for a read-only gallery. Production defaults to read-only if this variable is absent.

The filesystem backend stores changes under `TONK_DATA_DIR` (default `.data/`). It is designed for one Node.js instance with a writable, persistent disk. The included Dockerfile uses `/data`; mount a persistent volume there. Serverless hosts need a durable storage adapter before enabling shared uploads. Keep the server passcode out of the browser.

The source site's private backend, storage credentials, X importer and AI title service cannot be downloaded from its public page. This project does not call those private services or send writes to the original TONK site. Those external integrations require your own service implementation and credentials.

## Docker deployment option

Supply public settings at image build time:

```sh
docker build --build-arg NEXT_PUBLIC_TOKEN_CA=YOUR_CA --build-arg NEXT_PUBLIC_SITE_URL=https://YOUR-DOMAIN/ -t tonk-nextjs .
docker run --env-file .env.local -e TONK_DATA_DIR=/data -v tonk-data:/data -p 3000:3000 tonk-nextjs
```

The Dockerfile and container deployment were not executed in this environment. The Next.js production build itself was checked. Do not set `output: 'export'` while retaining the upload API routes.

## Matching scope

The live reference stylesheet and gallery metadata were checked again during this request and match the captured versions. The code preserves their layout rules and media. The Ethereum CA/logo and Ethereum swap destination are the intended substitutions.

The delivered project was checked with the production build, TypeScript, asset checks and focused API tests. Browser rendering and a pixel-by-pixel comparison were not available here. Before calling the deployed result pixel-identical, compare the reference and this app in the same browser, viewport, zoom and font-loading state. Check desktop and mobile, gallery filters, video seeking, clipboard permissions and transcoding.

`CURSOR_PROMPT.md` and `AGENTS.md` tell Cursor to maintain these constraints. The ZIP excludes generated dependency/build directories; `npm ci` restores the exact locked dependency versions.
