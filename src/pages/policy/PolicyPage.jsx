import { useParams } from 'react-router-dom'
import Container from '../../shared/ui/Container'
import useAsync from '../../shared/hooks/useAsync'
import { getPolicy } from '../../shared/services/contentService'

export default function Policy() {
  const { id } = useParams()
  const { data, loading } = useAsync(() => getPolicy(id), [id])

  if (loading) return <p className="py-32 text-center text-ink/60">Loading…</p>
  if (!data) return <p className="py-32 text-center text-ink/60">Page not found.</p>

  return (
    <Container className="py-16 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-8 font-serif text-4xl sm:text-5xl">{data.title}</h1>
        <p className="break-words whitespace-pre-line leading-7 text-ink/70 sm:leading-8">{data.content}</p>
      </div>
    </Container>
  )
}
