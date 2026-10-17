// Admin stores a product's choices as text, one per line:  Name | Price | MRP (optional) | Tag (optional)
// e.g.  Medium (8×10 in) | 999 | 1299 | Most Popular
export const parseOptions = (text = '') =>
  text
    .split('\n')
    .map((line) => {
      const [label = '', price = '', mrp = '', tag = ''] = line.split('|').map((s) => s.trim())
      return { id: label, label, price: Number(price), mrp: Number(mrp) || 0, tag }
    })
    .filter((o) => o.label && Number.isFinite(o.price) && o.price > 0)
