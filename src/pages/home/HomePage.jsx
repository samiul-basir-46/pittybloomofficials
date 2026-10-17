import Hero from './components/Hero'
import BestSelling from './components/BestSelling'
import MoreProducts from './components/MoreProducts'
import AboutUs from './components/AboutUs'
import useAsync from '../../shared/hooks/useAsync'
import { getBestSelling, getMoreProducts } from '../../shared/services/contentService'

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
