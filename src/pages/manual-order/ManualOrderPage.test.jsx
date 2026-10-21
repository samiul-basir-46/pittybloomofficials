import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ManualOrderPage from './ManualOrderPage'

vi.mock('../../shared/services/contentService', () => ({
  getProducts: async () => [{ id: 'frame', name: 'Frame', options: 'Medium (8×10 in) | 999\nLarge (12×16 in) | 1499' }],
  getSizes: async () => [
    { id: 'a4-4', format: 'A4', pages: 4, price: 299 },
    { id: 'a4-8', format: 'A4', pages: 8, price: 549 },
    { id: 'a4-20', format: 'A4', pages: 20, price: 1149 },
    { id: 'a5-4', format: 'A5', pages: 4, price: 200 },
  ],
  getOrderSettings: async () => ({ insideDhakaCharge: 60, outsideDhakaCharge: 110 }),
}))

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('guest manual order journey', () => {
  it('submits a Polaroid, custom magazine, and Song Book without signing in', async () => {
    const user = userEvent.setup()
    const savedPayloads = []
    const fetchMock = vi.fn(async (url, options = {}) => {
      if (options.method === 'PUT') {
        const [, sessionId, fileId] = String(url).match(/guest-media\/([^/]+)\/([^/?]+)/) || []
        return new Response(JSON.stringify({ key: `manual-orders/${sessionId}/${fileId}` }), { status: 201 })
      }
      if (String(url).endsWith('/guest-orders')) {
        savedPayloads.push(JSON.parse(options.body))
        return new Response(JSON.stringify({ order: { id: 'PB-TEST-0001', total: 2527, delivery: 'Inside Dhaka', deliveryInfo: { date: '2026-12-25' }, customer: { name: 'Mina' } } }), { status: 201 })
      }
      throw new Error(`Unexpected request ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    URL.createObjectURL = vi.fn(() => 'blob:manual-order-preview')
    URL.revokeObjectURL = vi.fn()

    const { container } = render(<MemoryRouter><ManualOrderPage /></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: 'Build your order' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Polaroids/ }))
    await user.click(screen.getByRole('button', { name: /A custom magazine made around your story/ }))
    await user.click(screen.getByRole('button', { name: /Song Book/ }))

    const file = (name) => new File([new Uint8Array([0xff, 0xd8, 0xff])], name, { type: 'image/jpeg' })
    const uploaders = () => [...container.querySelectorAll('input[type="file"]')]
    fireEvent.change(uploaders()[0], { target: { files: [file('polaroid.jpg')] } })
    fireEvent.change(uploaders()[2], { target: { files: [file('mag-front.jpg'), file('mag-back.jpg')] } })
    fireEvent.change(uploaders()[3], { target: { files: [file('song-front.jpg'), file('song-back.jpg')] } })

    await user.selectOptions(screen.getByLabelText(/Size and page count/), 'a4-20')
    await user.type(screen.getByLabelText(/Birthday person's name/i), 'Asha')
    await user.type(screen.getByLabelText(/^Age/), '20')
    fireEvent.change(screen.getByLabelText(/Birthday date/i), { target: { value: '2026-12-20' } })
    expect(screen.getAllByText('2 selected')).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: 'Use mag-front.jpg for front cover' }))
    await user.click(screen.getByRole('button', { name: 'Use mag-back.jpg for back cover' }))
    await user.type(screen.getByLabelText(/Song name/i), 'Our Song')
    await user.type(screen.getByLabelText(/Song lyrics/i), 'A few lines that tell the story of a favourite song and a special memory.')
    await user.click(screen.getByRole('button', { name: 'Use song-front.jpg for front cover' }))
    await user.click(screen.getByRole('button', { name: 'Use song-back.jpg for back cover' }))

    await user.click(screen.getByRole('button', { name: /Continue to delivery/i }))
    await user.type(screen.getByLabelText(/Recipient's full name/i), 'Rafi')
    await user.type(screen.getByLabelText(/Recipient's phone number/i), '01812345678')
    await user.type(screen.getByLabelText(/Full delivery address/i), 'House 4, Road 2')
    await user.type(screen.getByLabelText(/City or district/i), 'Dhaka')
    await user.selectOptions(screen.getByLabelText(/Delivery area/i), 'inside')
    const availableDate = container.querySelector('button[aria-label^="Select "]:not([disabled])')
    expect(availableDate).toBeTruthy()
    await user.click(availableDate)
    await user.click(screen.getByRole('button', { name: /Continue to your information/i }))
    await user.type(screen.getByLabelText(/Your name/), 'Mina')
    await user.type(screen.getByLabelText(/Your Instagram username/i), 'mina.gifts')
    await user.type(screen.getByLabelText(/Your WhatsApp number/i), '01712345678')
    await user.click(screen.getByRole('button', { name: /Review order/i }))
    expect(await screen.findByRole('heading', { name: /Review your order/i })).toBeInTheDocument()
    expect(screen.getByText('Grand total')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Place order/i }))
    expect(await screen.findByText('PB-TEST-0001')).toBeInTheDocument()
    expect(savedPayloads).toHaveLength(1)
    expect(savedPayloads[0].items.map((item) => item.type)).toEqual(['polaroids', 'magazine', 'song-book'])
    expect(savedPayloads[0].customer).toMatchObject({ name: 'Mina', instagram: 'mina.gifts', whatsapp: '01712345678' })
    expect(savedPayloads[0].delivery).toMatchObject({ recipient: 'Rafi', area: 'inside' })
    expect(savedPayloads[0].items[1].photos).toHaveLength(2)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/guest-orders$/), expect.any(Object)))
  })
})
