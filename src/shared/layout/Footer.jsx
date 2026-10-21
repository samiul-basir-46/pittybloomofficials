import { Link } from 'react-router-dom'
import { Facebook, Instagram, Mail, MessageCircle } from 'lucide-react'
import Container from '../ui/Container'
import useAsync from '../hooks/useAsync'
import { useSettings } from '../context/SettingsContext'
import { getPolicies } from '../services/contentService'
import { whatsappNumber } from '../utils/social'

export default function Footer() {
  const { settings } = useSettings()
  const policies = useAsync(getPolicies)
  const waNumber = whatsappNumber(settings.whatsapp)
  const waDisplay = waNumber.startsWith('880') ? `0${waNumber.slice(3)}` : waNumber

  return (
    <footer className="border-t border-sand bg-cream">
      <Container className="grid gap-10 py-14 md:grid-cols-3">
        <div>
          <p className="font-serif text-3xl font-bold">{settings.name}</p>
          <p className="mt-4 max-w-xs text-[15px] leading-6">{settings.blurb}</p>
        </div>
        <div>
          <p className="font-serif text-lg">Policies</p>
          <ul className="mt-5 space-y-3.5">
            {(policies.data ?? []).map((p) => (
              <li key={p.id}>
                <Link to={`/policies/${p.id}`} className="hover:text-brand">
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-serif text-lg">Contact</p>
          <ul className="mt-5 space-y-5">
            <li className="flex items-center gap-3">
              <Mail size={20} /> {settings.email}
            </li>
            <li>
              <a href={settings.instagramUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-brand">
                <Instagram size={20} /> {settings.instagram}
              </a>
            </li>
            {settings.facebookUrl && <li><a href={settings.facebookUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-brand"><Facebook size={20} /> Facebook</a></li>}
            {waNumber && <li><a href={`https://wa.me/${waNumber}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-brand"><MessageCircle size={20} /> WhatsApp · {waDisplay}</a></li>}
          </ul>
        </div>
      </Container>
      <Container>
        <p className="border-t border-sand py-8 text-center text-sm">
          © {new Date().getFullYear()} {settings.name}. All rights reserved. Made with love.
        </p>
      </Container>
    </footer>
  )
}
