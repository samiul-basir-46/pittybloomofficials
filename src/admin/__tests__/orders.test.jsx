import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../../App'
import { CartProvider } from '../../shared/context/CartContext'
import { SettingsProvider } from '../../shared/context/SettingsContext'
import { ordersApi } from '../../shared/services/contentService'

// The admin pages are behind sign-in; tests act as a signed-in admin.
vi.mock('../AdminAuthContext', () => ({
  AdminAuthProvider: ({ children }) => children,
  useAdminAuth: () => ({ user: { email: 'admin@example.com' }, loading: false, configured: true, isAdmin: true, signOut: async () => {}, signInWithPassword: async () => {} }),
}))

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
  it('the list shows one row per order, and a click opens the order on its own page', async () => {
    await ordersApi.save(order('PB-1', 'Fahim'))
    const user = userEvent.setup()
    open('/admin/orders')

    const link = await screen.findByRole('link', { name: /PB-1/ })
    expect(link).toHaveAttribute('href', '/admin/orders/PB-1')
    const row = within(link.closest('tr'))
    expect(row.getByText('Fahim')).toBeInTheDocument()
    expect(row.getByText('Pending')).toBeInTheDocument()
    // The details are NOT in the list
    expect(screen.queryByText('Sarah Ahmed')).not.toBeInTheDocument()
    expect(screen.queryByText(/Delivery charge/)).not.toBeInTheDocument()

    await user.click(link)
    expect(await screen.findByRole('heading', { name: /Order PB-1/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /all orders/i })).toHaveAttribute('href', '/admin/orders')
    expect(screen.getByText('s@example.com')).toBeInTheDocument()
    expect(screen.getAllByText('Gift Box').length).toBeGreaterThan(0)
  })

  it('search and status filter narrow the list', async () => {
    await ordersApi.save(order('PB-1', 'Fahim'))
    await ordersApi.save(order('PB-2', 'Nusrat', { status: 'Shipped', createdAt: '2026-10-18T10:00:00.000Z' }))
    const user = userEvent.setup()
    open('/admin/orders')
    await screen.findByRole('link', { name: /PB-1/ })
    await user.type(screen.getByRole('searchbox'), 'nusrat')
    expect(screen.queryByRole('link', { name: /PB-1/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /PB-2/ })).toBeInTheDocument()
    await user.clear(screen.getByRole('searchbox'))
    await user.selectOptions(screen.getByLabelText('Status'), 'pending')
    expect(screen.queryByRole('link', { name: /PB-2/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /PB-1/ })).toBeInTheDocument()
    await user.type(screen.getByRole('searchbox'), 'zzz')
    expect(screen.getByText(/no orders match these filters/i)).toBeInTheDocument()
  })

  it('starting to prepare an order on its page is saved', async () => {
    await ordersApi.save(order('PB-1', 'Fahim'))
    const user = userEvent.setup()
    open('/admin/orders/PB-1')
    await user.click(await screen.findByRole('button', { name: /start preparing/i }))
    expect(await screen.findByText(/marked as preparing/i)).toBeInTheDocument()
    expect((await ordersApi.list())[0].status).toBe('In production')
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
