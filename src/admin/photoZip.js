const encoder = new TextEncoder()
const crcTable = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let value = n
    for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    table[n] = value >>> 0
  }
  return table
})()

const crc32 = (bytes) => {
  let crc = 0xffffffff
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

const safeName = (name) => String(name || 'photo').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').replace(/\.+$/g, '') || 'photo'
const put16 = (view, offset, value) => view.setUint16(offset, value, true)
const put32 = (view, offset, value) => view.setUint32(offset, value, true)

// ZIP method 0 (store) keeps every uploaded file byte-for-byte unchanged.
export async function createPhotoZip(files) {
  const entries = []
  const usedNames = new Set()
  for (const file of files) {
    const blob = await file.getBlob()
    if (!blob) throw new Error(`Could not load ${file.name || 'an uploaded photo'}. Please retry the download.`)
    const base = safeName(file.name)
    let name = `${file.folder ? `${safeName(file.folder)}/` : ''}${base}`
    let suffix = 2
    while (usedNames.has(name.toLowerCase())) {
      const dot = base.lastIndexOf('.')
      const stem = dot > 0 ? base.slice(0, dot) : base
      const extension = dot > 0 ? base.slice(dot) : ''
      name = `${file.folder ? `${safeName(file.folder)}/` : ''}${stem} (${suffix++})${extension}`
    }
    usedNames.add(name.toLowerCase())
    const nameBytes = encoder.encode(name)
    const data = new Uint8Array(await blob.arrayBuffer())
    entries.push({ nameBytes, data, crc: crc32(data), date: new Date(file.lastModified || Date.now()) })
  }

  const localParts = []
  const centralParts = []
  let offset = 0
  for (const entry of entries) {
    const time = (entry.date.getHours() << 11) | (entry.date.getMinutes() << 5) | Math.floor(entry.date.getSeconds() / 2)
    const date = ((Math.max(1980, entry.date.getFullYear()) - 1980) << 9) | ((entry.date.getMonth() + 1) << 5) | entry.date.getDate()
    const local = new Uint8Array(30 + entry.nameBytes.length)
    const localView = new DataView(local.buffer)
    put32(localView, 0, 0x04034b50); put16(localView, 4, 20); put16(localView, 6, 0x0800)
    put16(localView, 8, 0); put16(localView, 10, time); put16(localView, 12, date)
    put32(localView, 14, entry.crc); put32(localView, 18, entry.data.length); put32(localView, 22, entry.data.length)
    put16(localView, 26, entry.nameBytes.length); put16(localView, 28, 0); local.set(entry.nameBytes, 30)
    localParts.push(local, entry.data)

    const central = new Uint8Array(46 + entry.nameBytes.length)
    const centralView = new DataView(central.buffer)
    put32(centralView, 0, 0x02014b50); put16(centralView, 4, 20); put16(centralView, 6, 20)
    put16(centralView, 8, 0x0800); put16(centralView, 10, 0); put16(centralView, 12, time); put16(centralView, 14, date)
    put32(centralView, 16, entry.crc); put32(centralView, 20, entry.data.length); put32(centralView, 24, entry.data.length)
    put16(centralView, 28, entry.nameBytes.length); put16(centralView, 30, 0); put16(centralView, 32, 0)
    put16(centralView, 34, 0); put16(centralView, 36, 0); put32(centralView, 38, 0); put32(centralView, 42, offset)
    central.set(entry.nameBytes, 46)
    centralParts.push(central)
    offset += local.length + entry.data.length
  }
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0)
  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  put32(endView, 0, 0x06054b50); put16(endView, 4, 0); put16(endView, 6, 0)
  put16(endView, 8, entries.length); put16(endView, 10, entries.length)
  put32(endView, 12, centralSize); put32(endView, 16, offset); put16(endView, 20, 0)
  return new Blob([...localParts, ...centralParts, end], { type: 'application/zip' })
}

export async function downloadPhotoZip(files, filename) {
  if (!files.length) throw new Error('There are no photos to download.')
  const blob = await createPhotoZip(files)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename.endsWith('.zip') ? filename : `${filename}.zip`
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
