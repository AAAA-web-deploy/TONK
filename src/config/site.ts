/** Token identity, domain, logo, hero heading and main asset settings. */
export const siteConfig = {
  token: {
    name: 'TONK',
    ticker: 'TONK',
    chain: 'Ethereum mainnet',
    chainId: 1,
    // Set NEXT_PUBLIC_TOKEN_CA in .env.local, or enter your actual CA here.
    contractAddress: process.env.NEXT_PUBLIC_TOKEN_CA || '0xed5d33a9da16048f68649f5fbe58c4455c91fecc',
    tradeUrl: process.env.NEXT_PUBLIC_TRADE_URL || '',
  },
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || '',
  addressBarLabel: process.env.NEXT_PUBLIC_ADDRESS_BAR_LABEL || 'tonkfun.xyz',
  brand: {
    logo: '/img/logo.png',
    // Change to 'wordmark' for the original reference's exact $TONK text logo.
    logoMode: (process.env.NEXT_PUBLIC_LOGO_MODE || 'image') as 'image' | 'wordmark',
  },
  hero: {
    eyebrow: 'Meet Tonkereum',
    headline: ['Small caveman.', 'Big ETH energy.'],
    artLabel: 'TONK walking through a dusty canyon at sunset, carrying his bag',
  },
  moods: [
    { name: 'Grumpy', image: '/img/moods/grumpy.jpg', alt: 'TONK looking grumpy' },
    { name: 'Smug', image: '/img/moods/smug.jpg', alt: 'TONK looking smug' },
    { name: 'Sleepy', image: '/img/moods/sleepy.jpg', alt: 'TONK asleep' },
    { name: 'Furious', image: '/img/moods/furious.jpg', alt: 'TONK yelling, furious' },
    { name: 'Shocked', image: '/img/moods/shocked.jpg', alt: 'TONK looking shocked' },
    { name: 'Suspicious', image: '/img/moods/suspicious.jpg', alt: 'TONK side-eyeing, suspicious' },
  ],
  world: { video: '/video/tonk-teaser-v1.mp4', poster: '/img/teaser-poster.jpg' },
} as const
