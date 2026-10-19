import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { siteConfig } from '@/config/site'
import { VisitorTracker } from '@/components/VisitorTracker'
import './globals.css'
import './overrides.css'

export const viewport: Viewport = { width: 'device-width', initialScale: 1 }
export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl || 'http://localhost:3000'),
  title: '$TONK',
  description: 'Small caveman. Big ETH energy. He found Ethereum. Still hasn’t found fire.',
  ...(siteConfig.siteUrl ? { alternates: { canonical: siteConfig.siteUrl } } : {}),
  icons: { icon: siteConfig.brand.logo, apple: siteConfig.brand.logo },
  openGraph: { type: 'website', siteName: '$TONK', title: '$TONK', description: 'He found Ethereum. Still hasn’t found fire.', images: [{ url: siteConfig.brand.logo }], ...(siteConfig.siteUrl ? { url: siteConfig.siteUrl } : {}) },
  twitter: { card: 'summary_large_image', title: '$TONK', images: ['/img/hero.jpg'] },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning>
    <head><link rel="stylesheet" href="/fonts/fonts.css" /></head>
    <body>
      <Script src="/runtime/address-bar.js" strategy="beforeInteractive" />
      <VisitorTracker />
      {children}
    </body>
  </html>
}
