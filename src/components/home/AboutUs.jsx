import Container from '../ui/Container'
import SmartImage from '../ui/SmartImage'
import { ABOUT_LAYOUT } from '../../config/site'
import { useSettings } from '../../context/SettingsContext'

export default function AboutUs() {
  const { settings } = useSettings()

  // "PittyBloom" -> "Pitty" / "Bloom" (majkhane bhege 2 line)
  const word = (settings.heroWord || '').trim()
  const mid = Math.ceil(word.length / 2)
  const lines = [word.slice(0, mid), word.slice(mid)]

  return (
    <section className="overflow-hidden bg-white py-16 sm:py-24">
      <Container>
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div className="max-w-[400px]">
            <h2 className="font-serif text-4xl font-semibold">About Us</h2>
            <div className="mt-8 space-y-5 leading-8 text-ink/60">
              {settings.about.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </div>
          <div className="relative h-[380px] lg:h-[560px]">
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