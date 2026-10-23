import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Clock3, Flame, Truck, Wallet } from 'lucide-react'
import useAsync from '../shared/hooks/useAsync'
import { getOrderSettings, ordersApi } from '../shared/services/contentService'
import { formatPrice } from '../shared/utils/format'
import { ACTIVE_STATUSES, compareByDelivery, getUrgency } from '../shared/utils/urgency'

const COLORS = { pending: '#B8892B', dispatched: '#4F7491', completed: '#4D8A4F', cancelled: '#9A958A' }
const CATEGORIES = [
  { id: 'magazine', label: 'Magazine', test: (item) => item.kind === 'magazine' && !/mini/i.test(`${item.name} ${item.optionLabel}`) },
  { id: 'frame', label: 'Frame', test: (item) => /frame/i.test(`${item.name} ${item.optionLabel}`) },
  { id: 'polaroid', label: 'Polaroids', test: (item) => /polaroid/i.test(`${item.name} ${item.optionLabel}`) },
  { id: 'song-book', label: 'Song Book', test: (item) => item.kind === 'song-book' || /song\s*book/i.test(`${item.name} ${item.optionLabel}`) },
  { id: 'sticker', label: 'Sticker', test: (item) => /sticker/i.test(`${item.name} ${item.optionLabel}`) },
  { id: 'mini-magazine', label: 'Mini Magazine', test: (item) => /mini.*magazine|magazine.*mini/i.test(`${item.name} ${item.optionLabel}`) },
]
const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const validDate = (value) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date }
const isSameDay = (value, day) => { const date = validDate(value); return !!date && dateKey(date) === dateKey(day) }
const itemsText = (items = []) => {
  const counts = new Map()
  for (const item of items) {
    const category = CATEGORIES.find((entry) => entry.test(item))?.label || item.name || 'Other'
    counts.set(category, (counts.get(category) || 0) + (Number(item.qty) || 1))
  }
  return [...counts].map(([name, qty]) => `${name}${qty > 1 ? ` × ${qty}` : ''}`).join(', ') || 'No items'
}
const orderLink = (order) => `/admin/orders/${encodeURIComponent(order.id)}`
const percentageChange = (today, yesterday) => {
  if (!yesterday) return today ? `+${today}` : '0'
  const percent = Math.round(((today - yesterday) / yesterday) * 100)
  return `${percent > 0 ? '+' : ''}${percent}%`
}

function Panel({ title, aside, children, className = '' }) {
  return <section className={`rounded-2xl border border-[#E6E2D8] bg-[#FDFCF9] p-5 transition-[border-color,box-shadow,transform] duration-300 ease-out hover:-translate-y-0.5 hover:border-[#D9D4C7] hover:shadow-[0_12px_32px_rgba(83,47,48,0.07)] sm:p-6 ${className}`}>
    <div className="mb-[18px] flex items-center justify-between gap-3"><h2 className="m-0 text-xs font-semibold uppercase tracking-[.08em] text-[#6B665C]">{title}</h2>{aside}</div>
    {children}
  </section>
}

function Stat({ label, value, note, icon: Icon, noteTone = 'text-[#2F5230]' }) {
  return <article className="rounded-2xl border border-[#E6E2D8] bg-[#FDFCF9] p-5 transition-[border-color,box-shadow,transform] duration-300 ease-out hover:-translate-y-1 hover:border-[#D9D4C7] hover:shadow-[0_12px_28px_rgba(83,47,48,0.09)]">
    <div className="flex items-center justify-between gap-2"><span className="text-xs text-[#6B665C]">{label}</span><span className="grid size-9 place-items-center rounded-[10px] bg-[#F1E6E4] text-[#532F30]"><Icon size={18} strokeWidth={1.7} /></span></div>
    <div className="my-2 font-serif text-[34px] font-medium leading-[1.2]">{value}</div>
    <div className="text-xs"><span className={`font-semibold ${noteTone}`}>{note.value}</span> <span className="text-[#6B665C]">{note.label}</span></div>
  </article>
}

function OrdersChart({ orders, now, range }) {
  const [hovered, setHovered] = useState(null)
  const bucketDates = range === 'year'
    ? Array.from({ length: now.getMonth() + 1 }, (_, month) => new Date(now.getFullYear(), month, 1))
    : range === 'month'
      ? Array.from({ length: now.getDate() }, (_, day) => new Date(now.getFullYear(), now.getMonth(), day + 1))
      : Array.from({ length: 7 }, (_, index) => {
        const date = new Date(now)
        date.setHours(0, 0, 0, 0)
        date.setDate(date.getDate() - (6 - index))
        return date
      })
  const days = bucketDates.map((date) => ({
    date,
    count: orders.filter((order) => {
      const created = validDate(order.createdAt)
      if (!created) return false
      if (range === 'year') return created.getFullYear() === date.getFullYear() && created.getMonth() === date.getMonth()
      if (range === 'month') return isSameDay(created, date)
      return isSameDay(created, date)
    }).length,
    label: range === 'year' ? date.toLocaleDateString('en', { month: 'short' }) : date.toLocaleDateString('en', { weekday: 'short' }),
  }))
  const max = Math.max(5, Math.ceil(Math.max(...days.map((day) => day.count), 0) / 5) * 5)
  const x = (index) => 38 + (594 / Math.max(1, days.length - 1)) * index
  const y = (value) => 194 - (value / max) * 160
  const points = days.map((day, index) => `${x(index)},${y(day.count)}`).join(' ')
  const area = `${x(0)},194 ${points} ${x(days.length - 1)},194`
  const ticks = [0, Math.ceil(max / 2), max]
  const tooltipX = hovered == null ? 0 : Math.max(42, Math.min(534, x(hovered) - 58))
  const tooltipY = hovered == null ? 0 : Math.max(8, y(days[hovered].count) - 54)
  return <svg viewBox="0 0 650 230" className="h-auto w-full overflow-visible" role="group" aria-label={`Orders for ${range === '7d' ? 'the last seven days' : range === 'month' ? 'this month' : 'this year'}`} onMouseLeave={() => setHovered(null)}>
    <style>{`@keyframes dashboard-line-draw{to{stroke-dashoffset:0}}@keyframes dashboard-area-in{to{opacity:.08}}@keyframes dashboard-point-pop{0%{transform:scale(.5);opacity:0}100%{transform:scale(1);opacity:1}}@keyframes dashboard-tooltip-in{from{opacity:0;transform:translateY(5px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}@keyframes dashboard-halo-in{from{opacity:0;transform:scale(.6)}to{opacity:.13;transform:scale(1)}}`}</style>
    {ticks.map((tick) => <g key={tick}><line x1="38" x2="640" y1={y(tick)} y2={y(tick)} stroke="#E6E2D8" /><text x="29" y={y(tick) + 4} textAnchor="end" fontSize="11" fill="#6B665C">{tick}</text></g>)}
    <polygon points={area} fill="#532F30" opacity="0" style={{ animation: 'dashboard-area-in .8s ease-out .25s forwards' }} />
    <polyline points={points} fill="none" stroke="#532F30" strokeWidth="2.5" strokeLinejoin="round" strokeDasharray="1000" strokeDashoffset="1000" style={{ animation: 'dashboard-line-draw 1.1s cubic-bezier(.22,.8,.3,1) forwards' }} />
    {hovered != null && <line x1={x(hovered)} x2={x(hovered)} y1="28" y2="194" stroke="#532F30" strokeDasharray="3 4" opacity=".28" style={{ transition: 'all .24s cubic-bezier(.2,.8,.2,1)' }} />}
    {days.map((day, index) => <g key={`${dateKey(day.date)}-${range}`} role="button" tabIndex="0" aria-label={`${day.count} orders ${range === 'year' ? 'in' : 'on'} ${range === 'year' ? day.date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : day.date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`} onMouseEnter={() => setHovered(index)} onFocus={() => setHovered(index)} onBlur={() => setHovered(null)} onClick={() => setHovered((current) => current === index ? null : index)} className="cursor-pointer outline-none">
      <circle cx={x(index)} cy={y(day.count)} r={range === 'month' ? 8 : 13} fill="transparent" />
      {hovered === index && <circle cx={x(index)} cy={y(day.count)} r="11" fill="#532F30" style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'dashboard-halo-in .22s ease-out both' }} />}
      <circle cx={x(index)} cy={y(day.count)} r={hovered === index ? 6 : index === days.length - 1 ? 5 : 3.5} fill={index === days.length - 1 || hovered === index ? '#532F30' : '#FDFCF9'} stroke="#532F30" strokeWidth={hovered === index ? 2.5 : 2} style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: `dashboard-point-pop .35s ease-out ${Math.min(index, 8) * .04}s both`, transition: 'r .28s cubic-bezier(.2,.8,.2,1), stroke-width .24s ease, fill .24s ease' }} />
      {(range !== 'month' || index % 5 === 0 || index === days.length - 1) && <text x={x(index)} y="218" textAnchor="middle" fontSize="11" fill={hovered === index ? '#532F30' : '#6B665C'} fontWeight={hovered === index ? '600' : '400'}>{day.label}</text>}
    </g>)}
    {hovered != null && <g pointerEvents="none" style={{ filter: 'drop-shadow(0 5px 12px rgba(42,40,36,.18))', transformBox: 'fill-box', transformOrigin: 'center', animation: 'dashboard-tooltip-in .2s cubic-bezier(.2,.8,.2,1) both' }}>
      <rect x={tooltipX} y={tooltipY} width="116" height="40" rx="10" fill="#2F3A33" />
      <text x={tooltipX + 58} y={tooltipY + 16} textAnchor="middle" fontSize="11" fontWeight="600" fill="#FDFCF9">{days[hovered].count} {days[hovered].count === 1 ? 'order' : 'orders'}</text>
      <text x={tooltipX + 58} y={tooltipY + 31} textAnchor="middle" fontSize="10" fill="#E6E2D8">{range === 'year' ? days[hovered].date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : days[hovered].date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}</text>
    </g>}
  </svg>
}

function StatusPill({ status }) {
  const style = status === 'Shipped' ? 'bg-[#E1E8EE] text-[#33495C]' : status === 'Delivered' ? 'bg-[#E0EBDD] text-[#2F5230]' : status === 'Cancelled' ? 'bg-[#ECE9E3] text-[#5E5A52]' : 'bg-[#F3E9CF] text-[#6B531A]'
  const label = status === 'Shipped' ? 'Dispatched' : status === 'Delivered' ? 'Completed' : status === 'New' || status === 'Confirmed' || status === 'In production' ? 'Pending' : status
  return <span className={`pill inline-flex shrink-0 rounded-full px-3 py-1 text-[13px] font-medium ${style}`}>{label}</span>
}

export default function Dashboard() {
  const ordersQuery = useAsync(ordersApi.list)
  const settingsQuery = useAsync(getOrderSettings)
  const now = useMemo(() => new Date(), [])
  const [chartRange, setChartRange] = useState('7d')
  const orders = ordersQuery.data ?? []
  const settings = settingsQuery.data ?? {}
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const todayOrders = orders.filter((order) => isSameDay(order.createdAt, now))
  const yesterdayOrders = orders.filter((order) => isSameDay(order.createdAt, yesterday))
  const pending = orders.filter((order) => ACTIVE_STATUSES.includes(order.status))
  const dispatched = orders.filter((order) => order.status === 'Shipped')
  const completedToday = orders.filter((order) => order.status === 'Delivered' && isSameDay(order.completedAt || order.statusUpdatedAt || order.createdAt, now))
  const revenueToday = completedToday.reduce((total, order) => total + (Number(order.total) || 0), 0)
  const urgency = (order) => getUrgency(order, settings, now)
  const overdue = pending.filter((order) => urgency(order).level === 'overdue').length
  const urgent = pending.filter((order) => urgency(order).level === 'urgent').length
  const pendingForPipeline = pending.length
  const pipelineTotal = pendingForPipeline + dispatched.length + orders.filter((order) => order.status === 'Delivered').length + orders.filter((order) => order.status === 'Cancelled').length
  const pipelineWidth = (count) => pipelineTotal ? `${count / pipelineTotal * 100}%` : '0%'
  const categoryCounts = CATEGORIES.map((category) => ({ ...category, count: orders.filter((order) => (order.items || []).some(category.test)).length }))
  const topCategory = Math.max(1, ...categoryCounts.map((category) => category.count))
  const urgentOrders = [...pending].filter((order) => ['overdue', 'urgent'].includes(urgency(order).level)).sort((a, b) => compareByDelivery(a, b, settings, now)).slice(0, 4)
  const recentOrders = [...orders].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 5)
  const chartOrders = orders.filter((order) => {
    const created = validDate(order.createdAt)
    if (!created) return false
    if (chartRange === 'year') return created.getFullYear() === now.getFullYear()
    if (chartRange === 'month') return created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth()
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - 6)
    return created >= start && created <= now
  })
  const chartPeriodLabel = chartRange === '7d' ? 'last 7 days' : chartRange === 'month' ? 'this month' : 'this year'
  const todayText = now.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })

  if (ordersQuery.loading && !ordersQuery.data) return <p className="py-10 text-center text-[#6B665C]">Loading dashboard…</p>
  if (ordersQuery.error) return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">The dashboard could not load orders. Please refresh the page.</p>

  return <div className="dashboard-page mx-auto max-w-[1500px] pb-8 text-[#2A2824]">
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="m-0 font-serif text-[34px] font-medium leading-tight tracking-[-.01em]">Dashboard</h1><p className="mt-1 text-sm text-[#6B665C]">{todayText} · Here’s how your store is doing today</p></div>
      <Link to="/admin/orders" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#532F30] bg-[#532F30] px-[18px] text-sm font-medium text-[#FDFCF9] hover:opacity-90">View all orders</Link>
    </header>

    <section className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4" aria-label="Store overview">
      <Stat label="Today’s orders" value={todayOrders.length} icon={ClipboardList} note={{ value: percentageChange(todayOrders.length, yesterdayOrders.length), label: 'vs yesterday' }} />
      <Stat label="Pending dispatch" value={pending.length} icon={Clock3} note={{ value: `${overdue + urgent} urgent`, label: 'need action' }} noteTone="text-[#8F3A31]" />
      <Stat label="Dispatched" value={dispatched.length} icon={Truck} note={{ value: `+${dispatched.filter((order) => isSameDay(order.statusUpdatedAt, now)).length}`, label: 'since yesterday' }} />
      <Stat label="Revenue today" value={formatPrice(revenueToday)} icon={Wallet} note={{ value: `${completedToday.length} completed`, label: 'orders today' }} />
    </section>

    <Panel title="Order pipeline" aside={<span className="text-xs text-[#6B665C]">{orders.length} orders in total</span>} className="mb-5">
      <div className="my-1.5 mb-3.5 flex h-3.5 gap-[3px] overflow-hidden rounded-full">
        <span style={{ width: pipelineWidth(pendingForPipeline), background: COLORS.pending }} /><span style={{ width: pipelineWidth(dispatched.length), background: COLORS.dispatched }} /><span style={{ width: pipelineWidth(orders.filter((order) => order.status === 'Delivered').length), background: COLORS.completed }} /><span style={{ width: pipelineWidth(orders.filter((order) => order.status === 'Cancelled').length), background: COLORS.cancelled }} />
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
        {[[COLORS.pending, 'Pending', pendingForPipeline], [COLORS.dispatched, 'Dispatched', dispatched.length], [COLORS.completed, 'Completed', orders.filter((order) => order.status === 'Delivered').length], [COLORS.cancelled, 'Cancelled', orders.filter((order) => order.status === 'Cancelled').length]].map(([color, label, count]) => <span key={label} className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: color }} />{label}<b>{count}</b></span>)}
      </div>
    </Panel>

    <div className="mb-5 grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
      <Panel title={`Orders · ${chartPeriodLabel}`} aside={<div className="flex shrink-0 items-center gap-2"><span className="hidden text-xs text-[#6B665C] sm:inline">{chartOrders.length} orders</span><label><span className="sr-only">Chart period</span><select aria-label="Chart period" value={chartRange} onChange={(event) => setChartRange(event.target.value)} className="min-h-9 max-w-[112px] rounded-lg border border-[#D9D4C7] bg-white px-2 text-xs text-[#2A2824] outline-none focus:border-[#532F30] sm:max-w-none sm:px-3"><option value="7d">Last 7 days</option><option value="month">This month</option><option value="year">This year</option></select></label></div>}><OrdersChart key={chartRange} orders={orders} now={now} range={chartRange} /></Panel>
      <Panel title="Orders by category">
        <div className="space-y-4">{categoryCounts.map((category) => <div key={category.id}><div className="mb-1.5 flex justify-between gap-2 text-sm"><span className="font-medium">{category.label}</span><span className="text-xs text-[#6B665C]">{category.count} orders</span></div><div className="h-2 overflow-hidden rounded-full bg-[#EFEBE1]"><span className="block h-full rounded-full bg-[#532F30]" style={{ width: `${category.count / topCategory * 100}%` }} /></div></div>)}</div>
      </Panel>
    </div>

    <div className="grid gap-5 xl:grid-cols-2">
      <Panel title={<span className="inline-flex items-center gap-2"><Flame size={16} className="text-[#532F30]" />Urgent orders</span>} aside={<Link to="/admin/orders?urgency=urgent&date=all" className="text-[13px] font-medium text-[#532F30]">View all</Link>}>
        {urgentOrders.length ? urgentOrders.map((order) => <div key={order.id} className="-mx-2 flex items-center gap-3 rounded-xl border-t border-[#EEEAE0] px-2 py-3 transition-colors duration-200 hover:bg-[#FAF8F3] first:border-0 first:pt-0 last:pb-0">
          <span className="shrink-0 rounded-full bg-[#F6E3DF] px-3 py-1 text-xs font-semibold text-[#8F3A31]">{urgency(order).level === 'overdue' ? 'Overdue' : 'Urgent'}</span>
          <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium"><Link className="font-semibold text-[#532F30] hover:underline" to={orderLink(order)}>#{order.id}</Link> · {order.customer?.name || 'Customer'}</div><p className="truncate text-xs text-[#6B665C]">{itemsText(order.items)}</p></div>
          <div className="shrink-0 text-right"><p className="text-xs text-[#6B665C]">Due</p><p className="text-sm font-medium">{urgency(order).date ? new Date(`${urgency(order).date}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'No date'}</p></div>
        </div>) : <p className="text-sm text-[#6B665C]">No urgent orders. You’re all caught up.</p>}
      </Panel>
      <Panel title="Recent orders" aside={<Link to="/admin/orders?date=all" className="text-[13px] font-medium text-[#532F30]">View all</Link>}>
        {recentOrders.length ? recentOrders.map((order) => <div key={order.id} className="-mx-2 flex items-center gap-3 rounded-xl border-t border-[#EEEAE0] px-2 py-3 transition-colors duration-200 hover:bg-[#FAF8F3] first:border-0 first:pt-0 last:pb-0">
          <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium"><Link className="font-semibold text-[#532F30] hover:underline" to={orderLink(order)}>#{order.id}</Link> · {order.customer?.name || 'Customer'}</div><p className="truncate text-xs text-[#6B665C]">{itemsText(order.items)}</p></div>
          <StatusPill status={order.status} /><span className="min-w-[68px] shrink-0 text-right text-sm font-medium">{formatPrice(order.total)}</span>
        </div>) : <p className="text-sm text-[#6B665C]">No orders yet.</p>}
      </Panel>
    </div>
  </div>
}
