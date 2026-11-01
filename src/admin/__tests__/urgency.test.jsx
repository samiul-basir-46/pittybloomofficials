import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../../App'
import { CartProvider } from '../../shared/context/CartContext'
import { SettingsProvider } from '../../shared/context/SettingsContext'
import { ordersApi } from '../../shared/services/contentService'
import { ORDER_DEFAULTS } from '../../pages/order/data'
import { compareByDelivery, getUrgency } from '../../shared/utils/urgency'
import { categoryText, cityText, formatOrderSummary, productsText, summariesFor } from '../orderSummary'

// The admin pages are behind Google/email sign-in; tests act as a signed-in admin.
vi.mock('../AdminAuthContext', () => ({
  AdminAuthProvider: ({ children }) => children,
  useAdminAuth: () => ({ user: { email: 'admin@example.com' }, loading: false, configured: true, isAdmin: true, signOut: async () => {}, signInWithPassword: async () => {} }),
}))

const NOW = new Date(2026, 9, 19, 10, 0) // Monday 19 Oct 2026
const settings = ORDER_DEFAULTS
const mag = (format, pages, occasion, qty = 1) => ({
  kind: 'magazine', id: 'm', name: 'Couple Magazine', optionLabel: `${format} Magazine · ${pages} Pages`, qty, price: 549,
  meta: { format, pages }, details: [{ label: 'Occasion', value: occasion }],
})
const order = (id, date, location = 'inside', extra = {}) => ({
  id, createdAt: `2026-10-1${id.length}T10:00:00.000Z`, status: 'New',
  customer: { name: `Customer ${id}`, phone: '01712345678', instagram: '@sarah_a', address: 'House 1, Road 2, Cumilla' },
  items: [mag('A4', 8, '🎂 Birthday')], magazineTotal: 549, addonTotal: 0, otherTotal: 0, total: 609, delivery: 'x',
  deliveryInfo: date ? { date, location, locationLabel: location === 'inside' ? 'Inside Dhaka' : 'Outside Dhaka', city: 'Cumilla' } : undefined,
  ...extra,
})
const level = (o) => getUrgency(o, settings, NOW).level

beforeEach(() => vi.useFakeTimers({ toFake: ['Date'], now: NOW }))
afterEach(() => vi.useRealTimers())

describe('urgency from the delivery date', () => {
  it('past dates are overdue, today/tomorrow/within 2 days (Inside Dhaka) are urgent, later is standard', () => {
    expect(level(order('a', '2026-10-17'))).toBe('overdue')
    expect(level(order('b', '2026-10-19'))).toBe('urgent') // today
    expect(level(order('c', '2026-10-20'))).toBe('urgent') // tomorrow
    expect(level(order('d', '2026-10-21'))).toBe('urgent') // 2 days
    expect(level(order('e', '2026-10-22'))).toBe('standard') // 3 days
  })
  it('Outside Dhaka gets one more day', () => {
    expect(level(order('a', '2026-10-22', 'outside'))).toBe('urgent') // 3 days
    expect(level(order('b', '2026-10-23', 'outside'))).toBe('standard') // 4 days
  })
  it('labels say it plainly', () => {
    const label = (date) => getUrgency(order('a', date), settings, NOW).label
    expect(label('2026-10-18')).toBe('Overdue by 1 day')
    expect(label('2026-10-16')).toBe('Overdue by 3 days')
    expect(label('2026-10-19')).toBe('Due today')
    expect(label('2026-10-20')).toBe('Tomorrow')
    expect(label('2026-10-25')).toBe('In 6 days')
  })
  it('finished orders are never urgent, and an order without a date is standard', () => {
    ;['Shipped', 'Delivered', 'Cancelled'].forEach((status) => expect(level(order('a', '2026-10-17', 'inside', { status }))).toBe('none'))
    expect(level(order('a', ''))).toBe('standard')
    expect(level(order('a', '2026-10-17', 'inside', { status: 'In production' }))).toBe('overdue')
  })
  it('sorts overdue, urgent, standard, finished; earliest date first inside each', () => {
    const list = [
      order('std', '2026-11-01'),
      order('done', '2026-10-01', 'inside', { status: 'Delivered' }),
      order('u2', '2026-10-21'),
      order('nodate', ''),
      order('over', '2026-10-15'),
      order('u1', '2026-10-20'),
    ]
    expect(list.sort((a, b) => compareByDelivery(a, b, settings, NOW)).map((o) => o.id)).toEqual(['over', 'u1', 'u2', 'std', 'nodate', 'done'])
  })
})

describe('copy summary text', () => {
  it('matches the production format', () => {
    const o = order('x', '2026-10-20', 'inside', { total: 1557, items: [mag('A4', 8, '🎂 Birthday', 1), mag('A4', 8, '💑 Couple', 1), { kind: 'addon', name: 'Gift Box', qty: 1, price: 299 }] })
    expect(formatOrderSummary(o, settings, NOW)).toBe('01712345678 (sarah_a) - A4(2pcs, 8p) ,, Gift Box - birthday | couple - 1557tk - urgent (need 20 October) - Cumilla')
  })
  it('says standard for later dates, and leaves the date out when there is none', () => {
    expect(formatOrderSummary(order('x', '2026-11-05'), settings, NOW)).toContain(' - standard (need 5 November) - ')
    expect(formatOrderSummary(order('x', ''), settings, NOW)).toMatch(/ - 609tk - standard - Cumilla$/)
  })
  it('overdue orders are written as urgent', () => {
    expect(formatOrderSummary(order('x', '2026-10-10'), settings, NOW)).toContain('urgent (need 10 October)')
  })
  it('handles different sizes, no Instagram, and old cart orders', () => {
    const o = order('x', '', 'inside', { customer: { name: 'A', phone: '018', address: 'Road 5, Dhaka' }, items: [mag('A4', 8, '🎂 Birthday', 2), mag('A5', 4, '🎂 Birthday')] })
    expect(productsText(o)).toBe('A4(2pcs, 8p) ,, A5(1pcs, 4p)')
    expect(categoryText(o)).toBe('birthday')
    expect(formatOrderSummary(o, settings, NOW)).toMatch(/^018 \(no_ig\) - /)
    expect(cityText(o)).toBe('Dhaka')
    const cart = { ...o, items: [{ kind: 'magazine', name: 'Classic', optionLabel: 'A4 · 12 Pages', qty: 1, price: 1 }] }
    expect(productsText(cart)).toBe('A4(1pcs, 12p)')
    expect(categoryText(cart)).toBe('personal')
  })
  it('summariesFor picks the right orders in delivery order', () => {
    const list = [order('std', '2026-11-01'), order('u2', '2026-10-21'), order('over', '2026-10-15'), order('done', '2026-10-15', 'inside', { status: 'Shipped' })]
    expect(summariesFor(list, 'urgent', settings, NOW).map((r) => r.order.id)).toEqual(['over', 'u2'])
    expect(summariesFor(list, 'standard', settings, NOW).map((r) => r.order.id)).toEqual(['std'])
    expect(summariesFor(list, 'active', settings, NOW).map((r) => r.order.id)).toEqual(['over', 'u2', 'std'])
  })
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
const seed = async () => {
  await ordersApi.save(order('STD', '2026-11-01'))
  await ordersApi.save(order('OVER', '2026-10-15'))
  await ordersApi.save(order('SOON', '2026-10-20'))
  await ordersApi.save(order('DONE', '2026-10-15', 'inside', { status: 'Delivered' }))
}

describe('Admin Orders list', () => {
  it('shows every order with its priority, most urgent first', async () => {
    await seed()
    open('/admin/orders')
    await screen.findByRole('link', { name: /OVER/ })
    const ids = screen.getAllByRole('link', { name: /^#(OVER|SOON|STD|DONE)/ }).map((link) => link.textContent.replace('#', ''))
    expect(ids).toEqual(['OVER', 'SOON', 'STD']) // delivered orders live under Completed orders
    expect(within(screen.getByRole('link', { name: /OVER/ }).closest('tr')).getByText('Overdue')).toBeInTheDocument()
    expect(within(screen.getByRole('link', { name: /SOON/ }).closest('tr')).getByText('Urgent')).toBeInTheDocument()
  })

  it('the priority filter narrows the list and is kept in the address', async () => {
    await seed()
    const user = userEvent.setup()
    open('/admin/orders')
    await screen.findByRole('link', { name: /OVER/ })
    await user.selectOptions(screen.getByLabelText('Filter by priority'), 'urgent')
    expect(screen.getByRole('link', { name: /SOON/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /OVER/ })).not.toBeInTheDocument()
  })

  it('can be opened already filtered, e.g. from the dashboard', async () => {
    await seed()
    open('/admin/orders?urgency=overdue')
    expect(await screen.findByRole('link', { name: /OVER/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /SOON/ })).not.toBeInTheDocument()
  })

  it('a Frame order whose design is named like a Polaroid stays under Frame, and is urgent', async () => {
    const frame = { kind: 'frame', id: 'frame', name: 'Frame', optionLabel: '4×6 in - Polaroid style', qty: 1, price: 250 }
    await ordersApi.save(order('FRAME1', '2026-12-30', 'inside', { items: [frame], total: 250 }))
    const user = userEvent.setup()
    open('/admin/orders')
    await screen.findByRole('link', { name: /FRAME1/ })
    await user.click(screen.getByRole('button', { name: /^Polaroids/ }))
    expect(screen.queryByRole('link', { name: /FRAME1/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Frame/ }))
    const row = (await screen.findByRole('link', { name: /FRAME1/ })).closest('tr')
    expect(within(row).getByText('Urgent')).toBeInTheDocument()
  })
})

describe('Order page and dashboard', () => {
  it('the order page offers a copyable production summary', async () => {
    await ordersApi.save(order('SOON', '2026-10-20', 'inside', { delivery: 'Inside Dhaka · Tuesday, 20 October 2026' }))
    const user = userEvent.setup()
    open('/admin/orders/SOON')
    await user.click(await screen.findByRole('button', { name: /copy production summary/i }))
    expect(await navigator.clipboard.readText()).toMatch(/urgent \(need 20 October\) - Cumilla$/)
  })

  it('the dashboard counts the orders that need action and links to the urgent list', async () => {
    await seed()
    open('/admin')
    expect(await screen.findByText('2 urgent')).toBeInTheDocument() // one overdue + one urgent; the delivered one is not counted
    expect(screen.getAllByRole('link', { name: 'View all' }).some((link) => link.getAttribute('href') === '/admin/orders?urgency=urgent&date=all')).toBe(true)
  })
})

describe('always-urgent products', () => {
  const base = { status: 'New', createdAt: '2026-10-20T10:00:00Z', deliveryInfo: { location: 'inside', date: '2026-12-30' } }
  it.each([
    ['frame', { kind: 'frame', name: 'Frame' }],
    ['polaroids', { kind: 'polaroids', name: 'Polaroids' }],
    ['mini magazine', { kind: 'mini-magazine', name: 'Mini' }],
    ['photo strip', { kind: 'product', id: 'photo-strip', name: 'Photo Strip' }],
  ])('%s orders are urgent even with a far delivery date', (_, item) => {
    expect(getUrgency({ ...base, items: [item] }, {}, new Date('2026-10-21T10:00:00')).level).toBe('urgent')
  })
  it('keeps magazines and song books on the delivery-date rule', () => {
    expect(getUrgency({ ...base, items: [{ kind: 'magazine', name: 'Magazine' }] }, {}, new Date('2026-10-21T10:00:00')).level).toBe('standard')
    expect(getUrgency({ ...base, items: [{ kind: 'song-book', name: 'Song Book' }] }, {}, new Date('2026-10-21T10:00:00')).level).toBe('standard')
  })
})
