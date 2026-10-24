import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, ClipboardList, ChevronDown } from 'lucide-react'
import useAsync from '../shared/hooks/useAsync'
import useOrders from '../shared/hooks/useOrders'
import { getOrderSettings } from '../shared/services/contentService'
import { formatPrice } from '../shared/utils/format'
import { getUrgency } from '../shared/utils/urgency'
import { inputClass } from './classes'
import { CopyButton } from './orderUi'
import { groupedOrderSummaries } from './orderSummary'

const CATEGORY_TABS = [
  { id: 'magazine', label: 'Magazine', matches: (item) => item.kind === 'magazine' && !/mini/i.test(`${item.name} ${item.optionLabel}`) },
  { id: 'song-book', label: 'Song Book', matches: (item) => item.kind === 'song-book' || /song\s*book/i.test(`${item.name} ${item.optionLabel}`) },
  { id: 'frame', label: 'Frame', matches: (item) => /frame/i.test(`${item.name} ${item.optionLabel}`) },
  { id: 'polaroids', label: 'Polaroids', matches: (item) => /polaroid/i.test(`${item.name} ${item.optionLabel}`) },
  { id: 'sticker', label: 'Sticker', matches: (item) => /sticker/i.test(`${item.name} ${item.optionLabel}`) },
  { id: 'mini-magazine', label: 'Mini Magazine', matches: (item) => /mini.*magazine|magazine.*mini/i.test(`${item.name} ${item.optionLabel}`) },
]

const STATUS_FILTERS = [
  { id: 'all', label: 'All statuses' },
  { id: 'pending', label: 'Pending dispatch' },
  { id: 'dispatched', label: 'Dispatched' },
]
const DATE_FILTERS = [
  { id: '7d', label: 'Last 7 days' },
  { id: 'today', label: 'Today' },
  { id: '30d', label: 'Last 30 days' },
  { id: 'all', label: 'All dates' },
]
const PENDING = ['New', 'Confirmed', 'In production']
const localDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
const orderDate = (order) => new Date(order.createdAt)
const phoneOf = (order) => order.customer?.phone || order.customer?.whatsapp || order.deliveryInfo?.phone || '—'
const categoryOf = (item) => {
  const category = CATEGORY_TABS.find((tab) => tab.matches(item))
  return category?.label || item.name || 'Other'
}

function StatusPill({ status }) {
  const config = PENDING.includes(status)
    ? ['bg-[#F3E9CF] text-[#6B531A]', '#B8892B', 'Pending']
    : status === 'Shipped'
      ? ['bg-[#E1E8EE] text-[#33495C]', '#4F7491', 'Dispatched']
      : status === 'Delivered'
        ? ['bg-[#E0EBDD] text-[#2F5230]', '#4D8A4F', 'Completed']
        : ['bg-[#ECE9E3] text-[#5E5A52]', '#8C877C', status === 'Cancelled' ? 'Cancelled' : status]
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-[13px] font-medium ${config[0]}`}><span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: config[1] }} />{config[2]}</span>
}

function itemTags(items = []) {
  const groups = new Map()
  for (const item of items) {
    const label = categoryOf(item)
    groups.set(label, (groups.get(label) || 0) + (Number(item.qty) || 1))
  }
  return [...groups].map(([label, qty]) => ({ label, qty }))
}

function displayDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })
}

export default function OrdersPage({ fixedView = 'all' }) {
  const ordersQuery = useOrders()
  const settingsQuery = useAsync(getOrderSettings)
  const [params, setParams] = useSearchParams()
  const now = useMemo(() => new Date(), [])
  const all = ordersQuery.data ?? []
  // Delivered orders belong in the dedicated Completed orders view.
  const listOrders = fixedView === 'all' ? all.filter((order) => order.status !== 'Delivered') : all
  const settings = settingsQuery.data ?? {}
  const query = params.get('q') ?? ''
  const urgencyFilter = ['all', 'overdue', 'urgent', 'standard'].includes(params.get('urgency')) ? params.get('urgency') : 'all'
  const category = CATEGORY_TABS.some((tab) => tab.id === params.get('category')) ? params.get('category') : 'all'
  const statusOptions = fixedView === 'completed'
    ? [{ id: 'all', label: 'All statuses' }, { id: 'completed', label: 'Completed' }]
    : fixedView === 'cancelled'
      ? [{ id: 'all', label: 'All statuses' }, { id: 'cancelled', label: 'Cancelled' }]
      : STATUS_FILTERS
  const statusFilter = statusOptions.some((filter) => filter.id === params.get('status')) ? params.get('status') : 'all'
  const dateFilter = DATE_FILTERS.some((filter) => filter.id === params.get('date')) ? params.get('date') : 'all'
  const requestedPage = Math.max(1, Number(params.get('page')) || 1)

  const set = (key, value, fallback, resetPage = true) => {
    const next = new URLSearchParams(params)
    if (value === fallback || value === '') next.delete(key)
    else next.set(key, value)
    if (resetPage && key !== 'page') next.delete('page')
    if (['status', 'category', 'urgency'].includes(key)) next.delete('view')
    setParams(next, { replace: true })
  }
  const selectAll = () => {
    const next = new URLSearchParams(params)
    next.delete('urgency')
    next.delete('status')
    next.delete('category')
    next.delete('page')
    setParams(next, { replace: true })
  }

  const search = query.trim().toLowerCase()
  const matching = useMemo(() => listOrders.map((order) => ({ order, urgency: getUrgency(order, settings, now) })).filter(({ order, urgency }) => {
    const created = orderDate(order)
    const age = now.getTime() - created.getTime()
    const matchesDate = dateFilter === 'all' || (dateFilter === 'today' ? localDate(order.createdAt) === localDate(now) : dateFilter === '30d' ? age <= 30 * 86400000 && age >= 0 : age <= 7 * 86400000 && age >= 0)
    const statusMatchesList = fixedView === 'completed' ? order.status === 'Delivered' : fixedView === 'cancelled' ? order.status === 'Cancelled' : true
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'pending' ? PENDING.includes(order.status) : statusFilter === 'dispatched' ? order.status === 'Shipped' : statusFilter === 'completed' ? order.status === 'Delivered' : order.status === 'Cancelled')
    const matchesSearch = !search || [order.id, order.customer?.name, phoneOf(order), order.customer?.instagram, ...order.items.flatMap((item) => [item.name, item.optionLabel])].some((value) => String(value ?? '').toLowerCase().includes(search))
    const selectedCategory = CATEGORY_TABS.find((tab) => tab.id === category)
    const matchesCategory = !selectedCategory || order.items.some(selectedCategory.matches)
    const matchesUrgency = urgencyFilter === 'all' || urgency.level === urgencyFilter
    return statusMatchesList && matchesDate && matchesStatus && matchesSearch && matchesCategory && (fixedView !== 'all' || matchesUrgency)
  }), [listOrders, now, dateFilter, statusFilter, fixedView, search, category, urgencyFilter, settings]).sort((a, b) => {
    if (fixedView !== 'all') return String(b.order.createdAt).localeCompare(String(a.order.createdAt))
    const rank = (entry) => entry.order.status === 'Shipped' ? 3 : ({ overdue: 0, urgent: 1, standard: 2 }[entry.urgency.level] ?? 2)
    const difference = rank(a) - rank(b)
    if (difference) return difference
    if (rank(a) < 3 && a.urgency.date !== b.urgency.date) {
      if (!a.urgency.date) return 1
      if (!b.urgency.date) return -1
      return a.urgency.date.localeCompare(b.urgency.date)
    }
    return String(b.order.createdAt).localeCompare(String(a.order.createdAt))
  })

  const deliveredToday = all.filter((order) => order.status === 'Delivered' && localDate(order.completedAt) === localDate(now))
  const pendingCount = all.filter((order) => PENDING.includes(order.status)).length
  const overdueCount = all.filter((order) => PENDING.includes(order.status) && getUrgency(order, settings, now).level === 'overdue').length
  const urgentCount = all.filter((order) => PENDING.includes(order.status) && getUrgency(order, settings, now).level === 'urgent').length
  const dispatchedCount = all.filter((order) => order.status === 'Shipped').length
  const revenueToday = deliveredToday.reduce((sum, order) => sum + (Number(order.total) || 0), 0)
  const urgentOrders = all.filter((order) => PENDING.includes(order.status) && ['overdue', 'urgent'].includes(getUrgency(order, settings, now).level))
  const tabsCount = (matcher) => listOrders.filter((order) => order.items.some(matcher)).length
  const tabClass = (active) => `tb inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition ${active ? 'border-[#2F3A33] bg-[#2F3A33] text-[#FDFCF9]' : 'border-[#D9D4C7] bg-[#FDFCF9] text-[#2A2824] hover:bg-[#F1EEE6]'}`
  const pages = Math.max(1, Math.ceil(matching.length / 9))
  const page = Math.min(requestedPage, pages)
  const pageRows = matching.slice((page - 1) * 9, page * 9)
  const first = matching.length ? (page - 1) * 9 + 1 : 0
  const last = Math.min(page * 9, matching.length)

  return (
    <div className="orders-list-page -m-4 min-h-screen bg-[#F7F5F0] p-4 text-[#2A2824] sm:-m-8 sm:p-8 lg:-mx-6 lg:-my-8 lg:px-6 lg:py-8">
      <div className="mx-auto max-w-[1240px] pb-6">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div><h1 className="font-serif text-[34px] font-medium leading-tight tracking-[-.01em]">{fixedView === 'completed' ? 'Completed orders' : fixedView === 'cancelled' ? 'Cancelled orders' : 'Orders'}</h1><p className="mt-1 text-sm text-[#6B665C]">{now.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}</p></div>
          {fixedView === 'all' && <CopyButton label="Copy urgent summary" doneLabel="Urgent orders copied!" className={`!rounded-[10px] !bg-[#2F3A33] px-4 py-2.5 ${urgentOrders.length ? '' : 'pointer-events-none opacity-45'}`} getText={() => groupedOrderSummaries(urgentOrders, settings, now)} />}
        </header>

        <section className="orders-summary-row -mx-1 mb-4 flex gap-2.5 overflow-x-auto px-1 pb-1 sm:mx-0 sm:mb-6 sm:grid sm:grid-cols-[repeat(auto-fit,minmax(180px,1fr))] sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0" aria-label="Order summary">
          <Stat label="Pending dispatch" value={pendingCount} note={`${overdueCount} overdue · ${urgentCount} urgent`} />
          <Stat label="Dispatched" value={dispatchedCount} note="On the way" />
          <Stat label="Completed today" value={deliveredToday.length} note={now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} />
          <Stat label="Revenue today" value={formatPrice(revenueToday)} note="From completed orders" />
        </section>

        <nav className="orders-filter-tabs mb-2 flex items-center gap-3 overflow-x-auto pb-3" aria-label="Order filters">
          {fixedView === 'all' && <>
          <button type="button" aria-pressed={urgencyFilter === 'all' && category === 'all'} onClick={selectAll} className={tabClass(urgencyFilter === 'all' && category === 'all')}>All orders <span className="text-xs opacity-75">{listOrders.length}</span></button>
          <label className="relative inline-flex shrink-0">
            <span className="sr-only">Filter by priority</span>
            <select aria-label="Filter by priority" value={urgencyFilter} onChange={(event) => set('urgency', event.target.value, 'all')} className="min-h-11 appearance-none rounded-full border border-[#D9D4C7] bg-[#FDFCF9] py-2 pl-4 pr-10 text-sm font-medium text-[#2A2824] outline-none hover:bg-[#F1EEE6] focus:border-[#2F3A33]">
              <option value="all">All</option>
              <option value="overdue">Overdue ({overdueCount})</option>
              <option value="urgent">Urgent ({urgentCount})</option>
              <option value="standard">Standard ({all.filter((order) => PENDING.includes(order.status) && getUrgency(order, settings, now).level === 'standard').length})</option>
            </select>
            <ChevronDown size={15} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#6B665C]" />
          </label>
          <span aria-hidden="true" className="mx-1 h-6 w-px shrink-0 bg-[#D9D4C7]" />
          </>}
          {CATEGORY_TABS.map((tab) => <button key={tab.id} type="button" aria-pressed={category === tab.id} onClick={() => set('category', tab.id, 'all')} className={tabClass(category === tab.id)}>{tab.label}<span className="text-xs opacity-75">{tabsCount(tab.matches)}</span></button>)}
        </nav>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-[#E6E2D8] bg-[#FDFCF9]" aria-label="Orders">
          <div className="grid grid-cols-[minmax(105px,1fr)_minmax(76px,.72fr)_minmax(78px,.72fr)] gap-1.5 border-b border-[#EEEAE0] bg-[#FBFAF7] px-2.5 py-2.5 sm:grid-cols-[minmax(0,1fr)_168px_148px] sm:items-center sm:gap-3 sm:px-5 sm:py-3.5">
            <label className="relative block min-w-0">
              <span className="sr-only">Search by order number, name or WhatsApp</span>
              <Search size={15} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#817B70] sm:left-3.5 sm:size-[17px]" />
              <input type="search" className={`${inputClass} min-h-10 w-full rounded-lg border-[#E4DED2] bg-white pl-8 pr-1.5 text-[11px] shadow-[0_1px_2px_rgba(42,40,36,0.03)] transition focus:border-[#9A8870] focus:ring-2 focus:ring-[#9A8870]/15 sm:min-h-11 sm:rounded-xl sm:pl-10 sm:pr-3 sm:text-sm`} placeholder="Search orders…" value={query} onChange={(event) => set('q', event.target.value, '')} />
            </label>
            <FilterSelect label="Status" value={statusFilter} onChange={(value) => set('status', value, 'all')} options={statusOptions} />
            <FilterSelect label="Date" value={dateFilter} onChange={(value) => set('date', value, 'all')} options={DATE_FILTERS} />
          </div>

          {ordersQuery.error ? <p role="alert" className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">The orders could not be loaded. Please refresh the page.</p> : ordersQuery.loading && !ordersQuery.data ? <p className="py-12 text-center text-sm text-[#6B665C]">Loading orders…</p> : matching.length === 0 ? <div className="py-16 text-center text-[#6B665C]"><ClipboardList className="mx-auto mb-3" />{all.length ? 'No orders match these filters.' : 'No orders yet.'}</div> : <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead><tr className="bg-[#F7F4ED] text-left text-xs font-semibold uppercase tracking-[.06em] text-[#6B665C]"><th className="px-5 py-3">Order</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Items</th><th className="px-5 py-3">Priority</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Total</th><th className="px-5 py-3" /></tr></thead>
                <tbody>{pageRows.map(({ order, urgency }) => <tr key={order.id} className="border-t border-[#EEEAE0] hover:bg-[#FAF8F3]">
                  <td className="px-5 py-4"><Link className="font-semibold text-[#2F3A33] hover:underline" to={`/admin/orders/${encodeURIComponent(order.id)}`}>#{order.id}</Link><div className="mt-0.5 whitespace-nowrap text-xs text-[#6B665C]">{displayDate(order.createdAt)}</div></td>
                  <td className="px-5 py-4"><div className="max-w-48 truncate font-medium">{order.customer?.name || '—'}</div><div className="mt-0.5 whitespace-nowrap text-xs text-[#6B665C]">{phoneOf(order)}</div></td>
                  <td className="max-w-[300px] px-5 py-4">{itemTags(order.items).map((tag) => <span key={tag.label} className="mr-1 inline-block whitespace-nowrap rounded-full bg-[#EFEBE1] px-2.5 py-0.5 text-xs font-medium text-[#4A463E]">{tag.label}{tag.qty > 1 ? ` × ${tag.qty}` : ''}</span>)}</td>
                  <td className="px-5 py-4">{urgency.level === 'urgent' || urgency.level === 'overdue' ? <span className="inline-block whitespace-nowrap rounded-full bg-[#F6E3DF] px-3 py-1 text-xs font-semibold text-[#8F3A31]">{urgency.level === 'overdue' ? 'Overdue' : 'Urgent'}</span> : <span className="whitespace-nowrap text-[13px] text-[#6B665C]">{PENDING.includes(order.status) ? 'Standard' : '—'}</span>}</td>
                  <td className="px-5 py-4"><StatusPill status={order.status} /></td><td className="whitespace-nowrap px-5 py-4 text-right font-medium">{formatPrice(order.total)}</td><td className="px-5 py-4 text-right"><Link className="inline-flex min-h-10 items-center justify-center rounded-[10px] border border-[#D9D4C7] bg-[#FDFCF9] px-3.5 text-[13px] font-medium text-[#2A2824] hover:bg-[#F1EEE6]" to={`/admin/orders/${encodeURIComponent(order.id)}`}>View</Link></td>
                </tr>)}</tbody>
              </table>
            </div>
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EEEAE0] px-4 py-3.5 sm:px-5"><span className="text-xs text-[#6B665C]">Showing {first}–{last} of {matching.length} orders</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => set('page', String(page - 1), '1', false)} className="inline-flex min-h-11 items-center rounded-[10px] border border-[#D9D4C7] bg-[#FDFCF9] px-4 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-45">Previous</button><button type="button" disabled={page >= pages} onClick={() => set('page', String(page + 1), '1', false)} className="inline-flex min-h-11 items-center rounded-[10px] border border-[#D9D4C7] bg-[#FDFCF9] px-4 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-45">Next</button></div></footer>
          </>}
        </section>
      </div>
      <style>{`.orders-list-page{font-family:Inter,system-ui,sans-serif;font-size:14px;line-height:1.5}.orders-list-page .font-serif{font-family:Fraunces,Georgia,serif}.orders-filter-tabs,.orders-summary-row{scrollbar-width:none}.orders-filter-tabs::-webkit-scrollbar,.orders-summary-row::-webkit-scrollbar{display:none}`}</style>
    </div>
  )
}

function Stat({ label, value, note }) {
  return <div className="min-w-[136px] shrink-0 rounded-2xl border border-[#E6E2D8] bg-[#FDFCF9] px-3.5 py-3 sm:min-w-0 sm:px-5 sm:py-[18px]"><div className="mb-0.5 whitespace-nowrap text-[11px] text-[#6B665C] sm:text-xs">{label}</div><div className="font-serif text-[25px] font-medium leading-[1.15] sm:text-[28px] sm:leading-[1.2]">{value}</div><div className="whitespace-nowrap text-[10px] text-[#6B665C] sm:text-xs">{note}</div></div>
}

function FilterSelect({ label, value, onChange, options }) {
  return <label className="relative block min-w-0">
    <span className="sr-only">{label}</span>
    <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className={`${inputClass} min-h-10 w-full appearance-none rounded-lg border-[#E4DED2] bg-white py-1 pl-2 pr-6 text-[10px] shadow-[0_1px_2px_rgba(42,40,36,0.03)] transition hover:border-[#C9C0B1] focus:border-[#9A8870] focus:ring-2 focus:ring-[#9A8870]/15 sm:min-h-11 sm:rounded-xl sm:py-2 sm:pl-3.5 sm:pr-10 sm:text-sm`}>
      {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
    </select>
    <ChevronDown size={14} aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#6B665C] sm:right-3.5 sm:size-[15px]" />
  </label>
}
