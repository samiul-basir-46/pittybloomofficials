import { useState } from 'react'
import { FileText, Trash2, Upload } from 'lucide-react'
import { readPdfBook } from '../shared/services/pdfBook'
import { bookStore } from '../shared/services/bookStore'

// Upload a PDF (A4 pages) for the magazine's book preview. The PDF is checked and rendered in the browser;
// only a PDF whose page count is divisible by 4 is accepted, otherwise the previous book is kept.
export default function PdfField({ value, onChange }) {
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')
  const busy = progress !== null

  const pick = async (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    setError('')
    setProgress({ done: 0, total: 0 })
    try {
      const { pages, ratio } = await readPdfBook(file, (done, total) => setProgress({ done, total }))
      const key = await bookStore.save(pages)
      onChange({ key, pageCount: pages.length, ratio, name: file.name })
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Could not process this PDF. Try another file.')
    } finally {
      setProgress(null)
    }
  }

  return (
    <div className="space-y-2">
      {value?.key && (
        <div className="flex items-center gap-3 rounded-xl border border-sand bg-cream/60 p-3">
          <FileText size={20} className="shrink-0 text-brand" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{value.name || 'Book PDF'}</p>
            <p className="text-xs text-ink/60">{value.pageCount} pages · ready for preview</p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 size={14} /> Remove
          </button>
        </div>
      )}

      <label
        className={`inline-flex items-center gap-1.5 rounded-lg border border-sand bg-white px-3 py-1.5 text-xs font-medium ${
          busy ? 'cursor-wait opacity-70' : 'cursor-pointer hover:bg-sand/60'
        }`}
      >
        <Upload size={14} />
        {busy
          ? progress.total
            ? `Processing page ${progress.done} of ${progress.total}…`
            : 'Reading PDF…'
          : value?.key
            ? 'Replace PDF'
            : 'Upload PDF'}
        <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={pick} disabled={busy} />
      </label>

      <p className="text-xs text-ink/50">A4 pages. The total number of pages must be divisible by 4 (4, 8, 12, 16…).</p>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
