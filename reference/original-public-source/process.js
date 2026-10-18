// Makes every upload X-ready before it's stored:
//   images  JPEG/PNG <= 5 MB, long side <= 2048, shape kept inside what X shows uncropped
//   GIFs    <= 15 MB and <= 1280x1080, shrunk with ffmpeg.wasm when bigger
//   videos  MP4 (H.264 + AAC), <= 2:20, <= 1920x1200, transcoded when needed
import { LIMITS } from '/meme-path.js'

const MAX_SIDE = 2048
const MIN_RATIO = 4 / 5 // tallest X shows uncropped
const MAX_RATIO = 2 // widest
const BG = '#0b0a08'

export const kindOf = file => {
  if (file.type === 'image/gif') return 'gif'
  if (/^image\/(png|jpeg|webp|avif)$/.test(file.type)) return 'image'
  if (/^video\//.test(file.type)) return 'video'
  return null
}

const toBlob = (canvas, type, quality) => new Promise((resolve, reject) =>
  canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Couldn’t process that image'))), type, quality))

export async function processImage(file) {
  const bmp = await createImageBitmap(file).catch(() => { throw new Error('Couldn’t read that image') })
  const { width: w, height: h } = bmp
  let cw = w
  let ch = h
  if (w / h < MIN_RATIO) cw = Math.round(h * MIN_RATIO)
  else if (w / h > MAX_RATIO) ch = Math.round(w / MAX_RATIO)
  const padded = cw !== w || ch !== h
  const scale = Math.min(1, MAX_SIDE / Math.max(cw, ch))
  const W = Math.round(cw * scale)
  const H = Math.round(ch * scale)

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'

  const draw = () => {
    if (padded) {
      // fill the extra space with a blurred, darkened copy so nothing gets cropped on X
      const cover = Math.max(W / w, H / h)
      ctx.filter = 'blur(40px) brightness(0.45)'
      ctx.drawImage(bmp, (W - w * cover) / 2, (H - h * cover) / 2, w * cover, h * cover)
      ctx.filter = 'none'
    }
    ctx.drawImage(bmp, (W - w * scale) / 2, (H - h * scale) / 2, w * scale, h * scale)
  }

  if (file.type === 'image/png' && !padded) {
    draw()
    const png = await toBlob(canvas, 'image/png')
    if (png.size <= LIMITS.image) return { blob: png, ext: 'png', w: W, h: H }
    ctx.clearRect(0, 0, W, H)
  }

  ctx.fillStyle = BG
  ctx.fillRect(0, 0, W, H)
  draw()
  for (const q of [0.92, 0.85, 0.75, 0.6, 0.45]) {
    const jpg = await toBlob(canvas, 'image/jpeg', q)
    if (jpg.size <= LIMITS.image) return { blob: jpg, ext: 'jpg', w: W, h: H }
  }
  throw new Error('That image is too big even after shrinking')
}

let ffmpegReady
const loadFFmpeg = () => (ffmpegReady ||= (async () => {
  const { FFmpeg } = await import('/vendor/ffmpeg/index.js')
  const ff = new FFmpeg()
  const base = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm'
  const blobURL = async (url, type) => {
    const res = await fetch(url)
    if (!res.ok) throw new Error('Couldn’t load the video tools')
    return URL.createObjectURL(new Blob([await res.arrayBuffer()], { type }))
  }
  await ff.load({
    coreURL: await blobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await blobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
  })
  return ff
})().catch(e => { ffmpegReady = null; throw e }))

const runFFmpeg = async (input, args, output, onProgress) => {
  const ff = await loadFFmpeg()
  const progress = ({ progress }) => onProgress?.(Math.max(0, Math.min(1, progress)))
  ff.on('progress', progress)
  try {
    await ff.writeFile('in', new Uint8Array(await input.arrayBuffer()))
    const code = await ff.exec(['-i', 'in', ...args, output])
    if (code !== 0) throw new Error('Couldn’t convert that file')
    return await ff.readFile(output)
  } finally {
    ff.off('progress', progress)
    await ff.deleteFile('in').catch(() => {})
    await ff.deleteFile(output).catch(() => {})
  }
}

const gifSize = async blob => {
  const v = new DataView(await blob.slice(0, 10).arrayBuffer())
  if (v.getUint8(0) !== 0x47 || v.getUint8(1) !== 0x49 || v.getUint8(2) !== 0x46) throw new Error('That GIF looks broken')
  return { w: v.getUint16(6, true), h: v.getUint16(8, true) }
}

export async function processGif(file, onStatus) {
  const { w, h } = await gifSize(file)
  if (file.size <= LIMITS.gif && w <= 1280 && h <= 1080) return { blob: file, ext: 'gif', w, h }

  onStatus?.('Loading GIF tools…')
  for (const [bw, bh] of [[1280, 1080], [960, 810], [720, 608], [540, 456], [400, 338]]) {
    const data = await runFFmpeg(file, [
      '-filter_complex',
      `scale=w=${bw}:h=${bh}:force_original_aspect_ratio=decrease:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4`,
    ], 'out.gif', p => onStatus?.(`Shrinking GIF for X ${Math.round(p * 100)}%`))
    const blob = new Blob([data], { type: 'image/gif' })
    if (blob.size <= LIMITS.gif) return { blob, ext: 'gif', ...(await gifSize(blob)) }
  }
  throw new Error('That GIF is too big for X even after shrinking')
}

const readVideo = blob => new Promise(resolve => {
  const v = document.createElement('video')
  v.preload = 'auto'
  v.muted = true
  v.playsInline = true
  v.src = URL.createObjectURL(blob)
  v.onloadeddata = () => resolve(v)
  v.onerror = () => resolve(null)
  setTimeout(() => resolve(v.readyState >= 2 ? v : null), 15000)
})

const posterFrom = async video => {
  await new Promise(resolve => {
    video.onseeked = resolve
    video.currentTime = Math.min(0.5, (video.duration || 1) / 2)
    setTimeout(resolve, 3000)
  })
  const s = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight))
  const c = document.createElement('canvas')
  c.width = Math.round(video.videoWidth * s)
  c.height = Math.round(video.videoHeight * s)
  c.getContext('2d').drawImage(video, 0, 0, c.width, c.height)
  return toBlob(c, 'image/jpeg', 0.8)
}

export async function processVideo(file, onStatus) {
  let video = await readVideo(file)
  if (video && video.duration > 140) throw new Error('X only allows videos up to 2:20')

  const ready = video && file.type === 'video/mp4' && file.size <= LIMITS.video &&
    video.videoWidth <= 1920 && video.videoHeight <= 1200 && video.videoWidth > 0
  let blob = file

  if (!ready) {
    onStatus?.('Loading video tools…')
    const data = await runFFmpeg(file, [
      '-t', '140',
      '-vf', "scale=w='min(1280,iw)':h='min(1280,ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2",
      '-fpsmax', '60',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '128k', '-ac', '2',
      '-movflags', '+faststart',
    ], 'out.mp4', p => onStatus?.(`Converting video for X ${Math.round(p * 100)}%`))
    blob = new Blob([data], { type: 'video/mp4' })
    if (blob.size > LIMITS.video) throw new Error('That video is too big, even after converting')
    video = await readVideo(blob)
    if (!video) throw new Error('Couldn’t read that video')
  }

  const poster = await posterFrom(video).catch(() => null)
  return { blob, ext: 'mp4', w: video.videoWidth, h: video.videoHeight, poster }
}
