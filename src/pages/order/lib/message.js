import { formatPrice } from '../../../shared/utils/format'

// The message the customer sends us on WhatsApp (or email when no number is set). It carries the whole order,
// so nothing is lost even if the order could not be saved in this browser.
export function buildOrderMessage(order, brand) {
  const c = order.customer
  const lines = [
    `New order for ${brand}`,
    `Order ID: ${order.id}`,
    '',
    `Name: ${c.name}`,
    `Phone: ${c.phone}`,
    ...(c.email ? [`Email: ${c.email}`] : []),
    ...(c.note ? [`Note: ${c.note}`] : []),
    '',
    'DELIVERY',
    ...(c.recipient ? [`Recipient: ${c.recipient}`] : []),
    `Contact number: ${c.deliveryPhone || c.phone}`,
    `Address: ${c.address}`,
    `Location: ${order.deliveryInfo?.locationLabel ?? ''}`,
    `Needed by: ${order.delivery}`,
    '',
  ]
  order.items.forEach((item, n) => {
    lines.push(`${n + 1}. ${item.kind === 'addon' ? '[Add-on] ' : ''}${item.name}${item.optionLabel && item.kind !== 'addon' ? ` (${item.optionLabel})` : ''} x${item.qty} = ${formatPrice(item.price * item.qty)}`)
    item.details?.forEach((r) => lines.push(`   ${r.label}: ${r.value}`))
    if (item.photos) {
      lines.push(`   Photos: ${item.photos.count} chosen${item.photos.front ? ` · Front: ${item.photos.front}` : ''}${item.photos.back ? ` · Back: ${item.photos.back}` : ''}`)
    }
  })
  lines.push('', `Magazines: ${formatPrice(order.magazineTotal)}`)
  if (order.addonTotal) lines.push(`Add-ons: ${formatPrice(order.addonTotal)}`)
  lines.push(`Delivery charge: ${formatPrice(order.deliveryCharge || 0)}`)
  if (order.rushCharge) lines.push(`Rush delivery: +${formatPrice(order.rushCharge)}`)
  lines.push(`TOTAL: ${formatPrice(order.total)}`)
  return lines.join('\n')
}
