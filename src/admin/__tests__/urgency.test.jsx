import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { vi } from 'vitest'
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
  it('past dates are overdue, today/tomorrow/within 3 days (Inside Dhaka) are urgent, later is standard', () => {
    expect(level(order('a', '2026-10-17'))).toBe('overdue')
    expect(level(order('b', '2026-10-19'))).toBe('urgent') // today
    expect(level(order('c', '2026-10-20'))).toBe('urgent') // tomorrow
    expect(level(order('d', '2026-10-22'))).toBe('urgent') // 3 days
    expect(level(order('e', '2026-10-23'))).toBe('standard') // 4 days
  })
  it('Outside Dhaka gets one more day', () => {
    expect(level(order('a', '2026-10-23', 'outside'))).toBe('urgent') // 4 days
    expect(level(order('b', '2026-10-24', 'outside'))).toBe('standard')
  })
  it('the limits are editable', () => {
    const wide = { ...settings, urgentDaysInside: 6 }
    expect(getUrgency(order('a', '2026-10-25'), wide, NOW).level).toBe('urgent')
    expect(getUrgency(order('a', '2026-10-26'), wide, NOW).level).toBe('standard')
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
      order('u2', '2026-10-22'),
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
    const list = [order('std', '2026-11-01'), order('u2', '2026-10-22'), order('over', '2026-10-15'), order('done', '2026-10-15', 'inside', { status: 'Shipped' })]
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
  it('splits the list by urgency with the most urgent first, and shows how soon each is needed', async () => {
    await seed()
    open('/admin/orders')
    await screen.findByRole('link', { name: /OVER/ })
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(headings).toEqual(['🚨 Overdue (1)', '🔥 Urgent (1)', '📅 Standard (1)', 'Shipped, delivered or cancelled (1)'])
    const ids = screen.getAllByRole('link', { name: /^(OVER|SOON|STD|DONE)/ }).map((l) => l.textContent.match(/^(OVER|SOON|STD|DONE)/)[1])
    expect(ids).toEqual(['OVER', 'SOON', 'STD', 'DONE'])
    expect(within(screen.getByRole('link', { name: /OVER/ })).getByText(/Overdue by 4 days · Thu 15 Oct/)).toBeInTheDocument()
    expect(within(screen.getByRole('link', { name: /SOON/ })).getByText(/Tomorrow · Tue 20 Oct/)).toBeInTheDocument()
    expect(within(screen.getByRole('link', { name: /STD/ })).getByText(/In 13 days · Sun 1 Nov/)).toBeInTheDocument()
    expect(within(screen.getByRole('link', { name: /DONE/ })).getByText(/Needed Thu 15 Oct/)).toBeInTheDocument()
  })

  it('urgency pills show counts and filter the list; the filter is kept in the address', async () => {
    await seed()
    const user = userEvent.setup()
    open('/admin/orders')
    await screen.findByRole('link', { name: /OVER/ })
    expect(screen.getByRole('button', { name: /^All \(4\)/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Overdue \(1\)/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^🔥 Urgent/ }))
    expect(screen.getByRole('link', { name: /SOON/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /OVER/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^🔥 Urgent/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('can be opened already filtered, e.g. from the dashboard', async () => {
    await seed()
    open('/admin/orders?urgency=overdue')
    expect(await screen.findByRole('link', { name: /OVER/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /SOON/ })).not.toBeInTheDocument()
  })

  it('"Newest first" gives a plain list ordered by when the order was placed', async () => {
    await seed()
    const user = userEvent.setup()
    open('/admin/orders')
    await screen.findByRole('link', { name: /OVER/ })
    await user.selectOptions(screen.getByLabelText(/sort orders/i), 'newest')
    expect(screen.queryByText(/🚨 Overdue \(/)).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /^(OVER|SOON|STD|DONE)/ })).toHaveLength(4)
  })

  it('copies one order summary from its row without opening the order', async () => {
    await ordersApi.save(order('SOON', '2026-10-20'))
    const user = userEvent.setup()
    open('/admin/orders')
    await screen.findByRole('link', { name: /SOON/ })
    await user.click(screen.getByRole('button', { name: 'Copy summary of SOON' }))
    expect(await navigator.clipboard.readText()).toBe('01712345678 (sarah_a) - A4(1pcs, 8p) - birthday - 609tk - urgent (need 20 October) - Cumilla')
    expect(screen.getByRole('status')).toHaveTextContent('Copied')
    expect(screen.queryByRole('heading', { name: 'SOON' })).not.toBeInTheDocument() // still on the list
  })

  it('"Copy summaries" opens the production list with urgent orders and copies them all', async () => {
    await seed()
    const user = userEvent.setup()
    open('/admin/orders')
    await user.click(await screen.findByRole('button', { name: /copy summaries/i }))
    const dialog = screen.getByRole('dialog', { name: /production summaries/i })
    expect(within(dialog).getByText('2 orders')).toBeInTheDocument()
    expect(within(dialog).getByText(/urgent \(need 15 October\)/)).toBeInTheDocument()
    expect(within(dialog).queryByText(/standard \(need 1 November\)/)).not.toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: /copy all \(2\)/i }))
    const text = await navigator.clipboard.readText()
    expect(text.split('\n\n')).toHaveLength(2)
    expect(text.split('\n\n')[0]).toContain('need 15 October') // overdue first

    await user.selectOptions(within(dialog).getByRole('combobox'), 'active')
    expect(within(dialog).getByText('3 orders')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('tells you when nothing is urgent', async () => {
    await ordersApi.save(order('STD', '2026-11-01'))
    const user = userEvent.setup()
    open('/admin/orders')
    await user.click(await screen.findByRole('button', { name: /copy summaries/i }))
    expect(screen.getByText(/nothing urgent right now/i)).toBeInTheDocument()
  })
})

describe('Order page and dashboard', () => {
  it('the order page shows the deadline and a copyable production summary', async () => {
    await ordersApi.save(order('SOON', '2026-10-20', 'inside', { delivery: 'Inside Dhaka · Tuesday, 20 October 2026' }))
    const user = userEvent.setup()
    open('/admin/orders/SOON')
    expect(await screen.findByText(/Urgent: Tomorrow/)).toBeInTheDocument()
    expect(screen.getByText('Tuesday, 20 October 2026')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /copy summary/i }))
    expect(await navigator.clipboard.readText()).toMatch(/urgent \(need 20 October\) - Cumilla$/)
  })

  it('the dashboard counts open orders by urgency and links to the filtered list', async () => {
    await seed()
    open('/admin')
    const overdue = await screen.findByRole('link', { name: /Overdue/ })
    expect(overdue).toHaveAttribute('href', '/admin/orders?urgency=overdue')
    expect(within(overdue).getByText('1')).toBeInTheDocument()
    expect(within(screen.getByRole('link', { name: /Urgent/ })).getByText('1')).toBeInTheDocument()
    expect(within(screen.getByRole('link', { name: /Standard/ })).getByText('1')).toBeInTheDocument() // the delivered one is not counted
  })
})
