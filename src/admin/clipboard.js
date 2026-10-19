// Copies text. Falls back to the old method where the browser blocks navigator.clipboard (plain http, some in-app browsers).
export async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to the fallback
  }
  try {
    const box = document.createElement('textarea')
    box.value = text
    box.setAttribute('readonly', '')
    box.style.cssText = 'position:fixed;top:0;left:0;opacity:0'
    document.body.appendChild(box)
    box.select()
    const ok = document.execCommand?.('copy') ?? false
    box.remove()
    return Boolean(ok)
  } catch {
    return false
  }
}
