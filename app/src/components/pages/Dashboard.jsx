import { useMemo } from 'react'
import {
  ArrowUpRight, ArrowDownRight, AlertTriangle, ClipboardList,
  Users, Building2, CalendarDays, TrendingUp,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import Avatar from '@/components/shared/Avatar'
import { useStore } from '@/hooks/useStore'
import { useBand } from '@/hooks/useBand.jsx'
import { fmtCurrency, fmtCurrencyShort, fmtDate, MONTHS, MONTHS_SHORT } from '@/lib/format'
import { cn } from '@/lib/utils'

// ── Constants ────────────────────────────────────────────────────────────────

const TYPE_COLORS = {
  Show: '#F26419', Festival: '#648CC8', Casamento: '#7CB87A',
  Aniversário: '#F4A261', Corporativo: '#787878', Outro: '#B8B0AA',
}

const RANK_COLORS = ['#F59E0B', '#94A3B8', '#C2410C']

// ── Pure helpers ─────────────────────────────────────────────────────────────

function calcMonthStats(events, members, payments, expenses, year, month) {
  const monthEvs = events.filter(ev => {
    const d = new Date(ev.date + 'T12:00:00')
    return d.getFullYear() === year && d.getMonth() === month
  })
  const revenue = monthEvs.reduce((s, ev) => s + (ev.value || 0), 0)
  let paidCaches = 0
  monthEvs.forEach(ev => {
    ;(ev.members || []).forEach(memId => {
      const m = members.find(x => x.id === memId)
      if (!m) return
      const entry = payments[ev.id]?.[m.id] ?? {}
      if (entry.paid) {
        const base = m.cache ?? 0
        paidCaches += entry.customValue != null ? entry.customValue : (entry.doubled ? base * 2 : base)
      }
    })
  })
  const expenseTotal = expenses
    .filter(exp => monthEvs.some(ev => ev.id === exp.eventId))
    .reduce((s, e) => s + (e.amount || 0), 0)
  return { revenue, shows: monthEvs.length, paidCaches, profit: revenue - paidCaches - expenseTotal, monthEvs }
}

// ── Sub-components ───────────────────────────────────────────────────────────

function DeltaBadge({ curr, prev }) {
  if (prev === 0 && curr === 0)
    return <p className="text-[11px] text-slate-300 mt-1.5">Sem dado anterior</p>
  if (prev === 0)
    return (
      <div className="flex items-center gap-0.5 mt-1.5 text-[11px] font-semibold text-emerald-600">
        <ArrowUpRight className="w-3.5 h-3.5" />Novo
      </div>
    )
  const pct = Math.round(((curr - prev) / Math.abs(prev)) * 100)
  const up = pct >= 0
  return (
    <div className={cn('flex items-center gap-0.5 mt-1.5 text-[11px] font-semibold', up ? 'text-emerald-600' : 'text-red-500')}>
      {up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
      {Math.abs(pct)}% vs mês anterior
    </div>
  )
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg">
      <p className="text-xs font-semibold text-slate-700 mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-xs mt-0.5">
          <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: p.fill }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-semibold text-slate-800">{fmtCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function Dashboard({ isLoading, onNav }) {
  const { events, members, payments, expenses, contractors, companyProfile, checklistItems } = useStore()
  const { activeBand } = useBand()

  const now      = new Date()
  const curYear  = now.getFullYear()
  const curMonth = now.getMonth()
  const hour     = now.getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  const prevMonth = curMonth === 0 ? 11 : curMonth - 1
  const prevYear  = curMonth === 0 ? curYear - 1 : curYear

  // ── KPI stats ──────────────────────────────────────────────
  const cur  = useMemo(() => calcMonthStats(events, members, payments, expenses, curYear,  curMonth),  [events, members, payments, expenses, curYear,  curMonth])
  const prev = useMemo(() => calcMonthStats(events, members, payments, expenses, prevYear, prevMonth), [events, members, payments, expenses, prevYear, prevMonth])

  // ── Smart alerts ───────────────────────────────────────────
  const alerts = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const in7Days = new Date(today)
    in7Days.setDate(in7Days.getDate() + 7)
    const list = []

    // 1. Shows in next 7 days with pending checklist items
    events
      .filter(ev => {
        const d = new Date(ev.date + 'T12:00:00')
        return d >= today && d <= in7Days
      })
      .forEach(ev => {
        const items   = checklistItems.filter(i => i.eventId === ev.id)
        const pending = items.filter(i => !i.done).length
        if (items.length > 0 && pending > 0)
          list.push({
            key: `check-${ev.id}`,
            Icon: ClipboardList,
            title: ev.name,
            desc: `${fmtDate(ev.date)} · ${pending} tarefa${pending !== 1 ? 's' : ''} pendente${pending !== 1 ? 's' : ''}`,
            navTo: 'checklist', action: 'Ver Checklist',
            bg: 'bg-orange-50', border: 'border-orange-100',
            iconBg: 'bg-orange-100', iconColor: 'text-orange-500',
          })
      })

    // 2. Events with pending cachês in past shows (grouped by event)
    events
      .filter(ev => new Date(ev.date + 'T12:00:00') < today)
      .forEach(ev => {
        const pendingCount = (ev.members || []).filter(memId => {
          const m = members.find(x => x.id === memId)
          if (!m) return false
          const entry = payments[ev.id]?.[m.id] ?? {}
          if (entry.paid) return false
          const base = m.cache ?? 0
          const val  = entry.customValue != null ? entry.customValue : (entry.doubled ? base * 2 : base)
          const done = entry.partial ? (entry.partialAmount ?? 0) : 0
          return val - done > 0
        }).length
        if (pendingCount === 0) return
        list.push({
          key: `cache-${ev.id}`,
          Icon: Users,
          title: ev.name,
          desc: `${pendingCount} cachê${pendingCount !== 1 ? 's' : ''} pendente${pendingCount !== 1 ? 's' : ''}`,
          navTo: 'logistics', action: 'Ver Despesas',
          bg: 'bg-red-50', border: 'border-red-100',
          iconBg: 'bg-red-100', iconColor: 'text-red-500',
        })
      })

    // 3. Contractors inactive > 90 days
    contractors.forEach(c => {
      const linked = events.filter(ev => (ev.contractorIds || []).includes(c.id))
      if (!linked.length) return
      const lastDate = linked.reduce((l, ev) => ev.date > l ? ev.date : l, '')
      const days = Math.floor((today - new Date(lastDate + 'T12:00:00')) / 86_400_000)
      if (days > 90)
        list.push({
          key: `contr-${c.id}`,
          Icon: Building2,
          title: c.name,
          desc: `${days} dias sem contato`,
          navTo: 'contractors', action: 'Ver Contratantes',
          bg: 'bg-blue-50', border: 'border-blue-100',
          iconBg: 'bg-blue-100', iconColor: 'text-blue-500',
        })
    })

    return list
  }, [events, members, payments, contractors, checklistItems])

  // ── Chart: last 6 months ───────────────────────────────────
  const chartData = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => {
      const d = new Date(curYear, curMonth - (5 - i), 1)
      const s = calcMonthStats(events, members, payments, expenses, d.getFullYear(), d.getMonth())
      return { name: MONTHS_SHORT[d.getMonth()], receita: s.revenue, caches: s.paidCaches }
    }),
  [events, members, payments, expenses, curYear, curMonth])

  // ── Upcoming shows (next 5) ────────────────────────────────
  const upcoming = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return [...events]
      .filter(ev => new Date(ev.date + 'T12:00:00') >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5)
      .map(ev => {
        const items = checklistItems.filter(i => i.eventId === ev.id)
        const done  = items.filter(i => i.done).length
        return {
          ...ev,
          checkPct: items.length > 0 ? Math.round(done / items.length * 100) : null,
          checkStr: `${done}/${items.length}`,
        }
      })
  }, [events, checklistItems])

  // ── Type distribution ──────────────────────────────────────
  const typeData = useMemo(() => {
    const LABELS = { show: 'Show solo', festival: 'Festival' }
    const counts = {}
    events.forEach(ev => { const t = ev.event_type || 'show'; counts[t] = (counts[t] || 0) + 1 })
    const total = events.length || 1
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([key, value]) => ({ name: LABELS[key] || key, value, pct: Math.round(value / total * 100) }))
  }, [events])

  // ── Top 3 members this month ───────────────────────────────
  const topMembers = useMemo(() =>
    members
      .map(m => {
        let total = 0
        cur.monthEvs.forEach(ev => {
          if (!(ev.members || []).includes(m.id)) return
          const entry = payments[ev.id]?.[m.id] ?? {}
          const base  = m.cache ?? 0
          total += entry.customValue != null ? entry.customValue : (entry.doubled ? base * 2 : base)
        })
        return { member: m, total }
      })
      .filter(x => x.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 3),
  [members, cur, payments])

  if (isLoading) return <DashboardSkeleton />

  return (
    <div className="space-y-6 animate-slide-up">

      {/* ── 1. Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {greeting},{' '}
            <span className="font-semibold text-slate-700">
              {activeBand?.name || companyProfile.companyName || 'Akro'}
            </span>
          </p>
        </div>
        <p className="text-sm font-semibold text-slate-500 pt-1">
          {MONTHS[curMonth]} {curYear}
        </p>
      </div>

      {/* ── 2. KPI Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Receita do Mês',  value: fmtCurrency(cur.revenue),
            curr: cur.revenue,        prevV: prev.revenue,
            Icon: TrendingUp, iconC: 'text-orange-500', iconBg: 'bg-orange-50',
          },
          {
            label: 'Shows do Mês',    value: String(cur.shows),
            curr: cur.shows,          prevV: prev.shows,
            Icon: CalendarDays, iconC: 'text-blue-500', iconBg: 'bg-blue-50',
          },
          {
            label: 'Cachês Pagos',    value: fmtCurrency(cur.paidCaches),
            curr: cur.paidCaches,     prevV: prev.paidCaches,
            Icon: Users, iconC: 'text-emerald-500', iconBg: 'bg-emerald-50',
          },
          {
            label: 'Lucro Estimado',  value: fmtCurrency(cur.profit),
            curr: cur.profit,         prevV: prev.profit,
            Icon: TrendingUp,
            iconC:  cur.profit >= 0 ? 'text-emerald-500' : 'text-red-500',
            iconBg: cur.profit >= 0 ? 'bg-emerald-50'   : 'bg-red-50',
          },
        ].map(({ label, value, curr, prevV, Icon, iconC, iconBg }) => (
          <Card key={label} className="rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-none">{label}</p>
                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', iconBg)}>
                  <Icon className={cn('w-3.5 h-3.5', iconC)} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
              <DeltaBadge curr={curr} prev={prevV} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── 3. Smart Alerts ───────────────────────────────────── */}
      {alerts.length > 0 && (
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            Atenção necessária
            <span className="text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-semibold leading-none">
              {alerts.length}
            </span>
          </h2>
          <div className="space-y-2">
            {alerts.map(a => (
              <div key={a.key} className={cn('flex items-center gap-3 p-3.5 rounded-2xl border', a.bg, a.border)}>
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', a.iconBg)}>
                  <a.Icon className={cn('w-4 h-4', a.iconColor)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{a.title}</p>
                  <p className="text-xs text-slate-500">{a.desc}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => onNav(a.navTo)} className="shrink-0 text-xs h-7">
                  {a.action}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 4. Financial Chart ────────────────────────────────── */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              Evolução Financeira — Últimos 6 Meses
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-2 rounded-sm bg-orange-500 shrink-0" />
                <span className="text-[11px] text-slate-500">Receita</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-2 rounded-sm bg-slate-400 shrink-0" />
                <span className="text-[11px] text-slate-500">Cachês Pagos</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2 pr-3">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barGap={3} barCategoryGap="28%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtCurrencyShort} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={58} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
              <Bar dataKey="receita" name="Receita"      fill="#F26419" radius={[4,4,0,0]} maxBarSize={26} />
              <Bar dataKey="caches"  name="Cachês Pagos" fill="#94a3b8" radius={[4,4,0,0]} maxBarSize={26} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── 5. Upcoming Shows + Type Distribution ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4">

        {/* Left: upcoming shows */}
        <Card className="rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-orange-500" />
              Próximos Shows
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {upcoming.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Nenhum show agendado</p>
              </div>
            ) : (
              upcoming.map((ev, i) => {
                const d = new Date(ev.date + 'T12:00:00')
                return (
                  <button
                    key={ev.id}
                    onClick={() => onNav('contracts')}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50/60 transition-colors text-left',
                      i < upcoming.length - 1 && 'border-b border-slate-100'
                    )}
                  >
                    <div className="text-center w-10 shrink-0 bg-orange-50 rounded-lg py-1">
                      <p className="text-[9px] font-bold uppercase text-orange-400">
                        {d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '')}
                      </p>
                      <p className="text-lg font-bold leading-none text-orange-600">{d.getDate()}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{ev.name}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {ev.city ? `${ev.city}/${ev.state}` : ev.local}
                      </p>
                      {ev.checkPct !== null ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={ev.checkPct} className="h-1 w-20" />
                          <span className="text-[10px] text-slate-400">{ev.checkStr}</span>
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-300 mt-0.5">sem checklist</p>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-slate-700 shrink-0">{fmtCurrency(ev.value || 0)}</p>
                  </button>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Right: type distribution */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              Distribuição por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {typeData.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p className="text-sm">Sem eventos cadastrados</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={typeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={46}
                      outerRadius={70}
                      dataKey="value"
                      strokeWidth={2}
                      stroke="#F4F1EC"
                    >
                      {typeData.map((entry, i) => (
                        <Cell key={i} fill={TYPE_COLORS[entry.name] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) =>
                        active && payload?.length ? (
                          <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-lg">
                            <p className="text-xs font-semibold text-slate-700">{payload[0].name}</p>
                            <p className="text-xs text-slate-500">
                              {payload[0].value} evento{payload[0].value !== 1 ? 's' : ''}
                            </p>
                          </div>
                        ) : null
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-1">
                  {typeData.map(({ name, value, pct }) => (
                    <div key={name} className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ background: TYPE_COLORS[name] || '#94a3b8' }}
                      />
                      <span className="text-xs text-slate-600 flex-1 truncate">{name}</span>
                      <span className="text-xs font-semibold text-slate-700">{value}</span>
                      <span className="text-[10px] text-slate-400 w-8 text-right">{pct}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── 6. Top Members ────────────────────────────────────── */}
      {topMembers.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Membros em destaque no mês</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {topMembers.map(({ member, total }, i) => (
              <Card key={member.id} className="rounded-2xl">
                <CardContent className="p-5 flex flex-col items-center text-center">
                  <div className="relative mb-3 mt-1">
                    <Avatar init={member.init} color={member.color} size="lg" />
                    <span
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow"
                      style={{ background: RANK_COLORS[i] }}
                    >
                      {i + 1}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 truncate w-full">{member.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{member.role}</p>
                  <p className="text-lg font-bold text-orange-500 mt-3">{fmtCurrency(total)}</p>
                  <p className="text-[10px] text-slate-400">acumulado no mês</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-4 w-52" />
        </div>
        <Skeleton className="h-5 w-28" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      <Skeleton className="h-16 rounded-2xl" />
      <Skeleton className="h-72 rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
      </div>
    </div>
  )
}
