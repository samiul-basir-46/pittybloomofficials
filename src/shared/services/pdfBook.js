// Reads an uploaded PDF and renders lossless preview pages for the book viewer.
// The original PDF is uploaded separately without modification.
// Render at 200 DPI: enough detail for the viewer's 520px page width, with
// substantially smaller preview files. The original PDF remains untouched.
const PREVIEW_DPI = 200

export class PdfBookError extends Error {}

let libPromise
const loadPdfJs = () =>
  (libPromise ??= Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]).then(
    ([lib, worker]) => {
      lib.GlobalWorkerOptions.workerSrc = worker.default
      return lib
    },
  ))

const toJpeg = (canvas) =>
  new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode page'))), 'image/jpeg', 0.94),
  )

export const isValidPageCount = (count) => Number.isInteger(count) && count > 0

/**
 * Returns { pages: Blob[], ratio } where ratio is page width / height.
 * Throws PdfBookError (with a message safe to show) when the file cannot be read.
 */
export async function readPdfBook(file, onProgress) {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new PdfBookError('Please choose a PDF file.')
  }

  const lib = await loadPdfJs()
  let pdf
  try {
    pdf = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  } catch {
    throw new PdfBookError('Could not read this PDF. It may be damaged or password protected.')
  }

  try {
    const count = pdf.numPages
    const pages = []
    let ratio = 1 / 1.4142 // A4
    for (let n = 1; n <= count; n++) {
      const page = await pdf.getPage(n)
      const base = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({ scale: PREVIEW_DPI / 72 })
      if (n === 1) ratio = viewport.width / viewport.height

      const canvas = document.createElement('canvas')
      canvas.width = Math.round(viewport.width)
      canvas.height = Math.round(viewport.height)
      const context = canvas.getContext('2d')
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      await page.render({ canvasContext: context, canvas, viewport }).promise

      pages.push(await toJpeg(canvas))
      canvas.width = 0
      canvas.height = 0
      page.cleanup()
      onProgress?.(n, count)
    }
    return { pages, ratio }
  } finally {
    pdf.destroy()
  }
}
