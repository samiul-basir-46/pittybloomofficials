import Container from '../../../shared/ui/Container'
import SmartImage from '../../../shared/ui/SmartImage'
import { ABOUT_LAYOUT } from '../../../shared/config/site'
import { useSettings } from '../../../shared/context/SettingsContext'

export default function AboutUs() {
  const { settings } = useSettings()

  // "PittyBloom" -> "Pitty" / "Bloom" (majkhane bhege 2 line)
  const word = (settings.heroWord || '').trim()
  const mid = Math.ceil(word.length / 2)
  const lines = [word.slice(0, mid), word.slice(mid)]

  return (
    <section className="overflow-hidden bg-white py-16 sm:py-24">
      <Container>
        <div className="grid grid-cols-[1.15fr_1fr] gap-4 lg:grid-cols-[1fr_1.4fr] lg:items-start lg:gap-10">
          <div className="min-w-0 max-w-[400px]">
            <h2 className="font-serif text-3xl font-semibold sm:text-4xl">{settings.aboutTitle}</h2>
            <div className="mt-5 space-y-4 text-sm leading-6 text-ink/60 sm:mt-8 sm:space-y-5 sm:text-base sm:leading-8">
              {settings.about.filter(Boolean).map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </div>
          <div className="relative min-h-[420px] lg:h-[560px]">
            {ABOUT_LAYOUT.map((item, i) => (
              <div
                key={item.alt}
                className={`absolute overflow-hidden rounded-lg border-4 border-white shadow-2xl ${item.className}`}
              >
                <SmartImage src={settings.aboutImages[i]} alt={item.alt} />
              </div>
            ))}
          </div>
        </div>

        <p
          aria-label={word}
          className="mt-6 select-none text-[16vw] font-extrabold uppercase leading-[0.85] text-brand"
        >
          {lines.map((l, i) => (
            <span key={i} className="block">
              {l}
            </span>
          ))}
        </p>
      </Container>
    </section>
  )
}