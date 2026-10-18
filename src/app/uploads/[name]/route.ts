import { galleryRequest } from '@/lib/server/gallery'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) { return galleryRequest(request) }
export async function HEAD(request: Request) { return galleryRequest(request) }
