import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Check, ChevronRight, Clock3, ExternalLink, LocateFixed, LogIn, LogOut, Package, Save, ShoppingBag, Truck, X } from 'lucide-react'
import { useAuth } from '../../shared/context/AuthContext'
import { useSettings } from '../../shared/context/SettingsContext'
import { customerProfileApi, ordersApi } from '../../shared/services/contentService'
import { whatsappNumber } from '../../shared/utils/social'
import useAsync from '../../shared/hooks/useAsync'
import { formatPrice } from '../../shared/utils/format'

const dateText = (value, options = { day: '2-digit', month: 'short', year: 'numeric' }) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-GB', options)
}
const dateTimeText = (value) => {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
const initials = (name = '') => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'A'
const statusStyle = {
  New: 'bg-[#F3E9CF] text-[#6B531A]',
  Confirmed: 'bg-[#F3E9CF] text-[#6B531A]',
  'In production': 'bg-[#F3E9CF] text-[#6B531A]',
  Shipped: 'bg-[#E1E8EE] text-[#33495C]',
  Delivered: 'bg-[#E0EBDD] text-[#2F5230]',
  Cancelled: 'bg-[#F6E3DF] text-[#8F3A31]',
}
const statusLabel = { New: 'Order received', Confirmed: 'Confirmed', 'In production': 'Preparing', Shipped: 'Dispatched', Delivered: 'Delivered', Cancelled: 'Cancelled' }
const stages = [
  { title: 'Order placed', statuses: ['New', 'Confirmed', 'In production', 'Shipped', 'Delivered'] },
  { title: 'Preparing your order', statuses: ['Confirmed', 'In production', 'Shipped', 'Delivered'] },
  { title: 'Dispatched', statuses: ['Shipped', 'Delivered'] },
  { title: 'Delivered', statuses: ['Delivered'] },
]
const GEOCODER_URL = import.meta.env.VITE_REVERSE_GEOCODER_URL || 'https://nominatim.openstreetmap.org/reverse'

function Card({ children, className = '' }) {
  return <section className={`rounded-2xl border border-[#E6E2D8] bg-[#FDFCF9] p-5 sm:p-6 ${className}`}>{children}</section>
}
function Label({ children }) {
  return <h2 className="mb-3 text-xs font-semibold uppercase tracking-[.08em] text-[#6B665C]">{children}</h2>
}
function OrderStatus({ status }) {
  return <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${statusStyle[status] || 'bg-[#EFEBE1] text-[#4A463E]'}`}><i className="size-1.5 rounded-full bg-current opacity-70" />{statusLabel[status] || status || 'Pending'}</span>
}
function OrderListItem({ order, selected, onClick }) {
  const itemText = (order.items || []).map((item) => `${item.name}${item.qty > 1 ? ` × ${item.qty}` : ''}`).join(', ')
  return <button type="button" onClick={onClick} aria-current={selected ? 'true' : undefined} className={`mb-2 flex min-h-12 w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${selected ? 'border-[#532F30] bg-[#F6EFEE] shadow-[inset_0_0_0_1px_#532F30]' : 'border-[#E6E2D8] bg-[#FFFEFB] hover:bg-[#F7F5F0]'}`}>
    <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">#{order.id}</div><div className="truncate text-xs text-[#6B665C]">{itemText || 'Order'} · {dateText(order.createdAt, { day: '2-digit', month: 'short' })}</div></div>
    <OrderStatus status={order.status} />
  </button>
}

function GoogleAvatar({ user, name, size = 'size-10' }) {
  const photos = [...new Set([user?.photoURL, user?.providerData?.find((provider) => provider.providerId === 'google.com')?.photoURL].filter(Boolean))]
  const [photoIndex, setPhotoIndex] = useState(0)
  useEffect(() => setPhotoIndex(0), [user?.uid, photos.join('|')])
  if (!photos[photoIndex]) return <span className={`grid ${size} shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#8A5A5B] to-[#532F30] font-serif text-sm text-white`}>{initials(name)}</span>
  return <img src={photos[photoIndex]} alt={`${name} Google profile`} referrerPolicy="no-referrer" onError={() => setPhotoIndex((current) => current + 1)} className={`${size} shrink-0 rounded-full border border-[#E6E2D8] bg-[#F4F1EA] object-cover`} />
}

function OrderTracking({ order, helpUrl }) {
  if (!order) return <Card className="grid min-h-72 place-items-center text-center"><div><ShoppingBag className="mx-auto mb-3 text-[#9A8870]" size={28} /><h2 className="font-serif text-2xl">Your orders will appear here</h2><p className="mt-2 max-w-sm text-sm text-[#6B665C]">Once you place an order, you can follow its progress and delivery details from this page.</p><Link to="/magazines" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#532F30] px-5 text-sm font-medium text-white hover:bg-[#432526]">Explore the store</Link></div></Card>

  const status = order.status || 'New'
  const cancelled = status === 'Cancelled'
  const trackingNumber = order.trackingNumber || order.tracking_code || order.steadfastTrackingCode
  const directTrackingUrl = order.trackingUrl || order.tracking_link || order.steadfastConsignment?.tracking_link || order.steadfastConsignment?.tracking_url || ''
  const trackingUrl = /^https:\/\/(www\.)?steadfast\.com\.bd\//i.test(directTrackingUrl)
    ? directTrackingUrl
    : ''
  const recipient = order.customer?.recipient || order.customer?.name || '—'
  const address = order.customer?.address || '—'
  const phone = order.customer?.deliveryPhone || order.customer?.phone || '—'
  const deliveryDate = order.deliveryInfo?.date
  const statusAt = order.statusUpdatedAt || order.createdAt
  const items = order.items || []

  return <div className="flex flex-col gap-5">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0"><div className="mb-1 text-xs text-[#6B665C]">My orders <ChevronRight className="inline" size={13} /> #{order.id}</div><h1 className="break-words font-serif text-[30px] font-medium leading-tight tracking-[-.01em] sm:text-[34px]">Order #{order.id}</h1><p className="mt-1 text-sm text-[#6B665C]">Placed {dateText(order.createdAt)}</p></div>
      <OrderStatus status={status} />
    </div>

    <Card>
      <Label>Order progress</Label>
      {cancelled ? <div className="rounded-xl border border-[#F1D5D0] bg-[#FCF1EF] p-4"><div className="font-medium text-[#8F3A31]">This order was cancelled</div><p className="mt-1 text-sm text-[#6B665C]">If you need help, <a href={helpUrl} target="_blank" rel="noreferrer" className="font-medium text-[#532F30] underline">contact us on WhatsApp.</a></p></div> : <>
        <div className="mb-5 rounded-xl bg-[#F6EFEE] px-4 py-3"><div className="text-xs text-[#6B665C]">{status === 'Delivered' ? 'Delivered' : 'Expected delivery'}</div><div className="font-serif text-xl sm:text-2xl">{deliveryDate ? dateText(deliveryDate, { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }) : 'We’ll confirm your delivery date soon'}</div></div>
        <ol className="space-y-0">
          {stages.map((stage, index) => {
            const done = stage.statuses.includes(status)
            const current = index === 0 ? status === 'New' : (stage.statuses.includes(status) && !stages[index + 1]?.statuses.includes(status))
            const Icon = index === 0 ? Check : index === 2 ? Truck : index === 3 ? Package : Clock3
            return <li key={stage.title} className={`relative flex gap-4 pb-5 last:pb-0 ${index < stages.length - 1 ? 'before:absolute before:left-[13px] before:top-7 before:h-[calc(100%-8px)] before:w-0.5 before:bg-[#E0DBCE]' : ''} ${done && index < 3 ? 'before:!bg-[#532F30]' : ''}`}>
              <span className={`relative z-10 grid size-7 shrink-0 place-items-center rounded-full text-xs ${current ? 'border-[3px] border-[#532F30] bg-[#FDFCF9] text-[#532F30] shadow-[0_0_0_4px_#F1E6E4]' : done ? 'bg-[#532F30] text-white' : 'bg-[#EFEBE1] text-[#6B665C]'}`}><Icon size={14} strokeWidth={current ? 2.5 : 2} /></span>
              <div className="min-w-0 pt-0.5"><div className={`text-sm font-medium ${current ? 'text-[#532F30]' : ''}`}>{stage.title}</div><div className="text-xs text-[#6B665C]">{current ? `${dateTimeText(statusAt)} · In progress` : done ? (index === 0 ? dateTimeText(order.createdAt) : 'Complete') : index === 2 && !trackingNumber ? 'Courier and tracking details will appear here' : ''}</div></div>
            </li>
          })}
        </ol>
        {trackingNumber && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E6E2D8] bg-[#F4F1EA] p-4"><div><p className="text-xs text-[#6B665C]">{order.courierName || 'Steadfast'} tracking</p>{trackingUrl ? <p className="mt-1 text-sm font-medium">Open the direct tracking link to follow your parcel.</p> : <p className="mt-1 text-sm text-[#6B665C]">The direct tracking link will appear here when Steadfast provides it.</p>}</div>{trackingUrl && <a href={trackingUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#D9D4C7] bg-[#FDFCF9] px-3 text-sm font-medium hover:bg-white">Track parcel <ExternalLink size={14} /></a>}</div>}
      </>}
    </Card>

    <Card><Label>Items in this order</Label>{items.map((item, index) => <div key={`${item.id}-${index}`} className={`flex justify-between gap-3 py-3 ${index < items.length - 1 ? 'border-b border-dashed border-[#E0DBCE]' : ''}`}><div className="min-w-0"><div className="font-medium">{item.name} {item.optionLabel && <span className="ml-1 inline-block rounded-full bg-[#EFEBE1] px-2.5 py-0.5 text-xs font-normal text-[#4A463E]">{item.optionLabel}</span>}</div>{item.note && <p className="mt-1 text-sm text-[#6B665C]">{item.note}</p>}</div><span className="shrink-0 text-sm font-medium">× {item.qty}</span></div>)}{!items.length && <p className="text-sm text-[#6B665C]">No item details available.</p>}</Card>

    <div className="grid gap-5 sm:grid-cols-2">
      <Card><Label>Delivery</Label><div className="space-y-3 text-sm"><div><div className="text-xs text-[#6B665C]">Recipient</div><div className="font-medium">{recipient}</div></div><div><div className="text-xs text-[#6B665C]">Address</div><div className="font-medium">{address}</div></div><div><div className="text-xs text-[#6B665C]">Phone</div><a className="font-medium underline decoration-[#D9D4C7] underline-offset-2" href={`tel:${phone}`}>{phone}</a></div>{order.deliveryInfo?.locationLabel && <div><div className="text-xs text-[#6B665C]">Delivery area</div><div className="font-medium">{order.deliveryInfo.locationLabel}{order.deliveryInfo.city ? ` · ${order.deliveryInfo.city}` : ''}</div></div>}</div></Card>
      <Card><Label>Payment</Label><div className="space-y-2 text-sm">{order.deliveryInfo && <div className="flex justify-between gap-3 border-b border-dashed border-[#E0DBCE] py-2"><span className="text-[#6B665C]">Items</span><span>{formatPrice((order.magazineTotal || 0) + (order.addonTotal || 0) + (order.otherTotal || 0))}</span></div>}{order.deliveryInfo && <div className="flex justify-between gap-3 border-b border-dashed border-[#E0DBCE] py-2"><span className="text-[#6B665C]">Delivery charge</span><span>{formatPrice(order.deliveryCharge || 0)}</span></div>}{!!order.rushCharge && <div className="flex justify-between gap-3 border-b border-dashed border-[#E0DBCE] py-2"><span className="text-[#6B665C]">Rush delivery</span><span>{formatPrice(order.rushCharge)}</span></div>}<div className="flex justify-between gap-3 pt-2 font-semibold"><span>Total</span><span className="font-serif text-xl">{formatPrice(order.total)}</span></div><p className="pt-1 text-xs text-[#6B665C]">Cash on delivery</p></div></Card>
    </div>
    <a href={helpUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 self-start items-center rounded-xl bg-[#532F30] px-5 text-sm font-medium text-white transition-colors hover:bg-[#432526]">Need help? Chat on WhatsApp</a>
  </div>
}

export default function AccountPage() {
  const { user, loading, configured, signInWithGoogle, signOut } = useAuth()
  const { settings: site } = useSettings()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [locating, setLocating] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileNotice, setProfileNotice] = useState('')
  const [savedProfile, setSavedProfile] = useState(null)
  const [liveOrders, setLiveOrders] = useState(null)
  const [liveSelectedOrder, setLiveSelectedOrder] = useState(null)
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', instagram: '', address: '', city: '' })
  const next = params.get('next')
  const ordersQuery = useAsync(() => user ? ordersApi.listMine() : Promise.resolve([]), [user?.uid])
  const profileQuery = useAsync(() => customerProfileApi.get(user?.uid), [user?.uid])
  useEffect(() => {
    if (!user) {
      setLiveOrders(null)
      return undefined
    }
    setLiveOrders(null)
    return ordersApi.watch?.(
      (nextOrders) => setLiveOrders(nextOrders),
      (watchError) => console.error('Live customer order updates failed:', watchError),
    )
  }, [user?.uid])
  const orders = liveOrders ?? ordersQuery.data ?? []
  const selectedOrder = useMemo(() => orders.find((order) => order.id === params.get('order')) || orders[0] || null, [orders, params])
  useEffect(() => {
    if (!user || !selectedOrder?.id) {
      setLiveSelectedOrder(null)
      return undefined
    }
    setLiveSelectedOrder(null)
    return ordersApi.watchOne?.(
      selectedOrder.id,
      (updatedOrder) => setLiveSelectedOrder(updatedOrder),
      (watchError) => console.error(`Live updates failed for order ${selectedOrder.id}:`, watchError),
    )
  }, [user?.uid, selectedOrder?.id])
  const trackingOrder = liveSelectedOrder?.id === selectedOrder?.id ? liveSelectedOrder : selectedOrder
  const customer = trackingOrder?.customer || {}
  const displayName = user?.displayName || customer.name || user?.email || 'Your account'
  const supportNumber = whatsappNumber(site.whatsapp)
  const supportUrl = supportNumber ? `https://wa.me/${supportNumber}` : `mailto:${site.email}`
  const profile = savedProfile || (profileQuery.data && Object.keys(profileQuery.data).length ? profileQuery.data : {
    name: customer.name || user?.displayName || '', phone: customer.phone || '', instagram: customer.instagram || '',
    address: customer.address || '', city: selectedOrder?.deliveryInfo?.city || '',
  })

  useEffect(() => {
    if (user && next) navigate(next.startsWith('/') ? next : '/cart', { replace: true })
  }, [user, next, navigate])
  useEffect(() => {
    if (selectedOrder && params.get('order') !== selectedOrder.id) {
      const nextParams = new URLSearchParams(params)
      nextParams.set('order', selectedOrder.id)
      setParams(nextParams, { replace: true })
    }
  }, [selectedOrder, params, setParams])

  const login = async () => {
    setError(''); setBusy(true)
    try { await signInWithGoogle() }
    catch (e) { setError(e?.code === 'auth/popup-closed-by-user' ? 'Sign-in was cancelled.' : e.message || 'Google sign-in failed. Please try again.') }
    finally { setBusy(false) }
  }
  const selectOrder = (order) => {
    const nextParams = new URLSearchParams(params)
    nextParams.set('order', order.id)
    setParams(nextParams)
  }
  const openProfileEditor = () => {
    setProfileError('')
    setProfileNotice('')
    setProfileForm({
      name: profile.name || user?.displayName || '', phone: profile.phone || '', instagram: profile.instagram || '',
      address: profile.address || '', city: profile.city || '',
    })
    setEditingProfile(true)
  }
  const setProfileField = (key) => (event) => setProfileForm((current) => ({ ...current, [key]: event.target.value }))
  const useCurrentLocation = () => {
    setProfileError('')
    if (!navigator.geolocation) { setProfileError('This browser does not support location access.'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const url = new URL(GEOCODER_URL)
        url.searchParams.set('format', 'jsonv2')
        url.searchParams.set('addressdetails', '1')
        url.searchParams.set('zoom', '18')
        url.searchParams.set('lat', String(coords.latitude))
        url.searchParams.set('lon', String(coords.longitude))
        const response = await fetch(url, { headers: { 'Accept-Language': 'en' } })
        if (!response.ok) throw new Error('Could not look up an address for this location.')
        const result = await response.json()
        const parts = result.address || {}
        const street = [parts.house_number, parts.road].filter(Boolean).join(' ')
        const area = parts.neighbourhood || parts.suburb || parts.quarter || parts.city_district || ''
        const address = [street, area].filter(Boolean).join(', ') || result.display_name || `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
        const city = parts.city || parts.town || parts.village || parts.municipality || parts.county || parts.state || ''
        setProfileForm((current) => ({ ...current, address, city: city || current.city }))
        setProfileNotice('Location found. Please check the address before saving.')
      } catch (error) {
        setProfileError(error.message || 'Could not find an address for this location. Enter it manually.')
      } finally { setLocating(false) }
    }, (error) => {
      setLocating(false)
      setProfileError(error.code === error.PERMISSION_DENIED ? 'Location access was denied. Allow location permission in your browser, or enter the address manually.' : 'Could not get your location. Check your browser permission and try again.')
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 })
  }
  const saveProfile = async (event) => {
    event.preventDefault()
    setSavingProfile(true); setProfileError(''); setProfileNotice('')
    try {
      const result = await customerProfileApi.save(profileForm)
      setSavedProfile(result)
      setEditingProfile(false)
      profileQuery.reload()
    } catch (error) {
      setProfileError(error?.code === 'permission-denied'
        ? 'Profile saving was denied. Deploy the updated Firestore rules, then try again.'
        : error.message || 'Could not save your details. Please try again.')
    } finally { setSavingProfile(false) }
  }

  return <div className="min-h-[calc(100vh-64px)] bg-[#F7F5F0] text-[#2A2824]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
    <div className="border-b border-[#E6E2D8] bg-[#FDFCF9] px-4 sm:px-6"><div className="mx-auto flex min-h-[60px] max-w-[1200px] items-center justify-between gap-4 sm:min-h-[68px]"><Link to="/" className="font-serif text-[22px] font-semibold">Your Store</Link><div className="flex items-center gap-3 sm:gap-4"><span className="text-xs text-[#6B665C] sm:text-sm">{user ? 'Orders' : 'Account'}</span>{user && <GoogleAvatar user={user} name={displayName} />}</div></div></div>
    <main className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 sm:py-9">
      {!configured ? <div className="mx-auto max-w-lg rounded-2xl border border-[#E6E2D8] bg-[#FDFCF9] p-6 sm:p-8"><h1 className="font-serif text-3xl">Your account</h1><p className="mt-3 text-sm leading-6 text-[#6B665C]">Firebase is not configured yet. Add the Firebase web app values to <code>.env</code> after setup.</p></div>
        : loading ? <p className="py-24 text-center text-sm text-[#6B665C]">Checking account…</p>
          : !user ? <section className="mx-auto max-w-lg rounded-2xl border border-[#E6E2D8] bg-[#FDFCF9] p-6 sm:p-8"><h1 className="font-serif text-3xl">Welcome back</h1><p className="mt-3 text-sm leading-6 text-[#6B665C]">Sign in with Google to view your orders, track deliveries, save magazine drafts and submit orders across your devices.</p><button className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#532F30] px-5 text-sm font-medium text-white hover:bg-[#432526] disabled:opacity-50" onClick={login} disabled={busy}><LogIn size={17} />{busy ? 'Opening Google sign-in…' : 'Continue with Google'}</button>{error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}</section>
            : <div className="grid items-start gap-5 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-6">
              <aside className="flex flex-col gap-5">
                <Card><div className="flex items-center gap-4"><GoogleAvatar user={user} name={displayName} size="size-14" /><div className="min-w-0"><div className="truncate font-serif text-[22px] leading-tight">{displayName}</div><div className="mt-1 truncate text-xs text-[#6B665C]">{user.email}</div></div></div><div className="my-4 border-t border-dashed border-[#E0DBCE]"/><div className="mb-2 flex items-center justify-between"><h2 className="text-xs font-semibold uppercase tracking-[.08em] text-[#6B665C]">Saved details</h2><button type="button" onClick={openProfileEditor} className="text-sm font-medium text-[#532F30] hover:underline">Edit</button></div><div className="text-xs text-[#6B665C]">WhatsApp</div><div className="text-sm font-medium">{profile.phone || 'Not added yet'}</div><div className="mt-2.5 text-xs text-[#6B665C]">Instagram</div><div className="text-sm font-medium">{profile.instagram ? `@${profile.instagram.replace(/^@/, '')}` : 'Not added yet'}</div><div className="mt-2.5 text-xs text-[#6B665C]">Default address</div><div className="text-sm font-medium">{[profile.address, profile.city].filter(Boolean).join(', ') || 'Not added yet'}</div><button type="button" onClick={() => signOut()} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#D9D4C7] bg-[#FDFCF9] text-sm font-medium hover:bg-[#F1EEE6]"><LogOut size={16} /> Sign out</button></Card>
                <Card><div className="mb-3 flex items-center justify-between"><h2 className="text-xs font-semibold uppercase tracking-[.08em] text-[#6B665C]">My orders</h2><span className="text-xs text-[#6B665C]">{orders.length} total</span></div>{ordersQuery.loading && !ordersQuery.data ? <p className="py-5 text-center text-sm text-[#6B665C]">Loading orders…</p> : ordersQuery.error ? <div className="rounded-xl bg-[#FCF1EF] p-3 text-sm text-[#8F3A31]">Your orders could not be loaded. Please refresh and try again.</div> : orders.length ? <>{(showAll ? orders : orders.slice(0, 4)).map((order) => <OrderListItem key={order.id} order={order} selected={selectedOrder?.id === order.id} onClick={() => selectOrder(order)} />)}{orders.length > 4 && <button type="button" onClick={() => setShowAll((shown) => !shown)} className="mt-1 min-h-11 w-full text-center text-sm font-medium text-[#532F30]">{showAll ? 'Show fewer orders' : 'View all orders'}</button>}</> : <p className="py-3 text-sm leading-6 text-[#6B665C]">You have not placed an order yet.</p>}</Card>
              </aside>
              <OrderTracking order={trackingOrder} helpUrl={supportUrl} />
            </div>}
    </main>
    {editingProfile && <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/45 p-3 sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !savingProfile) setEditingProfile(false) }}>
      <section role="dialog" aria-modal="true" aria-labelledby="profile-dialog-title" className="my-auto max-h-[min(92vh,900px)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#E6E2D8] bg-[#FDFCF9] p-5 shadow-2xl sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-4"><div><h2 id="profile-dialog-title" className="font-serif text-2xl sm:text-3xl">Edit saved details</h2><p className="mt-1 text-sm text-[#6B665C]">These details will be filled into your next order automatically.</p></div><button type="button" aria-label="Close" onClick={() => setEditingProfile(false)} disabled={savingProfile} className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#E6E2D8] hover:bg-[#F1EEE6]"><X size={18} /></button></div>
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">{[['name','Your name'],['phone','WhatsApp number'],['instagram','Instagram username'],['city','City / District']].map(([key,label]) => <label key={key} className="block text-sm font-medium">{label}<input value={profileForm[key]} onChange={setProfileField(key)} autoComplete={key === 'phone' ? 'tel' : key === 'name' ? 'name' : 'off'} className="mt-1.5 min-h-11 w-full rounded-xl border border-[#D9D4C7] bg-white px-3.5 text-sm font-normal outline-none focus:border-[#9A8870] focus:ring-2 focus:ring-[#9A8870]/15" /></label>)}</div>
          <label className="block text-sm font-medium">Default street address<textarea value={profileForm.address} onChange={setProfileField('address')} rows={3} autoComplete="street-address" className="mt-1.5 w-full rounded-xl border border-[#D9D4C7] bg-white px-3.5 py-3 text-sm font-normal outline-none focus:border-[#9A8870] focus:ring-2 focus:ring-[#9A8870]/15" /></label>
          <div className="rounded-xl border border-[#E6E2D8] bg-[#F4F1EA] p-3.5"><button type="button" onClick={useCurrentLocation} disabled={locating || savingProfile} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#D9D4C7] bg-[#FDFCF9] px-3.5 text-sm font-medium hover:bg-white disabled:opacity-60"><LocateFixed size={16} />{locating ? 'Finding your location…' : 'Use my current location'}</button><p className="mt-2 text-xs leading-5 text-[#6B665C]">Your browser will ask permission. If allowed, your coordinates are sent to OpenStreetMap to find a nearby address. Check it before saving; location lookup may not identify your exact flat or house. © OpenStreetMap contributors.</p></div>
          {profileNotice && <p role="status" className="rounded-xl bg-green-50 px-3.5 py-2.5 text-sm text-green-800">{profileNotice}</p>}{profileError && <p role="alert" className="rounded-xl bg-[#FCF1EF] px-3.5 py-2.5 text-sm text-[#8F3A31]">{profileError}</p>}
          <div className="flex justify-end gap-2 border-t border-[#E6E2D8] pt-4"><button type="button" onClick={() => setEditingProfile(false)} disabled={savingProfile} className="min-h-11 rounded-xl border border-[#D9D4C7] px-4 text-sm font-medium hover:bg-[#F1EEE6]">Cancel</button><button type="submit" disabled={savingProfile} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#532F30] px-5 text-sm font-semibold text-white hover:bg-[#432526] disabled:opacity-60"><Save size={16} />{savingProfile ? 'Saving…' : 'Save details'}</button></div>
        </form>
      </section>
    </div>}
  </div>
}
