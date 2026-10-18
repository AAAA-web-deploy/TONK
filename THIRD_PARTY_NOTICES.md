# Source and dependency notices

- TONK reference frontend and original media: https://tonkfun.lol/ (public browser source captured during this request), plus the user's `Assets.rar`. The source capture and per-file origins are recorded under `reference/`.
- The custom Ethereum logo was supplied in the user's archive.
- Fonts are distributed with their original licenses under `public/fonts/`. Google Fonts source: https://github.com/google/fonts.
- FFmpeg browser wrapper source: https://github.com/ffmpegwasm/ffmpeg.wasm. FFmpeg core version 0.12.10 was obtained from the same public CDN version used by the reference site: https://www.npmjs.com/package/@ffmpeg/core/v/0.12.10. Upstream source and build scripts: https://github.com/ffmpegwasm/ffmpeg.wasm/tree/main/packages/core. FFmpeg source: https://ffmpeg.org/download.html.
- The original Vercel Blob client is retained with the original source snapshot for reference. The working copy uses `src/lib/client/local-upload.js` and does not use the original storage service.
- The optional local server and packaging helpers were created for this package and do not contain the source site's server implementation or credentials.
- Uniswap URL parameter reference: https://developers.uniswap.org/docs/trading/custom-interface-links and https://developers.uniswap.org/docs/trading/embed-app.

- The Next.js implementation retains the original gallery behavior inside a lifecycle-managed React component. App Router, React and TypeScript dependency versions are pinned in package.json and package-lock.json.
