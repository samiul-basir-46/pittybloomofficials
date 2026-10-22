import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { ArrowDownAZ, ArrowLeft, ArrowRight, FileText, Images, Trash2, Upload, X } from 'lucide-react'
import { bookStore, originalBookUrl } from '../shared/services/bookStore'
import { getBookUploads, startBookUpload, subscribeBookUploads } from '../shared/services/bookUploadQueue'
import { naturalOrder } from '../shared/services/pdfBook'

export default function PdfField({ value, onChange }) {
  const [progress, setProgress] = useState(false)
  const [error, setError] = useState('')
  const [uploadedBooks, setUploadedBooks] = useState([])
  const [draft, setDraft] = useState([]) // page images waiting to be arranged: [{ id, file, url }]
  const dragFrom = useRef(null)
  const mounted = useRef(true)
  const uploadJobs = useSyncExternalStore(subscribeBookUploads, getBookUploads, getBookUploads)

  useEffect(() => {
    mounted.current = true
    bookStore.list().then(setUploadedBooks).catch(() => {})
    return () => { mounted.current = false }
  }, [])

  const draftRef = useRef(draft)
  draftRef.current = draft
  useEffect(() => () => draftRef.current.forEach((item) => URL.revokeObjectURL(item.url)), [])

  useEffect(() => {
    const completed = uploadJobs.filter((job) => job.status === 'complete').map((job) => job.book)
    if (completed.length) setUploadedBooks((current) => [...completed, ...current.filter((book) => !completed.some((item) => item.key === book.key))])
  }, [uploadJobs])

  const upload = (input) => {
    setError('')
    setProgress(true)
    const job = startBookUpload(input)
    job.promise.then((book) => {
      if (!mounted.current) return
      setUploadedBooks((current) => [book, ...current.filter((entry) => entry.key !== book.key)])
      onChange(book)
    }).catch((err) => {
      if (mounted.current) setError(err instanceof Error ? err.message : 'Could not upload this book.')
    }).finally(() => {
      if (mounted.current) setProgress(false)
    })
  }

  const pickPdf = (event) => {
    const file = event.target.files[0]
    event.target.value = ''
    if (file) upload(file)
  }

  // Images are first shown in a page-order step, so the order is the admin's choice (not the file names').
  const pickImages = (event) => {
    const files = [...event.target.files].sort(naturalOrder)
    event.target.value = ''
    if (!files.length) return
    setDraft((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.url))
      return files.map((file, index) => ({ id: `${Date.now()}-${index}`, file, url: URL.createObjectURL(file) }))
    })
  }

  const clearDraft = () => {
    draft.forEach((item) => URL.revokeObjectURL(item.url))
    setDraft([])
  }
  const move = (from, to) => {
    if (from === to || to < 0 || to >= draft.length) return
    setDraft((current) => {
      const next = [...current]
      next.splice(to, 0, next.splice(from, 1)[0])
      return next
    })
  }
  const dropPage = (index) => {
    if (dragFrom.current !== null) move(dragFrom.current, index)
    dragFrom.current = null
  }
  const removePage = (index) => {
    URL.revokeObjectURL(draft[index].url)
    setDraft((current) => current.filter((_, i) => i !== index))
  }
  const uploadDraft = () => {
    const files = draft.map((item) => item.file)
    clearDraft()
    upload(files)
  }

  return (
    <div className="space-y-2">
      {value?.key && (
        <div className="flex items-center gap-3 rounded-xl border border-sand bg-cream/60 p-3">
          <FileText size={20} className="shrink-0 text-brand" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{value.name || 'Book PDF'}</p>
            <p className="text-xs text-ink/60">{value.pageCount} pages · ready for preview{value.sourceAvailable === false ? ' · from images' : ''}</p>
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
        <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={pickPdf} disabled={progress} />
      </label>
      <label className={`ml-2 inline-flex items-center gap-1.5 rounded-lg border border-sand bg-white px-3 py-1.5 text-xs font-medium ${progress ? 'cursor-wait opacity-70' : 'cursor-pointer hover:bg-sand/60'}`}>
        <Images size={14} />
        Upload HD images (JPG/PNG)
        <input type="file" accept="image/jpeg,image/png" multiple className="hidden" onChange={pickImages} disabled={progress} />
      </label>


      {draft.length > 0 && (
        <div className="space-y-3 rounded-xl border border-sand bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">Arrange the pages · {draft.length} selected</p>
            <button type="button" onClick={() => setDraft((current) => [...current].sort((a, b) => naturalOrder(a.file, b.file)))} className="inline-flex items-center gap-1.5 rounded-lg border border-sand px-2.5 py-1 text-xs font-medium hover:bg-sand/60">
              <ArrowDownAZ size={14} /> Sort by file name
            </button>
          </div>
          <p className="text-xs text-ink/60">The first picture is the cover and the last one is the back cover. Drag a page, or use the arrows, to change its place.</p>
          <ol className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {draft.map((item, index) => (
              <li
                key={item.id}
                draggable
                onDragStart={() => { dragFrom.current = index }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => dropPage(index)}
                className="relative cursor-grab overflow-hidden rounded-lg border border-sand bg-cream/60"
              >
                <img src={item.url} alt={`Page ${index + 1}`} className="aspect-[3/4] w-full object-cover" draggable={false} />
                <span className="absolute left-1 top-1 rounded-full bg-brand px-1.5 text-[11px] font-semibold text-white">{index + 1}</span>
                <button type="button" onClick={() => removePage(index)} aria-label={`Remove page ${index + 1}`} className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-white/90 text-red-500 hover:bg-white">
                  <X size={12} />
                </button>
                <div className="flex items-center justify-between px-1 py-1">
                  <button type="button" onClick={() => move(index, index - 1)} disabled={index === 0} aria-label={`Move page ${index + 1} earlier`} className="grid size-6 place-items-center rounded hover:bg-sand disabled:opacity-30"><ArrowLeft size={14} /></button>
                  <button type="button" onClick={() => move(index, index + 1)} disabled={index === draft.length - 1} aria-label={`Move page ${index + 1} later`} className="grid size-6 place-items-center rounded hover:bg-sand disabled:opacity-30"><ArrowRight size={14} /></button>
                </div>
              </li>
            ))}
          </ol>
          {draft.length % 2 !== 0 && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">You have an odd number of pages. A book usually has an even number (the back cover should be the last page).</p>}
          <div className="flex gap-2">
            <button type="button" onClick={uploadDraft} disabled={progress} className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">Upload {draft.length} pages in this order</button>
            <button type="button" onClick={clearDraft} className="rounded-lg border border-sand px-4 py-2 text-xs font-medium hover:bg-sand/60">Cancel</button>
          </div>
        </div>
      )}
      <p className="text-xs text-ink/50">Every page is prepared at 1200px wide: sharp on any phone and light enough to open instantly. PDF: the original is also stored unchanged. HD images: select all the pages at once, then arrange them in the order you want before uploading.</p>
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
