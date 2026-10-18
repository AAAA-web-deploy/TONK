import { BrowserBar } from '@/components/BrowserBar'
import { Hero } from '@/components/Hero'
import { MeetSection } from '@/components/MeetSection'
import { WorldSection } from '@/components/WorldSection'
import { MemeDepot } from '@/components/MemeDepot'
import { Footer } from '@/components/Footer'

export default function HomePage() {
  return <>
    <BrowserBar />
    <main><Hero /><MeetSection /><WorldSection /><MemeDepot /></main>
    <Footer />
  </>
}
