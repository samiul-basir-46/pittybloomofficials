// Turns an uploaded PDF (or page images) into the page images the flipbook shows.
// Every page is made 1200px wide: sharp even on a 3x phone screen or a large monitor (a page is shown
// at most ~520 CSS px wide), yet small enough (~150-300 KB) for a phone to open the book instantly.
// The original PDF is uploaded separately without modification.
export const PREVIEW_WIDTH = 1200
const PREVIEW_QUALITY = 0.9

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
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode page'))), 'image/jpeg', PREVIEW_QUALITY),
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
      const viewport = page.getViewport({ scale: PREVIEW_WIDTH / base.width })
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

export const naturalOrder = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
const IMAGE_TYPES = ['image/jpeg', 'image/png']

// Shrinks big images to PREVIEW_WIDTH in steps (halving keeps text and edges crisp). Small JPEGs are kept as they are.
async function toPreview(file) {
  const bitmap = await createImageBitmap(file)
  if (bitmap.width <= PREVIEW_WIDTH * 1.05 && file.type === 'image/jpeg') {
    bitmap.close()
    return file
  }
  const width = Math.min(bitmap.width, PREVIEW_WIDTH)
  const height = Math.round((bitmap.height * width) / bitmap.width)
  let current = bitmap
  let w = bitmap.width
  let h = bitmap.height
  while (w / 2 > width) {
    const step = document.createElement('canvas')
    step.width = Math.round(w / 2)
    step.height = Math.round(h / 2)
    const stepContext = step.getContext('2d')
    stepContext.imageSmoothingQuality = 'high'
    stepContext.drawImage(current, 0, 0, step.width, step.height)
    current.close?.()
    current = step
    w = step.width
    h = step.height
  }
  const out = document.createElement('canvas')
  out.width = width
  out.height = height
  const context = out.getContext('2d')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.imageSmoothingQuality = 'high'
  context.drawImage(current, 0, 0, width, height)
  current.close?.()
  const blob = await toJpeg(out)
  out.width = 0
  out.height = 0
  return blob
}

/**
 * Builds a book from page images (JPG or PNG), in exactly the order given (page 1 first).
 * Big HD images are scaled to 1200px wide (see PREVIEW_WIDTH) so the book opens fast on phones.
 * Returns { pages: Blob[], ratio } like readPdfBook.
 */
export async function readImageBook(files, onProgress) {
  const list = [...files] // keep the order the admin arranged
  if (!list.length) throw new PdfBookError('Choose at least one image.')
  const wrong = list.find((file) => !IMAGE_TYPES.includes(file.type))
  if (wrong) throw new PdfBookError(`"${wrong.name}" is not a JPG or PNG image.`)

  const pages = []
  let ratio = 1 / 1.4142
  for (let index = 0; index < list.length; index++) {
    try {
      if (index === 0) {
        const first = await createImageBitmap(list[0])
        ratio = first.width / first.height
        first.close()
      }
      pages.push(await toPreview(list[index]))
    } catch {
      throw new PdfBookError(`Could not read "${list[index].name}". It may be damaged.`)
    }
    onProgress?.(index + 1, list.length)
  }
  return { pages, ratio }
}
