import { resolve } from 'node:path'
import { createHandler } from './gallery-handler.mjs'

let handler: ReturnType<typeof createHandler> | undefined

export function galleryRequest(request: Request) {
  handler ??= createHandler({
    siteRoot: resolve(process.cwd(), 'public'),
    storageRoot: resolve(process.env.TONK_DATA_DIR || '.data'),
    adminKey: process.env.TONK_ADMIN_KEY || '',
    uploadsEnabled: process.env.UPLOADS_ENABLED === 'true' || (process.env.UPLOADS_ENABLED === undefined && process.env.NODE_ENV === 'development'),
  })
  return handler(request)
}
