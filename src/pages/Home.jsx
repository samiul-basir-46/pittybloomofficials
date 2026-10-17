import Hero from '../components/home/Hero'
import BestSelling from '../components/home/BestSelling'
import MoreProducts from '../components/home/MoreProducts'
import AboutUs from '../components/home/AboutUs'
import useAsync from '../hooks/useAsync'
import { getBestSelling, getMoreProducts } from '../services/contentService'

export default function Home() {
  const best = useAsync(getBestSelling)
  const more = useAsync(getMoreProducts)

  return (
    <>
      <Hero />
      <BestSelling items={best.data ?? []} />
      <MoreProducts items={more.data ?? []} />
      <AboutUs />
    </>
  )
}
