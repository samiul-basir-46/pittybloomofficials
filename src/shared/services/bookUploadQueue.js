// Upload jobs live outside the editor, so closing its modal or changing admin routes does not stop them.
import { readPdfBook } from './pdfBook'
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

export function startBookUpload(file) {
  const id = `upload-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  jobs = [{ id, name: file.name, status: 'uploading', phase: 'Reading PDF', done: 0, total: 0 }, ...jobs]
  publish()

  const promise = (async () => {
    try {
      const { pages, ratio } = await readPdfBook(file, (done, total) =>
        update(id, { phase: 'Preparing pages', done, total }),
      )
      update(id, { phase: 'Uploading to Cloudflare', done: 0, total: pages.length })
      const key = await bookStore.save(pages, { name: file.name, ratio }, (done, total) =>
        update(id, { phase: 'Uploading to Cloudflare', done, total }),
      )
      const book = { key, pageCount: pages.length, ratio, name: file.name }
      update(id, { status: 'complete', phase: 'Ready to attach', book, done: pages.length, total: pages.length })
      return book
    } catch (error) {
      update(id, { status: 'error', phase: 'Upload failed', error: error instanceof Error ? error.message : 'Could not upload this PDF.' })
      throw error
    }
  })()

  return { id, promise }
}
