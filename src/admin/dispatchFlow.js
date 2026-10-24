// Courier hand-off for an order, split in two phases so a local save problem can never be reported as a courier failure
// and a shipment that already exists is never created twice.
const pendingKey = (orderId) => `pb:pending-shipment:${orderId}`

export const shipmentFields = (result, form, now = new Date()) => {
  const trackingNumber = String(result.tracking_code)
  const trackingUrl = String(result.consignment?.tracking_link || result.consignment?.tracking_url || result.tracking_link || result.tracking_url || result.public_tracking_url || result.customer_tracking_url || '')
  const consignmentId = String(result.consignment_id || '')
  return {
    status: 'Shipped',
    statusUpdatedAt: now.toISOString(),
    courierName: 'Steadfast Courier',
    trackingNumber,
    trackingUrl,
    tracking_link: trackingUrl,
    tracking_code: trackingNumber,
    steadfastTrackingCode: trackingNumber,
    consignmentId,
    consignment_id: consignmentId,
    steadfastConsignment: result.consignment ?? null,
    recipientName: form.recipient_name,
    customerPhone: form.recipient_phone,
    shippingAddress: form.recipient_address,
    codAmount: Number(form.cod_amount) || 0,
    ...(String(form.note || '').trim() ? { deliveryNote: String(form.note).trim() } : {}),
  }
}

export const hasShipment = (order) => Boolean(order?.trackingNumber || order?.tracking_code || order?.consignmentId || order?.consignment_id || order?.steadfastConsignment)

export const readPendingShipment = (orderId, storage = globalThis.localStorage) => {
  try { return JSON.parse(storage?.getItem(pendingKey(orderId)) || 'null') } catch { return null }
}
const writePending = (orderId, fields, storage) => { try { storage?.setItem(pendingKey(orderId), JSON.stringify(fields)) } catch { /* storage unavailable */ } }
const clearPending = (orderId, storage) => { try { storage?.removeItem(pendingKey(orderId)) } catch { /* storage unavailable */ } }

const saveWithRetry = async (save, attempts = 2) => {
  let lastError
  for (let i = 0; i < attempts; i += 1) {
    try { return await save() } catch (error) { lastError = error }
  }
  throw lastError
}

// Returns { ok:true, fields } when the order is shipped and saved,
// { ok:false, stage:'courier', message } when Steadfast refused (nothing was created),
// { ok:false, stage:'save', fields, message } when Steadfast created the shipment but the local record could not be written.
export async function dispatchOrder({ order, form, email = '', createConsignment, recordShipment, storage = globalThis.localStorage }) {
  if (hasShipment(order)) return { ok: false, stage: 'duplicate', message: 'This order already has a courier shipment. Open the tracking details instead of dispatching again.' }
  const pending = readPendingShipment(order.id, storage)
  if (pending) return finishSave({ order, fields: pending, recordShipment, storage })
  let result
  try {
    result = await createConsignment({ invoice: order.id, ...form, recipient_email: email })
  } catch (error) {
    return { ok: false, stage: 'courier', message: error instanceof Error ? error.message : 'Steadfast dispatch failed.' }
  }
  if (!result?.tracking_code) return { ok: false, stage: 'courier', message: 'Steadfast accepted the request but returned no tracking code. Check the Steadfast panel for invoice ' + order.id + ' before retrying.' }
  const fields = shipmentFields(result, form)
  writePending(order.id, fields, storage)
  return finishSave({ order, fields, recordShipment, storage })
}

async function finishSave({ order, fields, recordShipment, storage }) {
  try {
    await saveWithRetry(() => recordShipment(order.id, fields))
  } catch (error) {
    console.error('Shipment created but order record was not updated', order.id, error?.code || error?.message)
    return { ok: false, stage: 'save', fields, message: `Shipment was created at Steadfast (tracking ${fields.trackingNumber}) but the order could not be updated here. Press Dispatch again to save it - no second shipment will be created.` }
  }
  clearPending(order.id, storage)
  return { ok: true, fields }
}
