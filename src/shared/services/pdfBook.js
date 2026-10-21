// Reads an uploaded PDF, checks it is valid for the book format and renders lossless preview pages.
// The original PDF is uploaded separately without modification.
export const PAGE_MULTIPLE = 4
// Render enough pixels for sharp phone screens and zooming while keeping per-page memory bounded.
const RENDER_WIDTH = 1800

export class PdfBookError extends Error {}

let libPromise
const loadPdfJs = () =>
  (libPromise ??= Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]).then(
    ([lib, worker]) => {
      lib.GlobalWorkerOptions.workerSrc = worker.default
      return lib
    },
  ))

const toPng = (canvas) =>
  new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode page'))), 'image/png'),
  )

export const isValidPageCount = (count) => Number.isInteger(count) && count > 0 && count % PAGE_MULTIPLE === 0

/**
 * Returns { pages: Blob[], ratio } where ratio is page width / height.
 * Throws PdfBookError (with a message safe to show) when the file cannot be used as a book.
 * Nothing is rendered when the page count is invalid, so an invalid PDF can never become a book.
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
    if (!isValidPageCount(count)) {
      throw new PdfBookError(
        `This PDF has ${count} page${count === 1 ? '' : 's'}. For the book format, the total number of pages must be divisible by 4 (4, 8, 12, 16…). Please fix the PDF and upload it again.`,
      )
    }

    const pages = []
    let ratio = 1 / 1.4142 // A4
    for (let n = 1; n <= count; n++) {
      const page = await pdf.getPage(n)
      const base = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({ scale: RENDER_WIDTH / base.width })
      if (n === 1) ratio = viewport.width / viewport.height

      const canvas = document.createElement('canvas')
      canvas.width = Math.round(viewport.width)
      canvas.height = Math.round(viewport.height)
      const context = canvas.getContext('2d')
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      await page.render({ canvasContext: context, canvas, viewport }).promise

      pages.push(await toPng(canvas))
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
