import { siteConfig } from '@/config/site'

export function Brand({ place = 'nav' }: { place?: 'nav' | 'foot' }) {
  return (
    <a className={`logo brand-lockup${place === 'foot' ? ' brand-foot' : ''}`} href="#home" aria-label="Tonkereum $TONK">
      <img className="brand-mark" src={siteConfig.brand.logo} alt="" />
      <span className="brand-words gold-text">
        {place === 'foot' ? <span className="brand-name">Tonkereum</span> : null}
        <span className="brand-ticker">$TONK</span>
      </span>
    </a>
  )
}
