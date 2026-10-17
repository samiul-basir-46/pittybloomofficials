import { useParams } from 'react-router-dom'
import ComingSoon from '../../shared/ui/ComingSoon'

const titleFromId = (id = '') =>
  id
    .split('-')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ')

// Fallback for products added later from Admin that have no page of their own yet (route: /products/:id).
// Once a product gets its own folder under src/pages/, point its Admin link there instead.
export default function ComingSoonPage() {
  const { id } = useParams()
  return <ComingSoon title={titleFromId(id)} />
}
