import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../../../App'
import { CartProvider } from '../../../shared/context/CartContext'
import { SettingsProvider } from '../../../shared/context/SettingsContext'
import { photoStore } from '../lib/photoStore'

const NOW = new Date(2026, 9, 18, 10, 0) // 18 Oct 2026, 10:00, before the 6 PM cut-off
let user

const open = (path = '/magazines/couple-magazine/order') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <SettingsProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </SettingsProvider>
    </MemoryRouter>,
  )
const cont = () => user.click(screen.getByRole('button', { name: /continue|place order/i }))
const orders = () => JSON.parse(localStorage.getItem('pb:orders') ?? '[]')
const type = (label, value) => user.type(screen.getByLabelText(label), value)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: NOW })
  user = userEvent.setup({ applyAccept: false })
  photoStore.clear()
})
afterEach(() => vi.useRealTimers())

async function fillBirthday() {
  await user.click(screen.getByRole('radio', { name: /birthday/i }))
  await type(/name of the birthday person/i, 'Sarah Ahmed')
  await type(/birthday date/i, '15 October 2002')
  await type(/birthday person age/i, '21st')
  await type(/cute notes/i, 'Happy birthday!')
}
async function fillDelivery(location = /inside dhaka/i) {
  await type(/contact number/i, '01712345678')
  await type(/recipient name/i, 'Sarah')
  await type(/full address/i, 'House 1, Road 2, Dhanmondi')
  await type(/city \/ district/i, 'Dhaka')
  await user.click(screen.getByRole('radio', { name: location }))
}

describe('magazine order journey', () => {
  it('goes from size selection to a saved order, with correct prices at every step', async () => {
    open()
    expect(await screen.findByRole('heading', { name: /choose your magazine/i })).toBeInTheDocument()

    // Step 1: A4 8 pages is preselected (৳549). Pick 2 copies.
    const summary = () => within(screen.getByRole('complementary'))
    expect(summary().getByText(/A4 Magazine · 8 Pages × 1/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '2' }))
    expect(summary().getAllByText('৳1098').length).toBeGreaterThan(0)
    await cont()

    // Step 2: both copies need an occasion. Required fields show errors beside the field.
    expect(await screen.findByRole('heading', { name: /personalize/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /book #1: a4 magazine \(8 pages\)/i })).toBeInTheDocument()
    await cont()
    expect(screen.getAllByText(/please choose an occasion/i)).toHaveLength(2)
    const book1 = within(screen.getByRole('region', { name: /book #1/i }))
    await user.click(book1.getByRole('radio', { name: /birthday/i }))
    await user.type(book1.getByLabelText(/name of the birthday person/i), 'Sarah Ahmed')
    await user.type(book1.getByLabelText(/birthday date/i), '15 October 2002')
    await user.type(book1.getByLabelText(/birthday person age/i), '21st')
    // Book #2 copies Book #1
    await user.click(screen.getByRole('button', { name: /same details as book #1/i }))
    await cont()

    // Step 3: photos are optional but counted. Add 2 and make the first the front page.
    expect(await screen.findByRole('heading', { name: /upload your photos/i })).toBeInTheDocument()
    const file = (n) => new File(['x'], n, { type: 'image/jpeg' })
    await user.upload(screen.getByTestId('photo-input-A4:1'), [file('a.jpg'), file('b.jpg'), new File(['x'], 'doc.pdf', { type: 'application/pdf' })])
    expect(screen.getByText(/2 photos added/i)).toBeInTheDocument()
    expect(screen.getByText(/1 file was not a picture/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /use a.jpg as front page/i }))
    await cont()

    // Step 4: delivery. Nothing is filled in, so every field reports its own error.
    expect(await screen.findByRole('heading', { name: /delivery details/i })).toBeInTheDocument()
    await cont()
    expect(screen.getByText(/enter a contact number|please enter a contact number/i)).toBeInTheDocument()
    expect(screen.getByText(/please enter the full address/i)).toBeInTheDocument()
    expect(screen.getByText(/choose inside dhaka or outside dhaka/i)).toBeInTheDocument()
    expect(screen.getByText(/choose the date you need/i)).toBeInTheDocument()

    await fillDelivery()
    expect(summary().getByText(/Delivery \(Inside Dhaka\)/)).toBeInTheDocument()
    // Today is unavailable, tomorrow is +100 (rush)
    expect(screen.getByRole('button', { name: /sunday, 18 october$/i })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /monday, 19 october, rush delivery plus ৳100/i }))
    expect(summary().getByText(/Rush delivery \(1 day\)/)).toBeInTheDocument()
    expect(summary().getByText('৳1258')).toBeInTheDocument() // 1098 + 60 + 100
    await cont()

    // Step 5: your info
    expect(await screen.findByRole('heading', { name: /your info/i })).toBeInTheDocument()
    await cont()
    expect(screen.getByText(/please enter your name/i)).toBeInTheDocument()
    expect(screen.getByText(/please enter your whatsapp number/i)).toBeInTheDocument()
    expect(screen.getByText(/please enter your instagram username/i)).toBeInTheDocument()
    await type(/your name/i, 'Fahim Ahmed')
    await user.click(screen.getByRole('button', { name: /use the delivery number/i }))
    await type(/instagram username/i, 'https://instagram.com/fahim')
    await cont()
    expect(screen.getByText(/not a link/i)).toBeInTheDocument() // a profile link is not a username
    await user.clear(screen.getByLabelText(/instagram username/i))
    await type(/instagram username/i, 'fahim.ahmed')
    await cont()

    // Step 6: review shows everything, then places the order once
    expect(await screen.findByRole('heading', { name: /review your order/i })).toBeInTheDocument()
    expect(screen.getAllByText('Sarah Ahmed', { selector: 'dd' })).toHaveLength(2) // both copies
    expect(screen.getByText(/2 chosen · Front: a\.jpg/)).toBeInTheDocument()
    expect(screen.getAllByText('৳1258').length).toBeGreaterThan(0)
    const place = screen.getByRole('button', { name: /place order/i })
    await user.dblClick(place) // a double click must not create two orders
    expect(await screen.findByRole('heading', { name: /the order has been placed/i })).toBeInTheDocument()

    const saved = orders()
    expect(saved).toHaveLength(1)
    const order = saved[0]
    // The success screen is just the title and the Order ID, with no extra instructions
    expect(screen.getByText(/order id:/i)).toHaveTextContent(`Order ID: ${order.id}`)
    expect(screen.queryByText(/whatsapp|what to do next|almost done/i)).not.toBeInTheDocument()
    expect(order).toMatchObject({ status: 'New', magazineTotal: 1098, addonTotal: 0, deliveryCharge: 60, rushCharge: 100, total: 1258 })
    expect(order.items).toHaveLength(2)
    expect(order.items[0]).toMatchObject({ kind: 'magazine', qty: 1, price: 549, optionLabel: 'A4 Magazine · 8 Pages' })
    expect(order.items[0].details).toEqual(
      expect.arrayContaining([
        { label: 'Occasion', value: '🎂 Birthday' },
        { label: 'Name of the birthday person', value: 'Sarah Ahmed' },
      ]),
    )
    expect(order.items[0].photos).toMatchObject({ count: 2, front: 'a.jpg' })
    expect(order.customer).toMatchObject({ name: 'Fahim Ahmed', phone: '01712345678', instagram: '@fahim.ahmed', address: 'House 1, Road 2, Dhanmondi, Dhaka' })
    expect(order.delivery).toMatch(/Inside Dhaka · Monday, 19 October 2026/)
    expect(sessionStorage.getItem('pb:order-draft')).toBeNull()
  })

  it('keeps what was typed when going back and forth', async () => {
    open()
    await screen.findByRole('heading', { name: /choose your magazine/i })
    await cont()
    await screen.findByRole('heading', { name: /personalize/i })
    await user.click(screen.getByRole('radio', { name: /couple/i }))
    await type(/name of the couples/i, 'Fahim & Sarah')
    await user.click(screen.getAllByRole('button', { name: /^back$/i }).at(-1))
    await screen.findByRole('heading', { name: /choose your magazine/i })
    await cont()
    expect(await screen.findByLabelText(/name of the couples/i)).toHaveValue('Fahim & Sarah')
  })

  it('survives a refresh (draft is kept in the tab)', async () => {
    const first = open()
    await screen.findByRole('heading', { name: /choose your magazine/i })
    await user.click(screen.getByRole('button', { name: '3' }))
    first.unmount()
    open()
    await screen.findByRole('heading', { name: /choose your magazine/i })
    expect(within(screen.getByRole('complementary')).getByText(/× 3/)).toBeInTheDocument()
  })

  it('lets a customer order A4 and A5 together; A5 has no 8-page option until it is priced', async () => {
    open()
    await screen.findByRole('heading', { name: /choose your magazine/i })
    await user.click(screen.getByRole('checkbox', { name: /a5 magazine/i }))
    const a5 = screen.getByRole('radiogroup', { name: /a5 magazine page count/i })
    expect(within(a5).getAllByRole('radio')).toHaveLength(1) // only 4p (৳200); 8p is hidden until Admin sets its price
    expect(within(a5).getByRole('radio', { name: /4p/ })).toBeInTheDocument()
    expect(within(screen.getByRole('complementary')).getByText('৳749')).toBeInTheDocument() // 549 + 200
  })

  it('will not let the last size be deselected and continue', async () => {
    open()
    await screen.findByRole('heading', { name: /choose your magazine/i })
    await user.click(screen.getByRole('checkbox', { name: /a4 magazine/i }))
    await cont()
    expect(screen.getByText(/please choose at least one magazine size/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /choose your magazine/i })).toBeInTheDocument()
  })

  it('Outside Dhaka: higher delivery charge, no rush dates', async () => {
    open()
    await screen.findByRole('heading', { name: /choose your magazine/i })
    await cont()
    await screen.findByRole('heading', { name: /personalize/i })
    await user.click(screen.getByRole('radio', { name: /couple/i }))
    await type(/name of the couples/i, 'Fahim & Sarah')
    await cont()
    await cont() // photos are optional
    await screen.findByRole('heading', { name: /delivery details/i })
    await fillDelivery(/outside dhaka/i)
    expect(screen.getByRole('button', { name: /tuesday, 20 october$/i })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /wednesday, 21 october$/i }))
    expect(within(screen.getByRole('complementary')).getByText('৳659')).toBeInTheDocument() // 549 + 110
  })

  it('clears the date when switching to a location where it is not allowed', async () => {
    open()
    await screen.findByRole('heading', { name: /choose your magazine/i })
    await cont()
    await user.click(await screen.findByRole('radio', { name: /couple/i }))
    await type(/name of the couples/i, 'A & B')
    await cont()
    await cont()
    await screen.findByRole('heading', { name: /delivery details/i })
    await fillDelivery()
    await user.click(screen.getByRole('button', { name: /monday, 19 october/i }))
    await user.click(screen.getByRole('radio', { name: /outside dhaka/i }))
    expect(within(screen.getByRole('complementary')).queryByText(/rush/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/· No rush charge/)).not.toBeInTheDocument()
  })

  it('shows an error instead of the success screen when the order cannot be saved, and a retry places it once', async () => {
    open()
    await screen.findByRole('heading', { name: /choose your magazine/i })
    await cont()
    await screen.findByRole('heading', { name: /personalize/i })
    await user.click(screen.getByRole('radio', { name: /couple/i }))
    await type(/name of the couples/i, 'Fahim & Sarah')
    await cont()
    await cont() // photos are optional
    await screen.findByRole('heading', { name: /delivery details/i })
    await fillDelivery(/outside dhaka/i)
    await user.click(screen.getByRole('button', { name: /wednesday, 21 october$/i }))
    await cont()
    await screen.findByRole('heading', { name: /your info/i })
    await type(/your name/i, 'Fahim Ahmed')
    await user.click(screen.getByRole('button', { name: /use the delivery number/i }))
    await type(/instagram username/i, '@fahim.ahmed')
    await cont()
    await screen.findByRole('heading', { name: /review your order/i })

    // Saving the order fails (for example the browser storage is full)
    const realSetItem = Storage.prototype.setItem
    const failing = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === 'pb:orders') throw new Error('storage full')
      return realSetItem.call(this, key, value)
    })
    await cont()
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be saved/i)
    expect(screen.queryByRole('heading', { name: /the order has been placed/i })).not.toBeInTheDocument()
    expect(orders()).toHaveLength(0)
    expect(sessionStorage.getItem('pb:order-draft')).not.toBeNull() // nothing the customer entered is lost

    // Trying again once saving works places exactly one order
    failing.mockRestore()
    await cont()
    expect(await screen.findByRole('heading', { name: /the order has been placed/i })).toBeInTheDocument()
    expect(orders()).toHaveLength(1)
  })

  it('saves an unfinished order to the cart and resumes it at the same step, without duplicates', async () => {
    const first = open()
    await screen.findByRole('heading', { name: /choose your magazine/i })
    await cont()
    await screen.findByRole('heading', { name: /personalize/i })
    await user.click(screen.getByRole('radio', { name: /couple/i }))
    await type(/name of the couples/i, 'Fahim & Sarah')

    // Nothing else is filled in, and saving still works
    await user.click(screen.getByRole('button', { name: /save to cart/i }))
    expect(await screen.findByText(/saved to your cart/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /save to cart/i })) // saving again updates the same draft
    await screen.findByText(/saved to your cart/i)
    expect(JSON.parse(localStorage.getItem('pb:saved-drafts'))).toHaveLength(1)
    expect(orders()).toHaveLength(0) // a draft is not an order
    first.unmount()
    sessionStorage.clear() // as if the customer came back later, in a new tab

    // The cart lists the draft, and Resume order opens it at step 2 with the answers still there
    open('/cart')
    expect(await screen.findByText(/draft · not ordered yet/i)).toBeInTheDocument()
    expect(screen.getByText(/step 2 of 6/i)).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: /resume order/i }))
    expect(await screen.findByLabelText(/name of the couples/i)).toHaveValue('Fahim & Sarah')
    expect(screen.getByRole('heading', { name: /personalize/i })).toBeInTheDocument()
  })

  it('shows the order form for the cart-free Buy Now start and falls back safely for a missing magazine', async () => {
    open('/magazines/does-not-exist/order')
    expect(await screen.findByText(/magazine not found/i)).toBeInTheDocument()
  })
})
