// Upload jobs live outside the editor, so closing its modal or changing admin routes does not stop them.
import { readImageBook, readPdfBook } from './pdfBook'
import { bookStore } from './bookStore'

let jobs = []
const listeners = new Set()
const publish = () => listeners.forEach((listener) => listener())
const update = (id, changes) => {
  jobs = jobs.map((job) => job.id === id ? { ...job, ...changes } : job)
  publish()
}

export const subscribeBookUploads = (listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
export const getBookUploads = () => jobs
export const dismissBookUpload = (id) => {
  jobs = jobs.filter((job) => job.id !== id || job.status === 'uploading')
  publish()
}

// `input` is one PDF file, or a list of page images (JPG/PNG).
export function startBookUpload(input) {
  const files = Array.isArray(input) ? input : [input]
  const isPdf = files.length === 1 && (files[0].type === 'application/pdf' || files[0].name.toLowerCase().endsWith('.pdf'))
  const label = isPdf ? files[0].name : `${files.length} page image${files.length > 1 ? 's' : ''}`
  const id = `upload-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  jobs = [{ id, name: label, status: 'uploading', phase: isPdf ? 'Reading PDF' : 'Checking images', done: 0, total: 0 }, ...jobs]
  publish()

  const promise = (async () => {
    try {
      const read = isPdf ? readPdfBook : readImageBook
      const { pages, ratio } = await read(isPdf ? files[0] : files, (done, total) =>
        update(id, { phase: 'Preparing pages', done, total }),
      )
      update(id, { phase: 'Saving preview pages', done: 0, total: pages.length })
      const key = await bookStore.save(pages, { name: label, ratio }, isPdf ? files[0] : null, (done, total) =>
        update(id, { phase: 'Saving preview pages', done, total }),
      )
      const book = { key, pageCount: pages.length, ratio, name: label, sourceAvailable: isPdf }
      update(id, { status: 'complete', phase: 'Ready to attach', book, done: pages.length, total: pages.length })
      return book
    } catch (error) {
      update(id, { status: 'error', phase: 'Upload failed', error: error instanceof Error ? error.message : 'Could not upload this book.' })
      throw error
    }
  })()

  return { id, promise }
}
