import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { ArrowDownAZ, ArrowLeft, ArrowRight, BookOpen, ChevronLeft, ChevronRight, FileText, Images, Loader2, Maximize2, Plus, RefreshCw, Trash2, Upload, X } from 'lucide-react'
import { bookPageUrl, bookStore, originalBookUrl } from '../shared/services/bookStore'
import { getBookUploads, startBookUpload, subscribeBookUploads } from '../shared/services/bookUploadQueue'
import { naturalOrder, readImageBook } from '../shared/services/pdfBook'

const IMAGE_TYPES = ['image/jpeg', 'image/png']
const isPdfFile = (file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

const primaryButton = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:pointer-events-none disabled:opacity-50'
const softButton = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-sand bg-white px-4 text-sm font-medium text-ink transition hover:bg-cream'

function Progress({ label, done, total }) {
  const known = total > 0
  return (
    <div role="status" aria-live="polite" className="rounded-xl border border-brand/20 bg-white p-3">
      <div className="flex items-center justify-between gap-3 text-xs font-medium text-ink/70">
        <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin text-brand" /> {label}</span>
        {known && <span className="tabular-nums">{done} / {total}</span>}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sand">
        <div className={`h-full rounded-full bg-brand transition-all ${known ? '' : 'w-1/3 animate-pulse'}`} style={known ? { width: `${Math.min(100, Math.round((done / total) * 100))}%` } : undefined} />
      </div>
    </div>
  )
}

// A big look at one page, with the actions for it.
function PageViewer({ bookKey, pageCount, revision, index, busy, onIndex, onReplace, onClose }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft' && index > 0) onIndex(index - 1)
      if (event.key === 'ArrowRight' && index < pageCount - 1) onIndex(index + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, pageCount, onIndex, onClose])

  const pageNumber = index + 1
  const where = pageNumber === 1 ? 'Cover' : pageNumber === pageCount ? 'Back cover' : `Page ${pageNumber}`
  const arrow = 'grid size-11 place-items-center rounded-full bg-white/95 text-ink shadow-lg transition hover:bg-white disabled:opacity-30'
  return (
    <div role="dialog" aria-modal="true" aria-label={`${where} preview`} className="fixed inset-0 z-[70] flex flex-col bg-black/80 p-3 sm:p-6" onClick={onClose}>
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 pb-3 text-white" onClick={(event) => event.stopPropagation()}>
        <p className="text-sm font-medium">{where} <span className="text-white/60">· {pageNumber} of {pageCount}</span></p>
        <button type="button" aria-label="Close" onClick={onClose} className="grid size-10 place-items-center rounded-full bg-white/15 hover:bg-white/25"><X size={20} /></button>
      </div>
      <div className="relative mx-auto flex min-h-0 w-full max-w-3xl flex-1 items-center justify-center" onClick={(event) => event.stopPropagation()}>
        <img src={`${bookPageUrl(bookKey, pageNumber)}?v=${revision}`} alt={`${where}`} className="max-h-full max-w-full rounded-lg bg-white object-contain shadow-2xl" />
        <button type="button" aria-label="Previous page" onClick={() => onIndex(index - 1)} disabled={index === 0} className={`${arrow} absolute left-1 sm:-left-14`}><ChevronLeft size={22} /></button>
        <button type="button" aria-label="Next page" onClick={() => onIndex(index + 1)} disabled={index >= pageCount - 1} className={`${arrow} absolute right-1 sm:-right-14`}><ChevronRight size={22} /></button>
      </div>
      <div className="mx-auto flex w-full max-w-3xl justify-center pt-3" onClick={(event) => event.stopPropagation()}>
        <label className={`${primaryButton} cursor-pointer ${busy ? 'pointer-events-none opacity-50' : ''}`}>
          <RefreshCw size={16} /> Replace this page
          <input type="file" accept="image/jpeg,image/png" className="hidden" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) onReplace(pageNumber, file) }} />
        </label>
      </div>
    </div>
  )
}

export default function PdfField({ value, onChange }) {
  const [progress, setProgress] = useState(false)
  const [busyLabel, setBusyLabel] = useState('')
  const [error, setError] = useState('')
  const [uploadedBooks, setUploadedBooks] = useState([])
  const [draft, setDraft] = useState([]) // page images waiting to be arranged: [{ id, file, url }]
  const [previewRevision, setPreviewRevision] = useState(0)
  const [viewing, setViewing] = useState(null) // page index open in the big viewer
  const [dragging, setDragging] = useState(false)
  const dragFrom = useRef(null)
  const mounted = useRef(true)
  const uploadJobs = useSyncExternalStore(subscribeBookUploads, getBookUploads, getBookUploads)
  const activeJob = uploadJobs.find((job) => job.status === 'uploading')

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

  // Images are first shown in a page-order step, so the order is the admin's choice (not the file names').
  const stageImages = (list) => {
    const files = [...list].filter((file) => IMAGE_TYPES.includes(file.type)).sort(naturalOrder)
    if (!files.length) {
      setError('Choose JPG or PNG page images.')
      return
    }
    setError('')
    setDraft((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.url))
      return files.map((file, index) => ({ id: `${Date.now()}-${index}`, file, url: URL.createObjectURL(file) }))
    })
  }

  const pickPdf = (event) => {
    const file = event.target.files[0]
    event.target.value = ''
    if (file) upload(file)
  }
  const pickImages = (event) => {
    const files = [...event.target.files]
    event.target.value = ''
    if (files.length) stageImages(files)
  }
  const dropFiles = (event) => {
    event.preventDefault()
    setDragging(false)
    if (progress) return
    const files = [...event.dataTransfer.files]
    const pdf = files.find(isPdfFile)
    if (pdf) upload(pdf)
    else if (files.length) stageImages(files)
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

  const replacePage = async (pageNumber, file) => {
    if (!file || !value?.key) return
    setError('')
    setProgress(true)
    setBusyLabel(`Replacing page ${pageNumber}…`)
    try {
      const { pages } = await readImageBook([file])
      await bookStore.updatePage(value.key, pageNumber, pages[0])
      await bookStore.updateManifest(value.key, {
        pageCount: Number(value.pageCount),
        ratio: value.ratio || 1 / 1.4142,
        name: value.name || 'Book preview',
        sourceAvailable: false,
      })
      onChange({ ...value, sourceAvailable: false })
      setPreviewRevision(Date.now())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not replace this page.')
    } finally {
      setProgress(false)
      setBusyLabel('')
    }
  }

  const appendPages = async (files) => {
    if (!files.length || !value?.key) return
    setError('')
    setProgress(true)
    try {
      const { pages, ratio } = await readImageBook(files)
      const firstNewPage = Number(value.pageCount || 0) + 1
      for (let index = 0; index < pages.length; index++) {
        setBusyLabel(`Adding page ${firstNewPage + index}…`)
        await bookStore.updatePage(value.key, firstNewPage + index, pages[index])
      }
      const pageCount = firstNewPage - 1 + pages.length
      await bookStore.updateManifest(value.key, {
        pageCount,
        ratio: value.ratio || ratio,
        name: value.name || 'Book preview',
        sourceAvailable: false,
      })
      onChange({ ...value, pageCount, sourceAvailable: false })
      setPreviewRevision(Date.now())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add these pages.')
    } finally {
      setProgress(false)
      setBusyLabel('')
    }
  }

  const pageCount = Number(value?.pageCount || 0)
  const hasBook = Boolean(value?.key)
  const working = progress || Boolean(busyLabel)

  return (
    <div className="space-y-4">
      {!hasBook && draft.length === 0 && (
        <div
          onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={dropFiles}
          className={`rounded-2xl border-2 border-dashed p-5 text-center transition sm:p-8 ${dragging ? 'border-brand bg-cream' : 'border-sand bg-cream/40'}`}
        >
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-white text-brand shadow-sm"><BookOpen size={26} /></span>
          <h4 className="mt-4 font-serif text-xl">Add the flip-book preview</h4>
          <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-ink/60">Customers flip through these pages on the magazine page. Upload a PDF, or the pages as pictures. You can also drop the files here.</p>
          <div className="mx-auto mt-5 grid max-w-md gap-3 sm:grid-cols-2">
            <label className={`${primaryButton} cursor-pointer ${working ? 'pointer-events-none opacity-60' : ''}`}>
              <Upload size={16} /> Upload PDF
              <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={pickPdf} disabled={working} />
            </label>
            <label className={`${softButton} cursor-pointer ${working ? 'pointer-events-none opacity-60' : ''}`}>
              <Images size={16} /> Upload page images
              <input type="file" accept="image/jpeg,image/png" multiple className="hidden" onChange={pickImages} disabled={working} />
            </label>
          </div>
          <p className="mt-4 text-xs text-ink/50">Every page is prepared at 1200px wide: sharp on any phone and quick to open.</p>
        </div>
      )}

      {activeJob && <Progress label={activeJob.phase || 'Uploading…'} done={activeJob.done} total={activeJob.total} />}
      {!activeJob && busyLabel && <Progress label={busyLabel} done={0} total={0} />}

      {hasBook && (
        <div className="overflow-hidden rounded-2xl border border-sand bg-white">
          <div className="flex flex-col gap-4 bg-cream/50 p-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <img src={`${bookPageUrl(value.key, 1)}?v=${previewRevision}`} alt="Cover" className="h-20 w-14 shrink-0 rounded-lg border border-sand bg-white object-cover shadow-sm" />
              <div className="min-w-0">
                <p className="truncate font-semibold">{value.name || 'Book preview'}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] font-medium">
                  <span className="rounded-full bg-white px-2.5 py-1 text-ink/70">{pageCount} pages</span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-ink/70">{value.sourceAvailable ? 'From PDF' : 'From images'}</span>
                  <span className="rounded-full bg-green-50 px-2.5 py-1 text-green-700">Ready</span>
                </div>
                {value.sourceAvailable && <a href={originalBookUrl(value.key)} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"><FileText size={12} /> Open original PDF</a>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <label className={`${softButton} cursor-pointer ${working ? 'pointer-events-none opacity-50' : ''}`}>
                <Upload size={15} /> Replace PDF
                <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={pickPdf} disabled={working} />
              </label>
              <button
                type="button"
                disabled={working}
                onClick={() => { if (window.confirm('Remove this book preview from the magazine? You can pick it again from earlier uploads.')) onChange(null) }}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:pointer-events-none disabled:opacity-50"
              >
                <Trash2 size={15} /> Remove
              </button>
            </div>
          </div>

          <div className="p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h4 className="font-serif text-lg">Pages</h4>
              <p className="text-xs text-ink/55">Tap a page to see it bigger or replace it.</p>
            </div>
            <ol className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6">
              {Array.from({ length: pageCount }, (_, index) => {
                const pageNumber = index + 1
                const tag = pageNumber === 1 ? 'Cover' : pageNumber === pageCount ? 'Back' : null
                return (
                  <li key={`${value.key}-${pageNumber}`} className="group relative">
                    <button type="button" onClick={() => setViewing(index)} aria-label={`View page ${pageNumber}`} className="block w-full overflow-hidden rounded-xl border border-sand bg-cream shadow-sm transition hover:border-brand hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
                      <img src={`${bookPageUrl(value.key, pageNumber)}?v=${previewRevision}`} alt={`Preview page ${pageNumber}`} loading="lazy" className="aspect-[3/4] w-full bg-white object-cover" />
                    </button>
                    <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-full bg-black/65 px-2 py-0.5 text-[11px] font-semibold text-white">{tag ?? pageNumber}</span>
                    <span className="pointer-events-none absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-white/90 text-ink opacity-0 shadow-sm transition group-hover:opacity-100"><Maximize2 size={12} /></span>
                    <label className={`absolute bottom-1.5 right-1.5 grid size-8 cursor-pointer place-items-center rounded-full bg-white text-brand shadow-md transition hover:bg-cream ${working ? 'pointer-events-none opacity-50' : ''}`} title={`Replace page ${pageNumber}`}>
                      <RefreshCw size={14} />
                      <span className="sr-only">Replace page {pageNumber}</span>
                      <input type="file" accept="image/jpeg,image/png" className="hidden" disabled={working} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; void replacePage(pageNumber, file) }} />
                    </label>
                  </li>
                )
              })}
              <li>
                <label className={`flex aspect-[3/4] w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-sand bg-cream/40 px-2 text-center text-xs font-semibold text-brand transition hover:border-brand hover:bg-cream ${working ? 'pointer-events-none opacity-50' : ''}`}>
                  <Plus size={20} /> Add page images
                  <input type="file" accept="image/jpeg,image/png" multiple className="hidden" disabled={working} onChange={(event) => { const files = [...(event.target.files || [])].sort(naturalOrder); event.target.value = ''; void appendPages(files) }} />
                </label>
              </li>
            </ol>
          </div>
        </div>
      )}

      {draft.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-sand bg-white p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="font-serif text-lg">Arrange the pages</h4>
              <p className="text-xs text-ink/55">{draft.length} selected · the first is the cover, the last is the back cover.</p>
            </div>
            <button type="button" onClick={() => setDraft((current) => [...current].sort((a, b) => naturalOrder(a.file, b.file)))} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-sand px-3 text-xs font-medium hover:bg-cream">
              <ArrowDownAZ size={14} /> Sort by file name
            </button>
          </div>
          <p className="text-xs text-ink/60">Drag a page, or use the arrows, to change its place.</p>
          <ol className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {draft.map((item, index) => (
              <li
                key={item.id}
                draggable
                onDragStart={() => { dragFrom.current = index }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => dropPage(index)}
                className="relative cursor-grab overflow-hidden rounded-xl border border-sand bg-cream/60 shadow-sm"
              >
                <img src={item.url} alt={`Page ${index + 1}`} className="aspect-[3/4] w-full object-cover" draggable={false} />
                <span className="absolute left-1.5 top-1.5 rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-white">{index + 1}</span>
                <button type="button" onClick={() => removePage(index)} aria-label={`Remove page ${index + 1}`} className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-white/95 text-red-500 shadow-sm hover:bg-white">
                  <X size={13} />
                </button>
                <div className="flex items-center justify-between bg-white px-1.5 py-1">
                  <button type="button" onClick={() => move(index, index - 1)} disabled={index === 0} aria-label={`Move page ${index + 1} earlier`} className="grid size-8 place-items-center rounded-lg hover:bg-sand disabled:opacity-30"><ArrowLeft size={15} /></button>
                  <button type="button" onClick={() => move(index, index + 1)} disabled={index === draft.length - 1} aria-label={`Move page ${index + 1} later`} className="grid size-8 place-items-center rounded-lg hover:bg-sand disabled:opacity-30"><ArrowRight size={15} /></button>
                </div>
              </li>
            ))}
          </ol>
          {draft.length % 2 !== 0 && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">You have an odd number of pages. A book usually has an even number (the back cover should be the last page).</p>}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={uploadDraft} disabled={working} className={primaryButton}>Upload {draft.length} pages in this order</button>
            <button type="button" onClick={clearDraft} className={softButton}>Cancel</button>
          </div>
        </div>
      )}

      {hasBook && draft.length === 0 && (
        <label className={`${softButton} w-full cursor-pointer text-xs sm:w-auto ${working ? 'pointer-events-none opacity-50' : ''}`}>
          <Images size={14} /> Start over with new page images
          <input type="file" accept="image/jpeg,image/png" multiple className="hidden" onChange={pickImages} disabled={working} />
        </label>
      )}

      {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}

      {uploadedBooks.length > 0 && (
        <details className="group rounded-xl border border-sand bg-cream/30">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm font-medium">
            <span>Use an earlier upload <span className="text-ink/50">({uploadedBooks.length})</span></span>
            <ChevronRight size={16} className="transition group-open:rotate-90" />
          </summary>
          <ul className="space-y-1.5 border-t border-sand p-2">
            {uploadedBooks.slice(0, 8).map((book) => {
              const selected = value?.key === book.key
              return (
                <li key={book.key}>
                  <button
                    type="button"
                    disabled={working || selected}
                    onClick={() => onChange(book)}
                    className="flex w-full items-center gap-3 rounded-lg bg-white p-2 text-left transition hover:bg-cream disabled:opacity-60"
                  >
                    <img src={bookPageUrl(book.key, 1)} alt="" loading="lazy" className="h-12 w-9 shrink-0 rounded border border-sand bg-cream object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{book.name}</span>
                      <span className="block text-xs text-ink/55">{book.pageCount} pages</span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${selected ? 'bg-green-50 text-green-700' : 'bg-cream text-brand'}`}>{selected ? 'In use' : 'Use this'}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </details>
      )}

      {viewing !== null && hasBook && (
        <PageViewer
          bookKey={value.key}
          pageCount={pageCount}
          revision={previewRevision}
          index={Math.min(viewing, pageCount - 1)}
          busy={working}
          onIndex={setViewing}
          onReplace={replacePage}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  )
}
