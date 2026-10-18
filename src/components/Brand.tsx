import { siteConfig } from '@/config/site'

export function Brand() {
  const custom = siteConfig.brand.logoMode === 'image'
  return (
    <a className={`logo gold-text${custom ? ' brand-custom' : ''}`} href="#home" aria-label="$TONK">
      {custom ? <><span className="brand-spacer" aria-hidden="true">$TONK</span><img className="brand-image" src={siteConfig.brand.logo} alt="$TONK" /></> : '$TONK'}
    </a>
  )
}
