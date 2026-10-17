import Container from '../components/ui/Container'
import useAsync from '../hooks/useAsync'
import { getFaqs } from '../services/contentService'

export default function Faq() {
  const { data, loading } = useAsync(getFaqs)

  return (
    <Container className="py-16 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-10 text-center font-serif text-4xl sm:text-5xl">FAQ</h1>
        {!loading && data.length === 0 && <p className="text-center text-ink/60">No questions added yet.</p>}
        {(data ?? []).map((f) => (
          <details key={f.id} className="border-b border-sand py-4">
            <summary className="cursor-pointer font-semibold">{f.question}</summary>
            <p className="mt-3 whitespace-pre-line text-ink/70">{f.answer}</p>
          </details>
        ))}
      </div>
    </Container>
  )
}