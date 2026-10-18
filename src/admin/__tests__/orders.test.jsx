import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../../App'
import { CartProvider } from '../../shared/context/CartContext'
import { SettingsProvider } from '../../shared/context/SettingsContext'
import { ordersApi } from '../../shared/services/contentService'

const order = (id, name, extra = {}) => ({
  id, createdAt: '2026-10-19T00:44:00.000Z', status: 'New',
  customer: { name, phone: '01712345678', instagram: '@sarah', email: 's@example.com', address: 'House 1, Dhaka', recipient: 'Sarah', deliveryPhone: '01800000000' },
  items: [
    { kind: 'magazine', id: 'm', name: 'Couple Magazine', optionLabel: 'A4 Magazine · 8 Pages', qty: 1, price: 549, details: [{ label: 'Occasion', value: '🎂 Birthday' }, { label: 'Name of the birthday person', value: 'Sarah Ahmed' }], photos: { count: 2, front: 'a.jpg', back: 'b.jpg' } },
    { kind: 'magazine', id: 'm', name: 'Couple Magazine', optionLabel: 'A4 Magazine · 8 Pages', qty: 1, price: 549, details: [{ label: 'Occasion', value: '💑 Couple' }] },
    { kind: 'addon', id: 'x', name: 'Gift Box', optionLabel: 'Add-on', qty: 1, price: 299 },
  ],
  magazineTotal: 1098, addonTotal: 299, otherTotal: 0, deliveryCharge: 60, rushCharge: 100, total: 1557,
  delivery: 'Inside Dhaka · Monday, 19 October 2026', deliveryInfo: { locationLabel: 'Inside Dhaka' },
  ...extra,
})

const open = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <SettingsProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </SettingsProvider>
    </MemoryRouter>,
  )

describe('Admin orders: list and separate detail page', () => {
  it('the list shows a short summary only, and a click opens the order on its own page', async () => {
    await ordersApi.save(order('PB-1', 'Fahim'))
    const user = userEvent.setup()
    open('/admin/orders')

    const row = await screen.findByRole('link', { name: /PB-1/ })
    expect(row).toHaveAttribute('href', '/admin/orders/PB-1')
    expect(within(row).getByText('2 × A4 Magazine · 8 Pages + 1 extra')).toBeInTheDocument()
    expect(within(row).getByText('New')).toBeInTheDocument()
    // The details are NOT in the list any more
    expect(screen.queryByText('Sarah Ahmed')).not.toBeInTheDocument()
    expect(screen.queryByText(/Delivery charge/)).not.toBeInTheDocument()

    await user.click(row)
    expect(await screen.findByRole('heading', { name: 'PB-1' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /all orders/i })).toHaveAttribute('href', '/admin/orders')
    expect(screen.getByText('Sarah Ahmed')).toBeInTheDocument() // customization
    expect(screen.getByText('@sarah')).toBeInTheDocument()
    expect(screen.getByText('s@example.com')).toBeInTheDocument()
    expect(screen.getByText('01800000000')).toBeInTheDocument() // delivery phone when different
    expect(screen.getByText('Gift Box')).toBeInTheDocument()
    expect(screen.getByText(/Photos: 2 chosen · Front: a\.jpg · Back: b\.jpg/)).toBeInTheDocument()
    const price = within(screen.getByText('Price').closest('section'))
    expect(price.getByText('৳1098')).toBeInTheDocument()
    expect(price.getByText('৳60')).toBeInTheDocument()
    expect(price.getByText('৳100')).toBeInTheDocument()
    expect(price.getByText('৳1557')).toBeInTheDocument()
  })

  it('search and status filter narrow the list', async () => {
    await ordersApi.save(order('PB-1', 'Fahim'))
    await ordersApi.save(order('PB-2', 'Nusrat', { status: 'Delivered', createdAt: '2026-10-18T10:00:00.000Z' }))
    const user = userEvent.setup()
    open('/admin/orders')
    await screen.findByRole('link', { name: /PB-1/ })
    await user.type(screen.getByRole('searchbox'), 'nusrat')
    expect(screen.queryByRole('link', { name: /PB-1/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /PB-2/ })).toBeInTheDocument()
    await user.clear(screen.getByRole('searchbox'))
    await user.selectOptions(screen.getByLabelText(/filter by status/i), 'New')
    expect(screen.queryByRole('link', { name: /PB-2/ })).not.toBeInTheDocument()
    await user.type(screen.getByRole('searchbox'), 'zzz')
    expect(screen.getByText(/no orders match your search/i)).toBeInTheDocument()
  })

  it('changing the status on the order page is saved', async () => {
    await ordersApi.save(order('PB-1', 'Fahim'))
    const user = userEvent.setup()
    open('/admin/orders/PB-1')
    await user.selectOptions(await screen.findByLabelText(/order status/i), 'Shipped')
    expect(await screen.findByText(/status changed to shipped/i)).toBeInTheDocument()
    expect((await ordersApi.list())[0].status).toBe('Shipped')
  })

  it('deleting returns to the list', async () => {
    await ordersApi.save(order('PB-1', 'Fahim'))
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    open('/admin/orders/PB-1')
    await user.click(await screen.findByRole('button', { name: /delete order/i }))
    expect(await screen.findByText(/no orders yet/i)).toBeInTheDocument()
    expect(await ordersApi.list()).toHaveLength(0)
  })

  it('an unknown order shows a clear message with a way back', async () => {
    open('/admin/orders/NOPE')
    expect(await screen.findByText(/order not found/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /all orders/i })).toBeInTheDocument()
  })
})
