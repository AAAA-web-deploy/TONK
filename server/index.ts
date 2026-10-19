import { createServer } from 'node:http'
import path from 'node:path'
import { createApp } from './createApp.ts'
import { serveStatic } from './static.ts'

const dataDir = process.env.TONK_TRACKER_DIR ?? path.join(process.cwd(), 'tracker-data')
const dist = path.resolve(process.env.TONK_DIST ?? 'out')
const port = Number(process.env.PORT ?? 4217)
const host = process.env.HOST ?? '127.0.0.1'
const trustProxy = process.env.TRUST_PROXY === '1'
const trustedProxies = (process.env.TRUSTED_PROXIES ?? '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'https://tonkereum.site,https://www.tonkereum.site,https://aaaa-web-deploy.github.io,http://127.0.0.1:3000,http://localhost:3000')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)

const app = createApp({
  dataDir,
  bootstrapPassword: process.env.DASHBOARD_PASSWORD || 'aaaa',
  nodeEnv: process.env.NODE_ENV ?? 'production',
  trustProxy,
  trustedProxies,
  trustedIpHeader: process.env.TRUSTED_IP_HEADER ?? 'cf-connecting-ip',
  allowedOrigins,
})

const server = createServer((req, res) => {
  const url = req.url ?? '/'
  if (url === '/TONK/api' || url.startsWith('/TONK/api/') || url.startsWith('/TONK/api?')) req.url = url.slice('/TONK'.length)
  if ((req.url ?? '').startsWith('/api/')) {
    void app.handle(req, res)
    return
  }
  serveStatic(req, res, dist)
})

server.on('error', (error) => {
  console.error(error instanceof Error ? `${error.name}: ${error.message}` : error)
  console.error('The TONK visitor tracker could not listen. Choose another PORT if this one is already in use.')
  app.close()
  process.exit(1)
})

server.listen(port, host, () => {
  console.log(`TONK visitor tracker listening on http://${host}:${port}/`)
  console.log(`Dashboard: http://${host}:${port}/dashboard/`)
})

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close()
    app.close()
  })
}
