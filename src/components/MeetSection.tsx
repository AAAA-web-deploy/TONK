import { siteConfig } from '@/config/site'

export function MeetSection() {
  return <section className="meet" id="meet">
    <h2 className="section-title gold-text">Meet $TONK</h2>
    <div className="moods">{siteConfig.moods.map(mood => <figure className="parchment mood" key={mood.name}>
      <img src={mood.image} alt={mood.alt} loading="lazy" /><figcaption>{mood.name}</figcaption>
    </figure>)}</div>
  </section>
}
