import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import Container from '../ui/Container'
import Button from '../ui/Button'
import HeroSlider from './HeroSlider'
import { useSettings } from '../../context/SettingsContext'

export default function Hero() {
  const { settings } = useSettings()

  return (
    <section className="bg-white pb-10 sm:pb-16">
      <div className="relative h-[560px] overflow-hidden bg-brand sm:h-[680px]">
        <HeroSlider images={settings.heroImages.filter(Boolean)} />
        <h1 className="absolute inset-x-0 top-[16%] select-none whitespace-nowrap text-center text-[13vw] font-extrabold leading-none tracking-tight text-white/50">
          {settings.heroWord}
        </h1>
        <Container className="absolute inset-x-0 bottom-16 flex flex-col items-end gap-4 text-right sm:bottom-20">
          <p className="font-quote text-lg italic leading-8 text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.4)] sm:text-xl">
            “{settings.quote[0]}
            <br />
            {settings.quote[1]}”
          </p>
          <Button as={Link} to={settings.ctaLink} variant="light" className="gap-2 shadow-lg">
            {settings.ctaLabel} <ArrowRight size={18} />
          </Button>
        </Container>
      </div>
    </section>
  )
}