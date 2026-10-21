import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { FileText, Trash2, Upload } from 'lucide-react'
import { bookStore, originalBookUrl } from '../shared/services/bookStore'
import { getBookUploads, startBookUpload, subscribeBookUploads } from '../shared/services/bookUploadQueue'

export default function PdfField({ value, onChange }) {
  const [progress, setProgress] = useState(false)
  const [error, setError] = useState('')
  const [uploadedBooks, setUploadedBooks] = useState([])
  const mounted = useRef(true)
  const uploadJobs = useSyncExternalStore(subscribeBookUploads, getBookUploads, getBookUploads)

  useEffect(() => {
    mounted.current = true
    bookStore.list().then(setUploadedBooks).catch(() => {})
    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    const completed = uploadJobs.filter((job) => job.status === 'complete').map((job) => job.book)
    if (completed.length) setUploadedBooks((current) => [...completed, ...current.filter((book) => !completed.some((item) => item.key === book.key))])
  }, [uploadJobs])

  const pick = (event) => {
    const file = event.target.files[0]
    event.target.value = ''
    if (!file) return
    setError('')
    if (file.size > 100 * 1024 * 1024) {
      setError('PDF files must be 100 MB or smaller.')
      return
    }
    setProgress(true)
    const job = startBookUpload(file)
    job.promise.then((book) => {
      if (!mounted.current) return
      setUploadedBooks((current) => [book, ...current.filter((entry) => entry.key !== book.key)])
      onChange(book)
    }).catch((err) => {
      if (mounted.current) setError(err instanceof Error ? err.message : 'Could not upload this PDF.')
    }).finally(() => {
      if (mounted.current) setProgress(false)
    })
  }

  return (
    <div className="space-y-2">
      {value?.key && (
        <div className="flex items-center gap-3 rounded-xl border border-sand bg-cream/60 p-3">
          <FileText size={20} className="shrink-0 text-brand" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{value.name || 'Book PDF'}</p>
            <p className="text-xs text-ink/60">{value.pageCount} pages · ready for preview</p>
            {value.sourceAvailable && <a href={originalBookUrl(value.key)} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-semibold text-brand hover:underline">Open original PDF</a>}
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={progress}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 size={14} /> Remove
          </button>
        </div>
      )}

      <label className={`inline-flex items-center gap-1.5 rounded-lg border border-sand bg-white px-3 py-1.5 text-xs font-medium ${progress ? 'cursor-wait opacity-70' : 'cursor-pointer hover:bg-sand/60'}`}>
        <Upload size={14} />
        {progress ? 'Uploading in background…' : value?.key ? 'Replace PDF' : 'Upload PDF'}
        <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={pick} disabled={progress} />
      </label>

      <p className="text-xs text-ink/50">The original PDF is kept unchanged. A sharp, lossless preview is made for the page-flip viewer. A4 pages; total pages must be divisible by 4 (4, 8, 12, 16…). Maximum file size: 100 MB.</p>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

      {uploadedBooks.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-ink/60">PDFs uploaded to Cloudflare — select one to attach</p>
          {uploadedBooks.slice(0, 5).map((book) => (
            <button
              key={book.key}
              type="button"
              disabled={progress}
              onClick={() => onChange(book)}
              className="block w-full truncate rounded-lg border border-sand px-3 py-2 text-left text-xs hover:bg-cream disabled:opacity-50"
            >
              {book.name} · {book.pageCount} pages {value?.key === book.key ? '· attached' : '· attach'}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
