import { useState, useMemo, useRef, useEffect, useCallback, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileDown, Lightbulb, Brain, TrendingUp, TrendingDown,
  Users, Music, Dumbbell, Building2, Package, Calculator,
  FileText, AlertTriangle, Trophy, BarChart3,
  Receipt, ChevronLeft, ChevronRight, FileText as FileTextIcon,
  BarChart as BarChartIcon, Map, Printer, CreditCard,
} from 'lucide-react'
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import DatePicker from '@/components/shared/DatePicker'
import Avatar from '@/components/shared/Avatar'
import { useStore } from '@/hooks/useStore'
import { fmtCurrency, fmtCurrencyShort, fmtDate, MONTHS } from '@/lib/format'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  generateIntelligencePDF,
  generatePayslip,
  generateTourReport,
  generatePaymentReceipt,
  generateBalanceReport,
  generateShowReport,
  generateEventExpensePDF,
} from '@/lib/pdfGenerator'

const BrazilMap = lazy(() => import('@/components/shared/BrazilMap'))

// ── Constants ──────────────────────────────────────────────────────────────

const MODULES = [
  { value: 'contracts',   label: 'Contratos e Shows',    icon: FileText   },
  { value: 'finance',     label: 'Financeiro',           icon: TrendingUp },
  { value: 'expenses',    label: 'Despesas',             icon: Receipt    },
  { value: 'members',     label: 'Membros',              icon: Users      },
  { value: 'repertoire',  label: 'Repertório e Setlist', icon: Music      },
  { value: 'rehearsals',  label: 'Ensaios',              icon: Dumbbell   },
  { value: 'contractors', label: 'Contratantes',         icon: Building2  },
  { value: 'equipment',   label: 'Equipamentos',         icon: Package    },
  { value: 'budgets',     label: 'Orçamentos',           icon: Calculator },
]

const EXPENSE_CATEGORY_COLORS = {
  'Alimentação': '#f97316',
  'Hospedagem':  '#60a5fa',
  'Combustível': '#4ade80',
  'Cachês':      '#c084fc',
  'Outros':      '#94a3b8',
}

const PERIOD_OPTIONS = [
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '3m',  label: 'Últimos 3 meses' },
  { value: '6m',  label: 'Últimos 6 meses' },
  { value: '1y',  label: 'Último ano'       },
  { value: 'custom', label: 'Personalizado' },
]

const C = {
  orange:  '#f97316',
  slate:   '#94a3b8',
  green:   '#22c55e',
  red:     '#f87171',
  blue:    '#60a5fa',
  purple:  '#a78bfa',
  amber:   '#f59e0b',
  emerald: '#10b981',
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getPeriodRange(period, customFrom, customTo) {
  const now = new Date(); now.setHours(23, 59, 59, 999)
  if (period === 'custom') {
    return {
      start: customFrom ? new Date(customFrom + 'T00:00:00') : new Date(0),
      end:   customTo   ? new Date(customTo   + 'T23:59:59') : now,
    }
  }
  const start = new Date(now); start.setHours(0, 0, 0, 0)
  if (period === '30d') start.setDate(start.getDate() - 30)
  else if (period === '3m') start.setMonth(start.getMonth() - 3)
  else if (period === '6m') start.setMonth(start.getMonth() - 6)
  else start.setFullYear(start.getFullYear() - 1)
  return { start, end: now }
}

function getMonthsInRange(start, end) {
  const months = []
  const cur = new Date(start.getFullYear(), start.getMonth(), 1)
  while (cur <= end) {
    months.push({ year: cur.getFullYear(), month: cur.getMonth() })
    cur.setMonth(cur.getMonth() + 1)
  }
  return months
}

function eventsInPeriod(events, start, end) {
  return events.filter(ev => {
    const d = new Date(ev.date + 'T12:00:00')
    return d >= start && d <= end
  })
}

function periodSlug(period, customFrom, customTo) {
  if (period === '30d') return 'ultimos_30_dias'
  if (period === '3m')  return 'ultimos_3_meses'
  if (period === '6m')  return 'ultimos_6_meses'
  if (period === '1y')  return 'ultimo_ano'
  return `${(customFrom || 'inicio').replace(/-/g, '')}_a_${(customTo || 'hoje').replace(/-/g, '')}`
}

// ── Shared UI ──────────────────────────────────────────────────────────────

function InsightCard({ text }) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-[#1a1a1a] p-4 flex gap-3" data-insight>
      <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
      <p className="text-sm text-slate-300 leading-relaxed">{text}</p>
    </div>
  )
}

function SectionCard({ title, children }) {
  return (
    <Card className="rounded-2xl overflow-hidden">
      <CardHeader className="pb-2 border-b border-slate-100 px-5 pt-4">
        <CardTitle className="text-sm font-semibold text-slate-700">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  )
}

function ChartBox({ title, children }) {
  return (
    <div data-chart={title}>
      {children}
    </div>
  )
}

function AnalyticPara({ text }) {
  if (!text) return null
  return (
    <p data-analytic className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
      {text}
    </p>
  )
}

const ChartTooltip = ({ active, payload, label, currency }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-xl text-xs">
      {label != null && <p className="font-semibold text-slate-700 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {p.name}: {currency ? fmtCurrency(Number(p.value) || 0) : p.value}
        </p>
      ))}
    </div>
  )
}

const EMPTY_CHART = (
  <div className="flex items-center justify-center h-40 text-slate-400 text-xs">
    Nenhum dado no período selecionado
  </div>
)

// ── Module: Contratos e Shows ──────────────────────────────────────────────

function ContractsModule({ events, period, customFrom, customTo, filterTipo, filterIniciativa, onInsightsChange }) {
  const { start, end } = getPeriodRange(period, customFrom, customTo)

  const {
    companyProfile, checklistItems, contractReceipts,
    equipment, showEquipment, songs, setlists,
    members, payments, expenses, contractors,
  } = useStore()

  const [specDialogOpen, setSpecDialogOpen] = useState(false)
  const [specType,       setSpecType]       = useState('show')
  const [specEventId,    setSpecEventId]    = useState('')
  const [tourFrom,       setTourFrom]       = useState('')
  const [tourTo,         setTourTo]         = useState('')
  const [tourCheckedIds, setTourCheckedIds] = useState([])
  const [specExporting,  setSpecExporting]  = useState(false)

  const sortedAllEvents = useMemo(() =>
    [...events].sort((a, b) => b.date.localeCompare(a.date)),
  [events])

  const tourEventsInRange = useMemo(() => {
    if (!tourFrom && !tourTo) return sortedAllEvents
    const s = tourFrom ? new Date(tourFrom + 'T00:00:00') : new Date(0)
    const e = tourTo   ? new Date(tourTo   + 'T23:59:59') : new Date()
    return sortedAllEvents.filter(ev => {
      const d = new Date(ev.date + 'T12:00:00')
      return d >= s && d <= e
    })
  }, [sortedAllEvents, tourFrom, tourTo])

  useEffect(() => {
    setTourCheckedIds(tourEventsInRange.map(ev => ev.id))
  }, [tourEventsInRange])

  async function handleSpecExport() {
    setSpecExporting(true)
    try {
      if (specType === 'show') {
        const ev = events.find(e => String(e.id) === specEventId)
        if (!ev) { toast.error('Selecione um show.'); setSpecExporting(false); return }
        await generateShowReport({
          eventId: ev.id,
          state: {
            events, members, payments, expenses: expenses || [], contractors: contractors || [],
            companyProfile, checklistItems: checklistItems || [],
            equipment: equipment || [], showEquipment: showEquipment || [],
            songs: songs || [], setlists: setlists || [], contractReceipts: contractReceipts || {},
          },
        })
        toast.success('Relatório do show gerado!')
      } else {
        if (!tourFrom || !tourTo) { toast.error('Selecione o período da turnê.'); setSpecExporting(false); return }
        await generateTourReport({
          events, members, payments, expenses: expenses || [],
          checklistItems: checklistItems || [], companyProfile,
          dataInicio: tourFrom, dataFim: tourTo,
          eventIds: tourCheckedIds,
          contractReceipts: contractReceipts || {},
        })
        toast.success('Relatório de turnê gerado!')
      }
      setSpecDialogOpen(false)
    } catch (err) {
      console.error('[spec-export]', err)
      toast.error('Erro ao gerar PDF.')
    } finally {
      setSpecExporting(false)
    }
  }

  const filtered = useMemo(() => eventsInPeriod(events, start, end).filter(ev => {
    if (filterTipo !== 'all' && ev.event_type !== filterTipo) return false
    if (filterIniciativa !== 'all' && ev.visibility !== filterIniciativa) return false
    return true
  }), [events, start, end, filterTipo, filterIniciativa])

  const byMonth = useMemo(() => {
    const months = getMonthsInRange(start, end)
    return months.map(({ year, month }) => ({
      name: MONTHS[month].slice(0, 3),
      shows: filtered.filter(ev => {
        const d = new Date(ev.date + 'T12:00:00')
        return d.getFullYear() === year && d.getMonth() === month
      }).length,
    }))
  }, [filtered, start, end])

  const byTipo = useMemo(() => {
    const solo    = filtered.filter(ev => ev.event_type === 'show' || !ev.event_type).length
    const festival = filtered.filter(ev => ev.event_type === 'festival').length
    return [
      { name: 'Show solo', value: solo,     fill: C.orange },
      { name: 'Festival',  value: festival, fill: C.purple },
    ].filter(d => d.value > 0)
  }, [filtered])

  const byIniciativa = useMemo(() => {
    const pub  = filtered.filter(ev => ev.visibility !== 'privado').length
    const priv = filtered.filter(ev => ev.visibility === 'privado').length
    return [
      { name: 'Pública',  value: pub,  fill: C.blue  },
      { name: 'Privada',  value: priv, fill: C.slate },
    ].filter(d => d.value > 0)
  }, [filtered])

  const insight = useMemo(() => {
    if (!filtered.length) return 'Nenhum show encontrado no período selecionado.'
    const grouped  = byMonth.map(m => m.shows)
    const max      = Math.max(...grouped)
    const avg      = grouped.reduce((s, v) => s + v, 0) / grouped.length
    const maxLabel = byMonth[grouped.indexOf(max)]?.name
    const minVal   = Math.min(...grouped)
    const minLabel = byMonth[grouped.indexOf(minVal)]?.name
    const drop = minVal < avg * 0.6 && byMonth.length > 1
      ? ` ${minLabel} teve ${Math.round((1 - minVal / avg) * 100)}% menos shows que a média — considere reforçar a agenda.`
      : ''
    return `${maxLabel} foi o mês com mais shows (${max}).${drop}`
  }, [filtered, byMonth])

  const introText = useMemo(() => {
    if (!filtered.length) return ''
    const n            = filtered.length
    const activeMonths = byMonth.filter(m => m.shows > 0).length
    const avg          = activeMonths > 0 ? (n / activeMonths).toFixed(1) : 0
    const peak         = byMonth.reduce((a, b) => b.shows > a.shows ? b : a, byMonth[0])
    const parts = [`No período analisado, a banda realizou ${n} show${n !== 1 ? 's' : ''} distribuídos em ${activeMonths} ${activeMonths !== 1 ? 'meses' : 'mês'} ativos, com média de ${avg} shows por mês ativo.`]
    if (peak?.shows > 0) parts.push(`${peak.name} foi o mês mais intenso com ${peak.shows} show${peak.shows !== 1 ? 's' : ''}.`)
    return parts.join(' ')
  }, [filtered, byMonth])

  const chartContextTexts = useMemo(() => {
    const t1 = (() => {
      if (!filtered.length) return 'Nenhum dado disponível para análise de tendência.'
      const vals  = byMonth.map(m => m.shows)
      const half  = Math.ceil(vals.length / 2)
      const avgF  = vals.slice(0, half).reduce((s, v) => s + v, 0) / (half || 1)
      const avgS  = vals.slice(half).reduce((s, v) => s + v, 0) / ((vals.length - half) || 1)
      if (vals.length < 2) return `Com um único mês de dados, não é possível identificar tendências. Expanda o período para uma análise mais robusta.`
      if (avgS > avgF * 1.1) return `A linha de shows revela tendência de crescimento na agenda: a segunda metade do período foi mais intensa que a primeira. Esse aquecimento pode indicar maior demanda ou melhor prospecção — aproveite o momento para consolidar parcerias com contratantes frequentes.`
      if (avgS < avgF * 0.9) return `A curva de shows aponta queda ao longo do período, com menor concentração de eventos na segunda metade. Avalie se essa sazonalidade é esperada ou se há espaço para reforçar a agenda nos meses mais fracos com estratégias proativas de captação.`
      return `O volume de shows manteve-se estável ao longo do período, sem variações expressivas mês a mês. Consistência é positiva para o planejamento, mas também pode indicar um teto de capacidade — avalie se há espaço para crescer sem comprometer a qualidade das apresentações.`
    })()

    const t2 = (() => {
      if (!byTipo.length && !byIniciativa.length) return ''
      const parts = []
      if (byTipo.length) {
        const tot = byTipo.reduce((s, d) => s + d.value, 0)
        const dom = [...byTipo].sort((a, b) => b.value - a.value)[0]
        const pct = tot > 0 ? Math.round((dom.value / tot) * 100) : 0
        parts.push(`${dom.name} representa ${pct}% da agenda${pct >= 70 ? ' — diversificar formatos pode ampliar o alcance comercial da banda e reduzir dependência de um único segmento' : ', indicando boa diversificação de formatos'}.`)
      }
      if (byIniciativa.length >= 2) {
        const tot  = byIniciativa.reduce((s, d) => s + d.value, 0)
        const pub  = byIniciativa.find(d => d.name === 'Pública')
        const pct  = tot > 0 && pub ? Math.round((pub.value / tot) * 100) : 0
        parts.push(`${pct}% dos eventos são públicos. ${pct > 70 ? 'Equilibrar com mais eventos privados tende a melhorar a rentabilidade por show.' : pct < 30 ? 'Eventos públicos ampliam visibilidade — considere aceitar algumas datas estratégicas mesmo com cachê menor.' : 'O equilíbrio entre visibilidade pública e rentabilidade privada está adequado.'}`)
      }
      return parts.join(' ')
    })()

    return [t1, t2]
  }, [filtered, byMonth, byTipo, byIniciativa])

  const conclusionText = useMemo(() => {
    if (!filtered.length) return ''
    const n            = filtered.length
    const activeMonths = byMonth.filter(m => m.shows > 0).length
    const parts        = []
    if (activeMonths < byMonth.length * 0.6 && byMonth.length > 2) {
      parts.push(`Com shows em apenas ${activeMonths} dos ${byMonth.length} meses do período, há espaço relevante para expandir a agenda nos meses ociosos e aumentar a receita sem custos fixos adicionais.`)
    } else {
      parts.push(`A presença em ${activeMonths} dos ${byMonth.length} meses demonstra consistência operacional.`)
    }
    if (byTipo.length > 0) {
      const dom = [...byTipo].sort((a, b) => b.value - a.value)[0]
      const tot = byTipo.reduce((s, d) => s + d.value, 0)
      const pct = tot > 0 ? Math.round((dom.value / tot) * 100) : 0
      parts.push(`Para o próximo período, ${pct >= 70 ? `avalie diversificar além de ${dom.name.toLowerCase()} para ampliar o alcance comercial` : 'manter a diversificação de formatos consolida a posição da banda no mercado'}.`)
    }
    return parts.join(' ')
  }, [filtered, byMonth, byTipo])

  useEffect(() => { onInsightsChange([insight]) }, [insight])

  return (
    <div className="space-y-4">
      <AnalyticPara text={introText} />

      <SectionCard title="Shows por Mês">
        <ChartBox title="Shows por Mês">
          {byMonth.every(m => m.shows === 0) ? EMPTY_CHART : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={byMonth} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="shows" name="Shows" stroke={C.orange} strokeWidth={2} dot={{ r: 3, fill: C.orange }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartBox>
      </SectionCard>

      <AnalyticPara text={chartContextTexts[0]} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SectionCard title="Por Tipo de Show">
          <ChartBox title="Por Tipo de Show">
            {byTipo.length === 0 ? EMPTY_CHART : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={byTipo} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" nameKey="name" paddingAngle={3}>
                    {byTipo.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconType="circle" iconSize={8} formatter={v => <span className="text-xs text-slate-600">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartBox>
        </SectionCard>

        <SectionCard title="Por Iniciativa">
          <ChartBox title="Por Iniciativa">
            {byIniciativa.length === 0 ? EMPTY_CHART : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={byIniciativa} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" nameKey="name" paddingAngle={3}>
                    {byIniciativa.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconType="circle" iconSize={8} formatter={v => <span className="text-xs text-slate-600">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartBox>
        </SectionCard>
      </div>

      <AnalyticPara text={chartContextTexts[1]} />
      <InsightCard text={insight} />
      <AnalyticPara text={conclusionText} />

      <div className="flex justify-end">
        <Button
          variant="outline"
          className="gap-2 text-xs border-slate-200 hover:border-orange-400 hover:text-orange-600"
          onClick={() => { setSpecEventId(''); setSpecDialogOpen(true) }}
        >
          <FileDown className="w-3.5 h-3.5" />
          Exportar relatório específico
        </Button>
      </div>

      <Dialog open={specDialogOpen} onOpenChange={setSpecDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Relatório Específico — Contratos e Shows</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              {[
                { value: 'show', label: 'Show específico' },
                { value: 'tour', label: 'Relatório de turnê' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSpecType(opt.value)}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-xs font-semibold transition-all',
                    specType === opt.value ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >{opt.label}</button>
              ))}
            </div>
            {specType === 'show' ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">Relatório completo com financeiro, checklist, membros, equipamentos e setlist.</p>
                <Select value={specEventId} onValueChange={setSpecEventId}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Selecione um show..." /></SelectTrigger>
                  <SelectContent>
                    {sortedAllEvents.map(ev => (
                      <SelectItem key={ev.id} value={String(ev.id)}>
                        {fmtDate(ev.date)} — {ev.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">Defina o período e selecione os shows a incluir na turnê.</p>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-slate-400 mb-1">De</p>
                    <DatePicker light value={tourFrom} onChange={setTourFrom} placeholder="Início" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-400 mb-1">Até</p>
                    <DatePicker light value={tourTo} onChange={setTourTo} placeholder="Fim" />
                  </div>
                </div>
                {tourEventsInRange.length > 0 && (
                  <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-slate-200 p-2">
                    {tourEventsInRange.map(ev => (
                      <label key={ev.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded-lg px-1.5 py-1">
                        <Checkbox
                          checked={tourCheckedIds.includes(ev.id)}
                          onCheckedChange={checked =>
                            setTourCheckedIds(prev =>
                              checked ? [...prev, ev.id] : prev.filter(id => id !== ev.id)
                            )
                          }
                        />
                        <span className="text-xs text-slate-700">{fmtDate(ev.date)} — {ev.name}</span>
                      </label>
                    ))}
                  </div>
                )}
                {tourEventsInRange.length === 0 && tourFrom && tourTo && (
                  <p className="text-xs text-slate-400 text-center py-2">Nenhum show no período selecionado.</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSpecDialogOpen(false)} className="text-sm">Cancelar</Button>
            <Button
              disabled={specExporting || (specType === 'show' ? !specEventId : (!tourFrom || !tourTo || tourCheckedIds.length === 0))}
              onClick={handleSpecExport}
              className="gap-2 text-sm bg-orange-500 hover:bg-orange-600 text-white"
            >
              {specExporting
                ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <FileDown className="w-3.5 h-3.5" />}
              {specExporting ? 'Gerando...' : 'Gerar PDF'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Module: Financeiro ─────────────────────────────────────────────────────

function FinanceModule({ events, members, payments, expenses, period, customFrom, customTo, filterTipo, filterIniciativa, filterEventoFinance, onInsightsChange }) {
  const { start, end } = getPeriodRange(period, customFrom, customTo)

  const { companyProfile, contractReceipts, contractors: allContractors } = useStore()

  const [balDialogOpen, setBalDialogOpen] = useState(false)
  const [balMonth,      setBalMonth]      = useState(() => new Date().getMonth())
  const [balYear,       setBalYear]       = useState(() => new Date().getFullYear())
  const [balExporting,  setBalExporting]  = useState(false)

  function handleShiftBalMonth(delta) {
    let m = balMonth + delta, y = balYear
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setBalMonth(m); setBalYear(y)
  }

  async function handleBalanceExport() {
    setBalExporting(true)
    try {
      await generateBalanceReport({
        events, members, payments, expenses: expenses || [],
        companyProfile, month: balMonth, year: balYear,
        contractReceipts: contractReceipts || {},
        contractors: allContractors || [],
      })
      toast.success('Balanço gerado!')
      setBalDialogOpen(false)
    } catch (err) {
      console.error('[balance-export]', err)
      toast.error('Erro ao gerar PDF.')
    } finally {
      setBalExporting(false)
    }
  }

  const filtered = useMemo(() => {
    let evs = eventsInPeriod(events, start, end).filter(ev => {
      if (filterTipo !== 'all' && ev.event_type !== filterTipo) return false
      if (filterIniciativa !== 'all' && ev.visibility !== filterIniciativa) return false
      return true
    })
    if (filterEventoFinance && filterEventoFinance !== 'all') {
      evs = evs.filter(ev => String(ev.id) === filterEventoFinance)
    }
    return evs
  }, [events, start, end, filterTipo, filterIniciativa, filterEventoFinance])

  function evCaches(ev) {
    return (ev.members || []).reduce((s, memId) => {
      const m = members.find(x => x.id === memId)
      if (!m) return s
      const entry = payments[ev.id]?.[m.id] ?? {}
      const base = m.cache ?? 0
      return s + (entry.customValue != null ? entry.customValue : (entry.doubled ? base * 2 : base))
    }, 0)
  }

  const months = useMemo(() => getMonthsInRange(start, end), [start, end])

  const areaData = useMemo(() => months.map(({ year, month }) => {
    const evs = filtered.filter(ev => {
      const d = new Date(ev.date + 'T12:00:00')
      return d.getFullYear() === year && d.getMonth() === month
    })
    const receita  = evs.reduce((s, ev) => s + (ev.value || 0), 0)
    const caches   = evs.reduce((s, ev) => s + evCaches(ev), 0)
    const despesas = (expenses || []).filter(e => evs.some(ev => ev.id === e.eventId)).reduce((s, e) => s + (e.amount || 0), 0)
    return { name: MONTHS[month].slice(0, 3), Receita: receita, Despesas: caches + despesas, Lucro: receita - caches - despesas }
  }), [filtered, months, expenses])

  const showProfitData = useMemo(() =>
    [...filtered]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(ev => {
        const rev  = ev.value || 0
        const cost = evCaches(ev) + (expenses || []).filter(e => e.eventId === ev.id).reduce((s, e) => s + (e.amount || 0), 0)
        return { name: fmtDate(ev.date).slice(0, 5), fullName: ev.name, lucro: rev - cost }
      }),
  [filtered, expenses])

  const { ticket, maxShow, minShow } = useMemo(() => {
    if (!filtered.length) return { ticket: 0, maxShow: null, minShow: null }
    const vals = filtered.map(ev => ev.value || 0)
    return {
      ticket:  vals.reduce((s, v) => s + v, 0) / vals.length,
      maxShow: filtered.reduce((a, ev) => (ev.value || 0) > (a.value || 0) ? ev : a, filtered[0]),
      minShow: filtered.reduce((a, ev) => (ev.value || 0) < (a.value || 0) ? ev : a, filtered[0]),
    }
  }, [filtered])

  const totalRevenue = useMemo(() => filtered.reduce((s, ev) => s + (ev.value || 0), 0), [filtered])
  const totalCost    = useMemo(() => filtered.reduce((s, ev) => {
    const varE = (expenses || []).filter(e => e.eventId === ev.id).reduce((s2, e) => s2 + (e.amount || 0), 0)
    return s + evCaches(ev) + varE
  }, 0), [filtered, expenses])
  const totalProfit  = totalRevenue - totalCost
  const margin       = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0

  const introText = useMemo(() => {
    if (!filtered.length) return ''
    const parts = []
    parts.push(`No período analisado, a banda faturou ${fmtCurrency(totalRevenue)} com ${filtered.length} show${filtered.length !== 1 ? 's' : ''}, registrando ticket médio de ${fmtCurrency(ticket)}.`)
    if (totalRevenue > 0) {
      parts.push(`O custo operacional total foi de ${fmtCurrency(totalCost)}, resultando em lucro líquido de ${fmtCurrency(totalProfit)} (margem de ${margin}%).`)
    }
    if (margin >= 60) parts.push('A margem acima de 60% indica excelente eficiência operacional para o período.')
    else if (margin >= 40) parts.push('A margem está saudável, mas há espaço para otimizar custos e ampliar o lucro.')
    else if (margin > 0) parts.push('A margem abaixo de 40% sinaliza que vale revisar os principais custos operacionais para melhorar a rentabilidade.')
    else if (totalRevenue > 0) parts.push('O período encerrou com prejuízo líquido — atenção imediata aos custos operacionais é recomendada.')
    return parts.join(' ')
  }, [filtered, totalRevenue, totalCost, totalProfit, margin, ticket])

  const chartContextTexts = useMemo(() => {
    const t0 = (() => {
      if (!areaData.length || areaData.every(d => d.Receita === 0)) return 'Nenhuma receita registrada no período. Adicione shows com valores para visualizar a evolução financeira.'
      if (areaData.length < 2) return 'Com apenas um mês de dados, a análise de tendência é limitada. Expanda o período para identificar padrões de receita e despesa ao longo do tempo.'
      const lucros    = areaData.map(d => d.Lucro)
      const half      = Math.ceil(lucros.length / 2)
      const avgFirst  = lucros.slice(0, half).reduce((s, v) => s + v, 0) / (half || 1)
      const avgSecond = lucros.slice(half).reduce((s, v) => s + v, 0) / ((lucros.length - half) || 1)
      if (avgSecond > avgFirst * 1.1) return 'O gráfico de evolução financeira revela tendência de melhora: a segunda metade do período apresentou margem superior à primeira. Esse movimento positivo sugere maior eficiência operacional ou crescimento de cachê — mantenha a trajetória e identifique quais práticas contribuíram para esse resultado.'
      if (avgSecond < avgFirst * 0.9) return 'A evolução financeira indica queda de margem ao longo do período, com lucro menor na segunda metade. Esse padrão pode refletir aumento de custos, redução de valores contratados ou sazonalidade — analise cada mês individualmente para identificar a causa raiz.'
      return 'A evolução financeira do período mostra estabilidade relativa entre receitas, despesas e lucro mês a mês. Consistência é positiva, mas vale monitorar se os custos não estão crescendo de forma invisível — variações pequenas acumuladas podem corroer a margem ao longo do tempo.'
    })()

    const t1 = (() => {
      if (!showProfitData.length) return ''
      if (showProfitData.length === 1) return `Com apenas um show no período, o lucro registrado foi de ${fmtCurrency(showProfitData[0].lucro)}. Analise múltiplos shows para identificar padrões de rentabilidade.`
      const lucros    = showProfitData.map(d => d.lucro)
      const maxLucro  = Math.max(...lucros)
      const minLucro  = Math.min(...lucros)
      const bestShow  = showProfitData.find(d => d.lucro === maxLucro)
      const worstShow = showProfitData.find(d => d.lucro === minLucro)
      const parts = []
      if (bestShow) parts.push(`"${bestShow.fullName}" foi o show mais rentável com ${fmtCurrency(maxLucro)}.`)
      if (worstShow && minLucro < 0) parts.push(`"${worstShow.fullName}" encerrou com prejuízo de ${fmtCurrency(Math.abs(minLucro))} — verifique os custos desse evento.`)
      else if (worstShow && minLucro < maxLucro * 0.3) parts.push(`"${worstShow.fullName}" foi o menos lucrativo (${fmtCurrency(minLucro)}) — avalie se os custos poderiam ter sido reduzidos.`)
      const half      = Math.ceil(lucros.length / 2)
      const avgFirst  = lucros.slice(0, half).reduce((s, v) => s + v, 0) / half
      const avgSecond = lucros.slice(half).reduce((s, v) => s + v, 0) / (lucros.length - half || 1)
      if (avgSecond > avgFirst * 1.15) parts.push('A tendência cronológica aponta melhora de rentabilidade por show ao longo do período.')
      else if (avgSecond < avgFirst * 0.85) parts.push('A rentabilidade por show apresentou queda ao longo do período — revise os custos dos eventos mais recentes.')
      return parts.join(' ')
    })()

    return [t0, t1]
  }, [areaData, showProfitData])

  const conclusionText = useMemo(() => {
    if (!filtered.length) return ''
    const parts = []
    if (margin >= 50) parts.push(`Com margem de ${margin}%, o período apresenta resultado financeiro sólido — a estrutura de custos está bem ajustada ao volume de shows realizado.`)
    else if (margin > 0) parts.push(`A margem de ${margin}% indica espaço relevante para otimização — concentre esforços em reduzir os principais custos ou aumentar os valores contratados.`)
    else parts.push(`O período encerrou com margem negativa (${margin}%), o que exige revisão urgente da estrutura de custos antes do próximo ciclo.`)
    if (maxShow && minShow && maxShow.id !== minShow.id) {
      const gap = (maxShow.value || 0) - (minShow.value || 0)
      if (gap > ticket * 0.5) parts.push(`A variação de ${fmtCurrency(gap)} entre o maior e o menor cachê indica oportunidade de padronizar negociações para aumentar o ticket médio.`)
    }
    return parts.join(' ')
  }, [filtered, margin, maxShow, minShow, ticket])

  const insight = useMemo(() => {
    if (!areaData.length) return 'Nenhum dado financeiro no período.'
    const lucros = areaData.map(d => d.Lucro)
    const last2  = lucros.slice(-2)
    if (last2.length === 2 && last2[0] > 0 && last2[1] < last2[0]) {
      const drop = Math.round((1 - last2[1] / last2[0]) * 100)
      return `O lucro médio caiu ${drop}% nos últimos 2 meses — verifique se as despesas aumentaram ou o cachê diminuiu.`
    }
    return `Faturamento total no período: ${fmtCurrency(totalRevenue)}. Ticket médio por show: ${fmtCurrency(ticket)}.`
  }, [areaData, totalRevenue, ticket])

  useEffect(() => { onInsightsChange([insight]) }, [insight])

  const singleEvent = filterEventoFinance && filterEventoFinance !== 'all'
    ? filtered.find(ev => String(ev.id) === filterEventoFinance) ?? null
    : null
  const singleEventCachesTotal = singleEvent ? evCaches(singleEvent) : 0
  const singleEventExpenses = singleEvent
    ? (expenses || []).filter(e => e.eventId === singleEvent.id)
    : []
  const singleEventVarExpTotal = singleEventExpenses.reduce((s, e) => s + (e.amount || 0), 0)
  const singleEventLucro = singleEvent ? (singleEvent.value || 0) - singleEventCachesTotal - singleEventVarExpTotal : 0
  const singleEventMargin = singleEvent && (singleEvent.value || 0) > 0
    ? Math.round((singleEventLucro / (singleEvent.value || 0)) * 100)
    : 0
  const singleEventMembersData = singleEvent
    ? (singleEvent.members || []).map(memId => {
        const m = members.find(x => x.id === memId)
        if (!m) return null
        const entry = payments[singleEvent.id]?.[m.id] ?? {}
        const base = m.cache ?? 0
        const value = entry.customValue != null ? entry.customValue : (entry.doubled ? base * 2 : base)
        const statusLabel = entry.paid ? 'Pago' : entry.partial ? 'Parcial' : 'Pendente'
        const statusColor = entry.paid ? 'text-emerald-600' : entry.partial ? 'text-amber-500' : 'text-slate-400'
        return { member: m, value, statusLabel, statusColor }
      }).filter(Boolean)
    : []

  return (
    <div className="space-y-4">
      {singleEvent ? (<>
        <Card className="rounded-2xl border-orange-100">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center shrink-0">
              <Music className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 truncate">{singleEvent.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {fmtDate(singleEvent.date)}{singleEvent.local ? ` · ${singleEvent.local}` : ''}{singleEvent.city ? ` · ${singleEvent.city}${singleEvent.state ? `/${singleEvent.state}` : ''}` : ''}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Valor do Contrato', value: fmtCurrency(singleEvent.value || 0), color: 'text-orange-600' },
            { label: 'Cachês', value: fmtCurrency(singleEventCachesTotal), color: 'text-red-500' },
            { label: 'Despesas Variáveis', value: fmtCurrency(singleEventVarExpTotal), color: 'text-amber-600' },
            { label: 'Lucro', value: fmtCurrency(singleEventLucro), color: singleEventLucro >= 0 ? 'text-emerald-600' : 'text-red-500' },
          ].map(({ label, value, color }) => (
            <Card key={label} className="rounded-2xl">
              <CardContent className="p-4">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
                <p className={cn('text-lg font-bold mt-1', color)}>{value}</p>
                {label === 'Lucro' && (singleEvent.value || 0) > 0 && (
                  <p className="text-xs text-slate-400">{singleEventMargin}% de margem</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {singleEventMembersData.length > 0 && (
          <SectionCard title="Cachês dos Membros">
            <div className="space-y-1">
              {singleEventMembersData.map(({ member, value, statusLabel, statusColor }) => (
                <div key={member.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                  <div style={{ background: member.color }} className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                    {member.init}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{member.name}</p>
                    <p className="text-[11px] text-slate-400">{member.role}</p>
                  </div>
                  <p className="text-sm font-bold text-slate-700 shrink-0">{fmtCurrency(value)}</p>
                  <span className={cn('text-[11px] font-semibold shrink-0 min-w-[52px] text-right', statusColor)}>{statusLabel}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {singleEventExpenses.length > 0 && (
          <SectionCard title="Despesas Variáveis">
            <div className="space-y-1">
              {singleEventExpenses.map(exp => (
                <div key={exp.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">{exp.type}</span>
                  <p className="flex-1 text-sm text-slate-600 truncate">{exp.description || exp.type}</p>
                  <p className="text-sm font-bold text-slate-700 shrink-0">{fmtCurrency(exp.amount || 0)}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        )}
      </>) : (<>
        <AnalyticPara text={introText} />

      <SectionCard title="Faturamento, Despesas e Lucro por Mês">
        <ChartBox title="Faturamento por Mês">
          {areaData.every(d => d.Receita === 0) ? EMPTY_CHART : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={areaData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gRec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.orange} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={C.orange} stopOpacity={0}   />
                  </linearGradient>
                  <linearGradient id="gDes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.red} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={C.red} stopOpacity={0}   />
                  </linearGradient>
                  <linearGradient id="gLuc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.green} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={C.green} stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => fmtCurrencyShort(v)} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={55} />
                <Tooltip content={<ChartTooltip currency />} />
                <Legend iconType="circle" iconSize={8} formatter={v => <span className="text-xs text-slate-600">{v}</span>} />
                <Area type="monotone" dataKey="Receita"  stroke={C.orange} fill="url(#gRec)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="Despesas" stroke={C.red}    fill="url(#gDes)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="Lucro"    stroke={C.green}  fill="url(#gLuc)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartBox>
      </SectionCard>

      <AnalyticPara text={chartContextTexts[0]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Lucro por Show (cronológico)">
          <ChartBox title="Lucro por Show">
            {!showProfitData.some(d => d.lucro !== 0) ? EMPTY_CHART : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={showProfitData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => fmtCurrencyShort(v)} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={55} />
                  <Tooltip content={<ChartTooltip currency />} />
                  <Line type="monotone" dataKey="lucro" name="Lucro" stroke={C.green} strokeWidth={2} dot={{ r: 3, fill: C.green }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartBox>
        </SectionCard>

        <div className="space-y-3">
          {[
            { label: 'Ticket Médio', value: fmtCurrency(ticket), sub: `${filtered.length} shows no período` },
            { label: 'Maior Show', value: maxShow ? fmtCurrency(maxShow.value || 0) : '—', sub: maxShow?.name || '—' },
            { label: 'Menor Show', value: minShow ? fmtCurrency(minShow.value || 0) : '—', sub: minShow?.name || '—' },
          ].map(({ label, value, sub }) => (
            <Card key={label} className="rounded-2xl">
              <CardContent className="p-4">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
                <p className="text-lg font-bold text-slate-800 mt-1">{value}</p>
                <p className="text-xs text-slate-400">{sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <AnalyticPara text={chartContextTexts[1]} />
      <InsightCard text={insight} />
      <AnalyticPara text={conclusionText} />
      </>)}

      <div className="flex justify-end">
        <Button
          variant="outline"
          className="gap-2 text-xs border-slate-200 hover:border-orange-400 hover:text-orange-600"
          onClick={() => setBalDialogOpen(true)}
        >
          <FileDown className="w-3.5 h-3.5" />
          Exportar relatório específico
        </Button>
      </div>

      <Dialog open={balDialogOpen} onOpenChange={setBalDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Balanço Financeiro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-slate-500">
              Selecione o mês/ano para gerar o balanço com receitas, cachês, despesas e lucro líquido.
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => handleShiftBalMonth(-1)} className="p-1 rounded hover:bg-slate-100 transition-colors">
                <ChevronLeft className="w-4 h-4 text-slate-500" />
              </button>
              <span className="flex-1 text-center text-xs font-semibold text-slate-700">
                {MONTHS[balMonth]} {balYear}
              </span>
              <button onClick={() => handleShiftBalMonth(1)} className="p-1 rounded hover:bg-slate-100 transition-colors">
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBalDialogOpen(false)} className="text-sm">Cancelar</Button>
            <Button
              disabled={balExporting}
              onClick={handleBalanceExport}
              className="gap-2 text-sm bg-orange-500 hover:bg-orange-600 text-white"
            >
              {balExporting
                ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <FileDown className="w-3.5 h-3.5" />}
              {balExporting ? 'Gerando...' : 'Gerar Balanço'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Module: Membros ────────────────────────────────────────────────────────

function MembrosModule({ events, members, payments, rehearsals, period, customFrom, customTo, filterRole, filterMembroEspecifico, filterEventoMembro, memberEvents, onExportGeneral, onInsightsChange }) {
  const { start, end } = getPeriodRange(period, customFrom, customTo)

  const { companyProfile, contractReceipts } = useStore()

  const [payDialogOpen,    setPayDialogOpen]    = useState(false)
  const [payMonth,         setPayMonth]         = useState(() => new Date().getMonth())
  const [payYear,          setPayYear]          = useState(() => new Date().getFullYear())
  const [payExporting,     setPayExporting]     = useState(false)
  const [receiptExporting, setReceiptExporting] = useState(false)

  function handleShiftPayMonth(delta) {
    let m = payMonth + delta, y = payYear
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setPayMonth(m); setPayYear(y)
  }

  const selectedMember = useMemo(() =>
    filterMembroEspecifico && filterMembroEspecifico !== 'all'
      ? members.find(m => String(m.id) === filterMembroEspecifico) ?? null
      : null,
  [filterMembroEspecifico, members])

  const selectedEvent = useMemo(() =>
    filterEventoMembro && filterEventoMembro !== ''
      ? events.find(e => String(e.id) === filterEventoMembro) ?? null
      : null,
  [filterEventoMembro, events])

  async function handlePayslipExport() {
    if (!selectedMember) return
    setPayExporting(true)
    try {
      await generatePayslip({
        member: selectedMember, events, payments, companyProfile,
        month: payMonth, year: payYear,
      })
      toast.success('Holerite gerado!')
      setPayDialogOpen(false)
    } catch (err) {
      console.error('[payslip-export]', err)
      toast.error('Erro ao gerar PDF.')
    } finally {
      setPayExporting(false)
    }
  }

  async function handleReceiptExport() {
    if (!selectedMember || !selectedEvent) return
    setReceiptExporting(true)
    try {
      await generatePaymentReceipt({
        member: selectedMember, event: selectedEvent, payments,
        companyProfile, contractReceipts: contractReceipts || {},
      })
      toast.success('Comprovante gerado!')
    } catch (err) {
      console.error('[receipt-export]', err)
      toast.error('Erro ao gerar PDF.')
    } finally {
      setReceiptExporting(false)
    }
  }

  const filtered = useMemo(() => eventsInPeriod(events, start, end), [events, start, end])
  const filtReh   = useMemo(() => (rehearsals || []).filter(r => {
    if (!r.date) return false
    const d = new Date(r.date + 'T12:00:00')
    return d >= start && d <= end
  }), [rehearsals, start, end])

  const memberStats = useMemo(() => {
    return members
      .filter(m => filterRole === 'all' || m.role === filterRole)
      .map(m => {
        const evs = filtered.filter(ev => (ev.members || []).includes(m.id))
        let total = 0
        evs.forEach(ev => {
          const entry = payments[ev.id]?.[m.id] ?? {}
          const base  = m.cache ?? 0
          total += entry.customValue != null ? entry.customValue : (entry.doubled ? base * 2 : base)
        })
        const expected = filtReh.length
        const attended = filtReh.filter(r => (r.attendedMembers || []).includes(m.id)).length
        const pct = expected > 0 ? Math.round((attended / expected) * 100) : 0
        return { member: m, total, shows: evs.length, attended, expected, pct }
      })
      .sort((a, b) => b.total - a.total)
  }, [members, filtered, payments, filtReh, filterRole])

  const noShows = useMemo(() => memberStats.filter(s => s.shows === 0), [memberStats])

  const avgCache = useMemo(() => {
    const with$ = memberStats.filter(s => s.total > 0)
    if (!with$.length) return 0
    return with$.reduce((s, x) => s + x.total, 0) / with$.length
  }, [memberStats])

  const introText = useMemo(() => {
    if (!members.length) return ''
    const withShows = memberStats.filter(s => s.shows > 0)
    const total     = memberStats.reduce((s, x) => s + x.total, 0)
    const parts     = []
    parts.push(`No período, ${withShows.length} de ${members.length} membro${members.length !== 1 ? 's' : ''} participou${withShows.length !== 1 ? 'ram' : ''} de pelo menos um show, com desembolso total de ${fmtCurrency(total)} em cachês.`)
    if (memberStats.length > 0 && memberStats[0].total > 0) parts.push(`${memberStats[0].member.name} liderou com o maior volume de cachê (${fmtCurrency(memberStats[0].total)}).`)
    if (noShows.length > 0) parts.push(`${noShows.length} membro${noShows.length !== 1 ? 's ficaram' : ' ficou'} sem shows no período.`)
    return parts.join(' ')
  }, [members, memberStats, noShows])

  const chartContextTexts = useMemo(() => {
    const t0 = (() => {
      if (!memberStats.some(s => s.total > 0)) return 'Nenhum cachê registrado no período. Associe membros a shows e defina valores para visualizar a distribuição.'
      const tot = memberStats.reduce((s, x) => s + x.total, 0)
      const dom = memberStats[0]
      const pct = tot > 0 ? Math.round((dom.total / tot) * 100) : 0
      if (pct >= 40) return `${dom.member.name} concentra ${pct}% do total de cachês do período — uma disparidade que pode refletir maior participação em shows ou cachê individual mais elevado. Avalie se a distribuição de escalas está alinhada com as expectativas do grupo e se há membros que gostariam de participar mais ativamente.`
      return 'A distribuição de cachês entre os membros é relativamente equilibrada no período, o que sugere boa rotatividade de escalas. Manter esse equilíbrio tende a fortalecer a coesão do grupo e evitar insatisfações internas relacionadas à participação nos shows.'
    })()

    const t1 = (() => {
      if (!filtReh.length) return ''
      const lowFreq = memberStats.filter(s => s.pct < 60 && s.expected > 0)
      if (lowFreq.length > 0) {
        const names = lowFreq.slice(0, 2).map(s => s.member.name).join(', ')
        return `${names} apresenta${lowFreq.length === 1 ? '' : 'm'} presença abaixo de 60% nos ensaios — um índice que pode comprometer a preparação do repertório. Identifique se há impedimentos recorrentes e busque soluções antes que a falta de ensaios afete a qualidade das apresentações.`
      }
      const highFreq = memberStats.filter(s => s.pct >= 80 && s.expected > 0)
      if (highFreq.length === memberStats.length) return 'Todos os membros mantêm presença acima de 80% nos ensaios — um indicador excelente de comprometimento. Esse nível de engajamento tende a se refletir diretamente na qualidade das apresentações ao vivo.'
      return 'A frequência nos ensaios está dentro de um nível aceitável para a maioria dos membros. Mantenha o acompanhamento periódico para evitar que membros específicos acumulem ausências que possam comprometer a coesão do repertório.'
    })()

    return [t0, t1]
  }, [memberStats, filtReh])

  const conclusionText = useMemo(() => {
    if (!members.length) return ''
    const parts = []
    if (noShows.length === 0) parts.push(`Todos os ${members.length} membros participaram de pelo menos um show no período — o elenco está ativo e bem distribuído.`)
    else parts.push(`${noShows.length} membro${noShows.length !== 1 ? 's' : ''} sem participação em shows no período: revise se ainda faz${noShows.length !== 1 ? 'em' : ''} parte do elenco ativo ou se há algum impedimento que precise ser resolvido.`)
    if (avgCache > 0) parts.push(`Com cachê médio de ${fmtCurrency(avgCache)} por membro, avalie periodicamente se os valores estão alinhados com o mercado e com a geração de caixa da banda.`)
    return parts.join(' ')
  }, [members, noShows, avgCache])

  const insight = useMemo(() => {
    if (!members.length) return 'Nenhum membro cadastrado.'
    if (noShows.length > 0) {
      const names = noShows.slice(0, 2).map(s => s.member.name).join(', ')
      return `${names} não participou${noShows.length > 1 ? 'm' : ''} de nenhum show no período — ainda faz${noShows.length > 1 ? 'em' : ''} parte do elenco ativo?`
    }
    return `Cachê médio por membro no período: ${fmtCurrency(avgCache)}.`
  }, [members, noShows, avgCache])

  useEffect(() => { onInsightsChange([insight]) }, [insight])

  const barData = memberStats.map(s => ({ name: s.member.name.split(' ')[0], cache: s.total }))

  const selectedMemberShows = selectedMember
    ? filtered.filter(ev => (ev.members || []).includes(selectedMember.id))
        .sort((a, b) => b.date.localeCompare(a.date))
    : []
  const selectedMemberStats = selectedMember
    ? memberStats.find(s => s.member.id === selectedMember.id) ?? null
    : null

  return (
    <div className="space-y-4">
      {selectedMember ? (<>
        <Card className="rounded-2xl">
          <CardContent className="p-4 flex items-center gap-4">
            <div style={{ background: selectedMember.color }} className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0">
              {selectedMember.init}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-slate-800">{selectedMember.name}</p>
              <p className="text-sm text-slate-500">{selectedMember.role}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Cachê base</p>
              <p className="text-base font-bold text-slate-700">{fmtCurrency(selectedMember.cache || 0)}</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Ganho', value: fmtCurrency(selectedMemberStats?.total ?? 0), color: 'text-orange-600' },
            { label: 'Shows no Período', value: String(selectedMemberStats?.shows ?? 0), color: 'text-slate-800' },
            { label: 'Freq. Ensaios', value: filtReh.length > 0 ? `${selectedMemberStats?.pct ?? 0}%` : '—', color: (selectedMemberStats?.pct ?? 0) >= 80 ? 'text-emerald-600' : (selectedMemberStats?.pct ?? 0) >= 60 ? 'text-amber-500' : filtReh.length > 0 ? 'text-red-500' : 'text-slate-400' },
          ].map(({ label, value, color }) => (
            <Card key={label} className="rounded-2xl">
              <CardContent className="p-4">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
                <p className={cn('text-lg font-bold mt-1', color)}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedMemberShows.length > 0 ? (
          <SectionCard title={`Shows no período (${selectedMemberShows.length})`}>
            <div className="space-y-1">
              {selectedMemberShows.map(ev => {
                const entry = payments[ev.id]?.[selectedMember.id] ?? {}
                const base = selectedMember.cache ?? 0
                const val = entry.customValue != null ? entry.customValue : (entry.doubled ? base * 2 : base)
                const statusLabel = entry.paid ? 'Pago' : entry.partial ? 'Parcial' : 'Pendente'
                const statusColor = entry.paid ? 'text-emerald-600 bg-emerald-50' : entry.partial ? 'text-amber-600 bg-amber-50' : 'text-slate-500 bg-slate-100'
                return (
                  <div key={ev.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                    <p className="text-xs text-slate-400 shrink-0 w-14">{fmtDate(ev.date).slice(0, 5)}</p>
                    <p className="flex-1 text-sm font-medium text-slate-700 truncate">{ev.name}</p>
                    <p className="text-sm font-bold text-slate-700 shrink-0">{fmtCurrency(val)}</p>
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0', statusColor)}>{statusLabel}</span>
                  </div>
                )
              })}
            </div>
          </SectionCard>
        ) : (
          <Card className="rounded-2xl">
            <CardContent className="p-6 text-center text-sm text-slate-400">
              Nenhum show no período selecionado.
            </CardContent>
          </Card>
        )}

        {filtReh.length > 0 && selectedMemberStats && (
          <SectionCard title="Frequência em Ensaios">
            <div className="flex items-center gap-3">
              <div style={{ background: selectedMember.color }} className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                {selectedMember.init}
              </div>
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-slate-800">{selectedMember.name}</span>
                  <span className="text-[11px] text-slate-400">{selectedMemberStats.attended}/{selectedMemberStats.expected}</span>
                </div>
                <Progress value={selectedMemberStats.pct} className={cn('h-1.5', selectedMemberStats.pct >= 80 ? '[&>div]:bg-emerald-500' : selectedMemberStats.pct >= 60 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500')} />
              </div>
              <span className={cn('text-xs font-bold w-10 text-right shrink-0', selectedMemberStats.pct >= 80 ? 'text-emerald-600' : selectedMemberStats.pct >= 60 ? 'text-amber-500' : 'text-red-500')}>
                {selectedMemberStats.pct}%
              </span>
            </div>
          </SectionCard>
        )}

        <InsightCard text={selectedMemberStats
          ? `${selectedMember.name}: ${selectedMemberStats.shows} show${selectedMemberStats.shows !== 1 ? 's' : ''} no período, ${fmtCurrency(selectedMemberStats.total)} em cachê${filtReh.length > 0 ? `, ${selectedMemberStats.pct}% de freq. em ensaios` : ''}.`
          : `${selectedMember.name} não participou de nenhum show no período.`
        } />
      </>) : (<>
        <AnalyticPara text={introText} />

        <SectionCard title="Cachê Total por Membro">
        <ChartBox title="Cachê Total por Membro">
          {!barData.some(d => d.cache > 0) ? EMPTY_CHART : (
            <ResponsiveContainer width="100%" height={Math.max(200, barData.length * 36)}>
              <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tickFormatter={v => fmtCurrencyShort(v)} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip currency />} />
                <Bar dataKey="cache" name="Cachê" fill={C.orange} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartBox>
      </SectionCard>

      <AnalyticPara text={chartContextTexts[0]} />

      {filtReh.length > 0 && (
        <SectionCard title="Frequência em Ensaios">
          <div className="space-y-3">
            {memberStats.map(({ member, attended, expected, pct }) => (
              <div key={member.id} className="flex items-center gap-3">
                <div style={{ background: member.color }} className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                  {member.init}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-slate-800 truncate">{member.name}</span>
                    <span className="text-[11px] text-slate-400 shrink-0">{attended}/{expected}</span>
                  </div>
                  <Progress value={pct} className={cn('h-1.5', pct >= 80 ? '[&>div]:bg-emerald-500' : pct >= 60 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500')} />
                </div>
                <span className={cn('text-xs font-bold w-10 text-right shrink-0', pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-500' : 'text-red-500')}>
                  {pct}%
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <AnalyticPara text={filtReh.length > 0 ? chartContextTexts[1] : null} />

      <Card className="rounded-2xl">
        <CardContent className="p-4 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Cachê Médio / Membro</p>
            <p className="text-xl font-bold text-slate-800 mt-1">{fmtCurrency(avgCache)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Inativos no Período</p>
            <p className={cn('text-xl font-bold mt-1', noShows.length > 0 ? 'text-amber-500' : 'text-emerald-600')}>
              {noShows.length}
            </p>
          </div>
        </CardContent>
      </Card>

      <InsightCard text={insight} />
      <AnalyticPara text={conclusionText} />
      </>)}

      <div className="flex flex-wrap gap-2 justify-end">
        <Button
          variant="outline"
          className="gap-2 text-xs border-slate-200 hover:border-orange-400 hover:text-orange-600"
          onClick={() => selectedMember ? setPayDialogOpen(true) : onExportGeneral?.()}
        >
          <FileDown className="w-3.5 h-3.5" />
          {selectedMember ? 'Exportar relatório específico' : 'Exportar análise geral'}
        </Button>
        {selectedMember && selectedEvent && (
          <Button
            disabled={receiptExporting}
            variant="outline"
            className="gap-2 text-xs border-slate-200 hover:border-orange-400 hover:text-orange-600"
            onClick={handleReceiptExport}
          >
            {receiptExporting
              ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              : <CreditCard className="w-3.5 h-3.5" />}
            {receiptExporting ? 'Gerando...' : 'Comprovante de pagamento'}
          </Button>
        )}
      </div>

      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Holerite — {selectedMember?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-slate-500">
              Selecione o mês/ano para gerar o holerite com todos os shows, cachês e status de pagamento.
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => handleShiftPayMonth(-1)} className="p-1 rounded hover:bg-slate-100 transition-colors">
                <ChevronLeft className="w-4 h-4 text-slate-500" />
              </button>
              <span className="flex-1 text-center text-xs font-semibold text-slate-700">
                {MONTHS[payMonth]} {payYear}
              </span>
              <button onClick={() => handleShiftPayMonth(1)} className="p-1 rounded hover:bg-slate-100 transition-colors">
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)} className="text-sm">Cancelar</Button>
            <Button
              disabled={payExporting}
              onClick={handlePayslipExport}
              className="gap-2 text-sm bg-orange-500 hover:bg-orange-600 text-white"
            >
              {payExporting
                ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <FileDown className="w-3.5 h-3.5" />}
              {payExporting ? 'Gerando...' : 'Gerar Holerite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Module: Repertório e Setlist ───────────────────────────────────────────

function RepertorioModule({ songs, filterTag, onInsightsChange }) {
  const songList = useMemo(() =>
    (songs || []).filter(s => filterTag === 'all' || (s.tags || []).includes(filterTag)),
  [songs, filterTag])

  const topPlayed = useMemo(() =>
    [...songList].sort((a, b) => (b.playCount || 0) - (a.playCount || 0)).slice(0, 8)
      .map(s => ({ name: s.title.slice(0, 24), plays: s.playCount || 0 })),
  [songList])

  const topRehearsal = useMemo(() =>
    [...songList].sort((a, b) => (b.rehearsalCount || 0) - (a.rehearsalCount || 0)).slice(0, 8)
      .map(s => ({ name: s.title.slice(0, 24), ensaios: s.rehearsalCount || 0 })),
  [songList])

  const { playSemEnsaio, ensaioSemShow } = useMemo(() => {
    const playSemEnsaio = songList.filter(s => (s.playCount || 0) >= 5 && (s.rehearsalCount || 0) <= 2)
    const ensaioSemShow = songList.filter(s => (s.rehearsalCount || 0) >= 5 && (s.playCount || 0) === 0)
    return { playSemEnsaio, ensaioSemShow }
  }, [songList])

  const introText = useMemo(() => {
    if (!songList.length) return ''
    const withPlays     = songList.filter(s => (s.playCount || 0) > 0)
    const withRehearsals = songList.filter(s => (s.rehearsalCount || 0) > 0)
    const parts = []
    parts.push(`O repertório possui ${songList.length} música${songList.length !== 1 ? 's' : ''}, das quais ${withPlays.length} já foram tocadas em shows e ${withRehearsals.length} foram ensaiadas.`)
    if (topPlayed[0]?.plays > 0) parts.push(`"${topPlayed[0].name}" lidera com ${topPlayed[0].plays} execução${topPlayed[0].plays !== 1 ? 'ões' : ''} em shows.`)
    return parts.join(' ')
  }, [songList, topPlayed])

  const chartContextTexts = useMemo(() => {
    const t0 = (() => {
      if (!topPlayed.some(d => d.plays > 0)) return 'Nenhuma música foi tocada em shows ainda. Registre setlists para visualizar o ranking de músicas mais executadas.'
      const totalPlays = topPlayed.reduce((s, d) => s + d.plays, 0)
      const dom = topPlayed[0]
      const pct = totalPlays > 0 ? Math.round((dom.plays / totalPlays) * 100) : 0
      if (pct >= 40) return `"${dom.name}" domina o setlist com ${pct}% das execuções totais — uma escolha estratégica recorrente. Músicas tão concentradas no topo do ranking podem indicar repertório pouco variado; considere introduzir novas músicas nos próximos setlists para manter o interesse do público.`
      return 'O ranking de músicas mais tocadas está bem distribuído, sem uma música claramente dominante. Essa variedade pode ser um diferencial positivo, mas também pode dificultar a criação de um "hit de assinatura" que o público espera e que define a identidade sonora da banda.'
    })()

    const t1 = (() => {
      if (!topRehearsal.some(d => d.ensaios > 0)) return ''
      if (ensaioSemShow.length > 0) return `${ensaioSemShow.length} música${ensaioSemShow.length !== 1 ? 's foram ensaiadas' : ' foi ensaiada'} repetidamente mas nunca executada${ensaioSemShow.length !== 1 ? 's' : ''} em show. Defina um prazo para decidir se entram no repertório ativo ou são descontinuadas, evitando desperdício de tempo de ensaio.`
      if (playSemEnsaio.length > 0) return `${playSemEnsaio.length} música${playSemEnsaio.length !== 1 ? 's são tocadas' : ' é tocada'} frequentemente em shows mas raramente ensaiada${playSemEnsaio.length !== 1 ? 's' : ''}. Reserve espaço nos próximos ensaios para manter a qualidade dessas execuções.`
      return 'O equilíbrio entre músicas ensaiadas e tocadas em shows é saudável, indicando que o repertório ativo está bem preparado. Mantenha o ciclo de ensaio-execução para preservar a qualidade ao longo do tempo.'
    })()

    return [t0, t1]
  }, [topPlayed, topRehearsal, ensaioSemShow, playSemEnsaio])

  const conclusionText = useMemo(() => {
    if (!songList.length) return ''
    const notUsed = songList.filter(s => !(s.playCount || 0) && !(s.rehearsalCount || 0))
    const parts   = []
    if (notUsed.length > 0) parts.push(`${notUsed.length} música${notUsed.length !== 1 ? 's' : ''} não ${notUsed.length !== 1 ? 'foram nem ensaiadas nem tocadas' : 'foi nem ensaiada nem tocada'} — considere se devem permanecer no repertório ativo.`)
    if (topPlayed.length > 0 && topPlayed[0].plays > 0) parts.push('Mantenha as músicas mais tocadas em rotação regular de ensaio para garantir a qualidade e explore novas composições para renovar o repertório periodicamente.')
    return parts.join(' ')
  }, [songList, topPlayed])

  const insight = useMemo(() => {
    if (!songList.length) return 'Nenhuma música no repertório.'
    const parts = []
    if (playSemEnsaio.length)
      parts.push(`${playSemEnsaio[0].title} é tocada em ${playSemEnsaio[0].playCount} shows mas foi ensaiada apenas ${playSemEnsaio[0].rehearsalCount} vez(es) — a banda está preparada?`)
    if (ensaioSemShow.length)
      parts.push(`${ensaioSemShow[0].title} foi ensaiada ${ensaioSemShow[0].rehearsalCount} vezes mas nunca tocada em show — considere incluir no próximo setlist ou remover do repertório ativo.`)
    return parts.join(' ') || `Repertório com ${songList.length} músicas. Tudo em equilíbrio.`
  }, [songList, playSemEnsaio, ensaioSemShow])

  useEffect(() => { onInsightsChange([insight]) }, [insight])

  return (
    <div className="space-y-4">
      <AnalyticPara text={introText} />

      <SectionCard title="Músicas Mais Tocadas em Shows">
        <ChartBox title="Músicas Mais Tocadas">
          {!topPlayed.some(d => d.plays > 0) ? EMPTY_CHART : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topPlayed} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="plays" name="Shows" fill={C.orange} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartBox>
      </SectionCard>

      <AnalyticPara text={chartContextTexts[0]} />

      <SectionCard title="Músicas Mais Ensaiadas">
        <ChartBox title="Músicas Mais Ensaiadas">
          {!topRehearsal.some(d => d.ensaios > 0) ? EMPTY_CHART : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topRehearsal} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="ensaios" name="Ensaios" fill={C.blue} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartBox>
      </SectionCard>

      <AnalyticPara text={chartContextTexts[1]} />
      <InsightCard text={insight} />
      <AnalyticPara text={conclusionText} />
    </div>
  )
}

// ── Module: Ensaios ────────────────────────────────────────────────────────

function EnsaiosModule({ rehearsals, members, songs, period, customFrom, customTo, filterMembro, onInsightsChange }) {
  const { start, end } = getPeriodRange(period, customFrom, customTo)

  const filtered = useMemo(() => (rehearsals || []).filter(r => {
    if (!r.date) return false
    const d = new Date(r.date + 'T12:00:00')
    if (d < start || d > end) return false
    if (filterMembro !== 'all' && !(r.attendedMembers || []).includes(filterMembro)) return false
    return true
  }), [rehearsals, start, end, filterMembro])

  const months = useMemo(() => getMonthsInRange(start, end), [start, end])

  const attendanceLine = useMemo(() => {
    return months.map(({ year, month }) => {
      const monthRehs = filtered.filter(r => {
        const d = new Date(r.date + 'T12:00:00')
        return d.getFullYear() === year && d.getMonth() === month
      })
      if (!monthRehs.length) return { name: MONTHS[month].slice(0, 3), presença: null }
      const avg = monthRehs.reduce((s, r) => {
        const total = members.length || 1
        const attended = (r.attendedMembers || []).length
        return s + (attended / total) * 100
      }, 0) / monthRehs.length
      return { name: MONTHS[month].slice(0, 3), presença: Math.round(avg) }
    })
  }, [filtered, months, members])

  const memberFreq = useMemo(() => {
    return members.map(m => {
      const attended = filtered.filter(r => (r.attendedMembers || []).includes(m.id)).length
      const pct = filtered.length > 0 ? Math.round((attended / filtered.length) * 100) : 0
      return { member: m, attended, expected: filtered.length, pct }
    }).sort((a, b) => b.pct - a.pct)
  }, [members, filtered])

  const introText = useMemo(() => {
    if (!filtered.length) return ''
    const global = memberFreq.length ? Math.round(memberFreq.reduce((s, m) => s + m.pct, 0) / memberFreq.length) : 0
    const parts  = []
    parts.push(`No período, foram realizados ${filtered.length} ensaio${filtered.length !== 1 ? 's' : ''} com presença média de ${global}% do elenco.`)
    const stars = memberFreq.filter(m => m.pct >= 90 && m.expected > 0)
    if (stars.length) parts.push(`${stars.map(s => s.member.name.split(' ')[0]).join(', ')} ${stars.length === 1 ? 'manteve' : 'mantiveram'} presença exemplar (≥90%) — comprometimento que fortalece a qualidade das apresentações.`)
    return parts.join(' ')
  }, [filtered, memberFreq])

  const chartContextTexts = useMemo(() => {
    const t0 = (() => {
      if (!memberFreq.length || !filtered.length) return 'Nenhum dado de frequência disponível.'
      const low  = memberFreq.filter(m => m.pct < 60 && m.expected > 0)
      const high = memberFreq.filter(m => m.pct >= 80 && m.expected > 0)
      if (low.length > 0) {
        const names = low.slice(0, 2).map(s => s.member.name.split(' ')[0]).join(', ')
        return `${names} registra${low.length === 1 ? '' : 'm'} presença abaixo de 60% — um nível que pode comprometer a preparação do grupo. Identifique os motivos das ausências e estabeleça um mínimo de presença para que a banda funcione de forma coesa. Membros com baixa frequência tendem a apresentar menor domínio do repertório ao vivo.`
      }
      if (high.length >= Math.ceil(memberFreq.length * 0.75)) return 'A maioria dos membros mantém presença acima de 80% nos ensaios — um indicador excelente de comprometimento coletivo. Esse nível de engajamento cria a base técnica necessária para apresentações consistentes e bem executadas ao vivo.'
      return 'A frequência nos ensaios apresenta variação entre os membros. Monitore os índices individualmente e converse sobre expectativas de comprometimento — alinhamento claro é fundamental para a saúde a longo prazo do grupo.'
    })()

    const t1 = (() => {
      const valid = attendanceLine.filter(d => d.presença !== null)
      if (valid.length < 2) return 'Período com poucos ensaios para identificar tendências na evolução da presença.'
      const half      = Math.ceil(valid.length / 2)
      const avgFirst  = valid.slice(0, half).reduce((s, d) => s + d.presença, 0) / half
      const avgSecond = valid.slice(half).reduce((s, d) => s + d.presença, 0) / (valid.length - half || 1)
      if (avgSecond > avgFirst + 10) return `A evolução da presença média mostra tendência positiva, com crescimento de ${Math.round(avgFirst)}% para ${Math.round(avgSecond)}%. Esse engajamento crescente é um sinal saudável e deve ser reconhecido pelo grupo para reforçar o comportamento.`
      if (avgSecond < avgFirst - 10) return `A curva de presença revela queda ao longo do período — de ${Math.round(avgFirst)}% para ${Math.round(avgSecond)}%. Investigue se há fatores externos (agenda intensa, desmotivação) e tome medidas antes que a queda se consolide como padrão.`
      return 'A presença média nos ensaios manteve-se estável ao longo do período, sem tendências expressivas. Estabilidade é positiva, mas não elimina a necessidade de monitorar membros individualmente para evitar que ausências pontuais passem despercebidas.'
    })()

    return [t0, t1]
  }, [memberFreq, filtered, attendanceLine])

  const conclusionText = useMemo(() => {
    if (!filtered.length) return ''
    const global = memberFreq.length ? Math.round(memberFreq.reduce((s, m) => s + m.pct, 0) / memberFreq.length) : 0
    const parts  = []
    if (global >= 80) parts.push(`Com presença média de ${global}% nos ensaios, o grupo demonstra alto comprometimento — um diferencial que se traduz em shows de melhor qualidade.`)
    else if (global >= 60) parts.push(`A presença média de ${global}% nos ensaios é aceitável, mas há espaço para melhora. Considere tornar os ensaios mais eficientes para maximizar o impacto de cada encontro.`)
    else parts.push(`Com apenas ${global}% de presença média, os ensaios estão aquém do necessário. Revise a dinâmica do grupo e estabeleça expectativas claras de comprometimento.`)
    const missedOpp = filtered.length * (members.length || 1) - memberFreq.reduce((s, m) => s + m.attended, 0)
    if (missedOpp > 0) parts.push(`No total, ${missedOpp} presença${missedOpp !== 1 ? 's foram' : ' foi'} perdida${missedOpp !== 1 ? 's' : ''} — cada ausência é uma oportunidade de prática que não volta.`)
    return parts.join(' ')
  }, [filtered, memberFreq, members])

  const insight = useMemo(() => {
    const last2 = attendanceLine.filter(d => d.presença !== null).slice(-2)
    if (last2.length === 2 && last2[1] < last2[0] - 15) {
      return `A média de presença caiu de ${last2[0].presença}% para ${last2[1].presença}% nos últimos 2 meses — algo está acontecendo com a banda?`
    }
    if (!filtered.length) return 'Nenhum ensaio no período selecionado.'
    const global = memberFreq.length ? Math.round(memberFreq.reduce((s, m) => s + m.pct, 0) / memberFreq.length) : 0
    return `Média de presença nos ensaios: ${global}%. Total de ${filtered.length} ensaio${filtered.length !== 1 ? 's' : ''} no período.`
  }, [attendanceLine, filtered, memberFreq])

  useEffect(() => { onInsightsChange([insight]) }, [insight])

  return (
    <div className="space-y-4">
      <AnalyticPara text={introText} />

      <SectionCard title="Frequência por Membro">
        <div className="space-y-3">
          {memberFreq.length === 0
            ? <p className="text-sm text-slate-400 text-center py-6">Nenhum dado ainda</p>
            : memberFreq.map(({ member, attended, expected, pct }) => (
              <div key={member.id} className="flex items-center gap-3">
                <div style={{ background: member.color }} className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                  {member.init}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-slate-800 truncate">{member.name}</span>
                    <span className="text-[11px] text-slate-400 shrink-0">{attended}/{expected}</span>
                  </div>
                  <Progress value={pct} className={cn('h-1.5', pct >= 80 ? '[&>div]:bg-emerald-500' : pct >= 60 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500')} />
                </div>
                <span className={cn('text-xs font-bold w-10 text-right shrink-0', pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-500' : 'text-red-500')}>
                  {pct}%
                </span>
              </div>
          ))}
        </div>
      </SectionCard>

      <AnalyticPara text={chartContextTexts[0]} />

      <SectionCard title="Evolução da Presença Média">
        <ChartBox title="Evolução da Presença Média">
          {attendanceLine.every(d => d.presença === null) ? EMPTY_CHART : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={attendanceLine} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={v => `${v}%`} />
                <Line type="monotone" dataKey="presença" name="Presença" stroke={C.orange} strokeWidth={2} dot={{ fill: C.orange, r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartBox>
      </SectionCard>

      <AnalyticPara text={chartContextTexts[1]} />
      <InsightCard text={insight} />
      <AnalyticPara text={conclusionText} />
    </div>
  )
}

// ── Module: Contratantes ───────────────────────────────────────────────────

function ContratantesModule({ contractors, events, members, payments, expenses, period, customFrom, customTo, filterEstado, onInsightsChange }) {
  const { start, end } = getPeriodRange(period, customFrom, customTo)
  const filtered = useMemo(() => eventsInPeriod(events, start, end), [events, start, end])

  const ranking = useMemo(() => {
    return contractors
      .map(c => {
        const linked = filtered.filter(ev => (ev.contractorIds || []).includes(c.id))
        const ltv = linked.reduce((s, ev) => s + (ev.value || 0), 0)
        return { contractor: c, shows: linked.length, ltv }
      })
      .filter(d => filterEstado === 'all' || d.contractor.state === filterEstado)
      .sort((a, b) => b.shows - a.shows)
      .slice(0, 8)
  }, [contractors, filtered, filterEstado])

  const barData = ranking.map(r => ({ name: r.contractor.name.split(' ')[0], shows: r.shows }))

  const mapContractors = useMemo(() =>
    contractors.filter(c => c.lat && c.lng && (filterEstado === 'all' || c.state === filterEstado)),
  [contractors, filterEstado])

  const topLTV = useMemo(() => ranking[0], [ranking])

  const inactive = useMemo(() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 90)
    return contractors.filter(c => {
      const linked = events.filter(ev => (ev.contractorIds || []).includes(c.id))
      if (!linked.length) return false
      const last = linked.reduce((a, ev) => ev.date > a ? ev.date : a, '')
      return new Date(last + 'T12:00:00') < cutoff
    })
  }, [contractors, events])

  const introText = useMemo(() => {
    if (!contractors.length) return ''
    const active   = ranking.filter(r => r.shows > 0)
    const totalLtv = ranking.reduce((s, r) => s + r.ltv, 0)
    const parts    = []
    parts.push(`A base possui ${contractors.length} contratante${contractors.length !== 1 ? 's' : ''} cadastrado${contractors.length !== 1 ? 's' : ''}, dos quais ${active.length} estiveram ativos no período.`)
    if (totalLtv > 0) parts.push(`O faturamento total gerado pelos contratantes do período foi de ${fmtCurrency(totalLtv)}.`)
    if (inactive.length > 0) parts.push(`${inactive.length} contratante${inactive.length !== 1 ? 's' : ''} sem shows há mais de 90 dias — pode valer retomar o contato.`)
    return parts.join(' ')
  }, [contractors, ranking, inactive])

  const chartContextTexts = useMemo(() => {
    const t0 = (() => {
      if (!barData.some(d => d.shows > 0)) return 'Nenhum contratante com shows no período.'
      const totalShows = barData.reduce((s, d) => s + d.shows, 0)
      const dom = barData[0]
      const pct = totalShows > 0 ? Math.round((dom.shows / totalShows) * 100) : 0
      if (pct >= 40) return `${dom.name} representa ${pct}% de todos os shows do período — uma dependência elevada de um único contratante. Essa concentração aumenta o risco operacional: qualquer mudança de relacionamento com esse parceiro poderia impactar significativamente a agenda. Diversifique ativamente a carteira para reduzir essa vulnerabilidade.`
      return 'O ranking de contratantes está relativamente diversificado, sem um único parceiro dominante. Essa distribuição é saudável e reduz o risco de dependência, mas não elimina a necessidade de cultivar ativamente os relacionamentos com os principais contratantes para garantir recorrência.'
    })()
    return [t0]
  }, [barData])

  const conclusionText = useMemo(() => {
    if (!contractors.length) return ''
    const parts = []
    if (inactive.length > 0) parts.push(`Priorize o reengajamento dos ${inactive.length} contratante${inactive.length !== 1 ? 's' : ''} inativos — uma abordagem proativa pode reativar parcerias com LTV histórico positivo sem o custo de prospecção de novos clientes.`)
    if (topLTV) parts.push(`Mantenha ${topLTV.contractor.name} como parceiro estratégico prioritário e explore a possibilidade de ampliar a frequência de shows com esse contratante.`)
    return parts.join(' ')
  }, [contractors, ranking, inactive, topLTV])

  const insight = useMemo(() => {
    if (!contractors.length) return 'Nenhum contratante cadastrado.'
    const totalLtv = ranking.reduce((s, r) => s + r.ltv, 0)
    if (topLTV && totalLtv > 0) {
      const pct = Math.round((topLTV.ltv / totalLtv) * 100)
      if (pct >= 40) return `${topLTV.contractor.name} representa ${pct}% do faturamento — diversifique sua carteira para reduzir risco.`
    }
    if (inactive.length) return `${inactive.length} contratante${inactive.length !== 1 ? 's' : ''} sem shows há mais de 90 dias. Vale retomar o contato.`
    return `${contractors.length} contratantes cadastrados. ${ranking.filter(r => r.shows > 0).length} ativos no período.`
  }, [contractors, ranking, topLTV, inactive])

  useEffect(() => { onInsightsChange([insight]) }, [insight])

  return (
    <div className="space-y-4">
      <AnalyticPara text={introText} />

      <SectionCard title="Contratantes com Mais Shows">
        <ChartBox title="Contratantes por Shows">
          {!barData.some(d => d.shows > 0) ? EMPTY_CHART : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="shows" name="Shows" fill={C.orange} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartBox>
      </SectionCard>

      <AnalyticPara text={chartContextTexts[0]} />

      {mapContractors.length > 0 && (
        <SectionCard title="Mapa de Contratantes">
          <div className="h-64 rounded-xl overflow-hidden">
            <Suspense fallback={<Skeleton className="w-full h-full" />}>
              <BrazilMap events={mapContractors.map(c => ({ ...c, date: '' }))} />
            </Suspense>
          </div>
        </SectionCard>
      )}

      <InsightCard text={insight} />
      <AnalyticPara text={conclusionText} />
    </div>
  )
}

// ── Module: Equipamentos ───────────────────────────────────────────────────

function EquipamentosModule({ equipment, showEquipment, onInsightsChange }) {
  const usageCount = useMemo(() => {
    const map = {}
    ;(showEquipment || []).forEach(se => {
      ;(se.equipmentIds || []).forEach(eid => { map[eid] = (map[eid] || 0) + 1 })
    })
    return map
  }, [showEquipment])

  const byCategory = useMemo(() => {
    const cat = {}
    ;(equipment || []).forEach(eq => {
      const c = eq.category || eq.type || 'Sem categoria'
      cat[c] = (cat[c] || 0) + (usageCount[eq.id] || 0)
    })
    return Object.entries(cat).map(([name, uses]) => ({ name, uses })).sort((a, b) => b.uses - a.uses)
  }, [equipment, usageCount])

  const neverUsed = useMemo(() => (equipment || []).filter(eq => !usageCount[eq.id]), [equipment, usageCount])
  const needsRepair = useMemo(() =>
    (equipment || []).filter(eq => (eq.status || '').toLowerCase().includes('reparo') || (eq.status || '').toLowerCase().includes('manutenção')),
  [equipment])

  const introText = useMemo(() => {
    if (!equipment?.length) return ''
    const used      = (equipment || []).filter(eq => usageCount[eq.id] > 0)
    const totalUses = Object.values(usageCount).reduce((s, v) => s + v, 0)
    const parts     = []
    parts.push(`O inventário possui ${equipment.length} equipamento${equipment.length !== 1 ? 's' : ''}, dos quais ${used.length} ${used.length !== 1 ? 'foram utilizados' : 'foi utilizado'} em shows (${totalUses} uso${totalUses !== 1 ? 's' : ''} no total).`)
    if (neverUsed.length > 0) parts.push(`${neverUsed.length} equipamento${neverUsed.length !== 1 ? 's' : ''} nunca ${neverUsed.length !== 1 ? 'foram usados' : 'foi usado'} — revise se ainda fazem parte do inventário ativo.`)
    if (needsRepair.length > 0) parts.push(`${needsRepair.length} item${needsRepair.length !== 1 ? 'ns' : ''} com status de manutenção — verificação prioritária antes do próximo show.`)
    return parts.join(' ')
  }, [equipment, usageCount, neverUsed, needsRepair])

  const chartContextTexts = useMemo(() => {
    const t0 = (() => {
      if (!byCategory.some(d => d.uses > 0)) return 'Nenhum uso de equipamentos registrado em shows.'
      const dom   = byCategory[0]
      const total = byCategory.reduce((s, d) => s + d.uses, 0)
      const pct   = total > 0 ? Math.round((dom.uses / total) * 100) : 0
      if (pct >= 50) return `A categoria "${dom.name}" domina o uso de equipamentos com ${pct}% das utilizações em shows — garanta disponibilidade e manutenção preventiva desses itens, pois uma falha nessa categoria pode comprometer diretamente a realização dos shows.`
      return 'O uso de equipamentos está distribuído entre múltiplas categorias, sem uma dominante absoluta. Essa diversidade indica que a banda depende de um conjunto variado de equipamentos — mantenha todos em bom estado e com checklist pré-show para cada categoria.'
    })()
    return [t0]
  }, [byCategory])

  const conclusionText = useMemo(() => {
    if (!equipment?.length) return ''
    const parts = []
    if (neverUsed.length === 0 && needsRepair.length === 0) {
      parts.push('O inventário de equipamentos está em bom estado: todos os itens foram utilizados e nenhum apresenta status de manutenção pendente.')
    } else {
      if (needsRepair.length > 0) parts.push(`Resolva as pendências de manutenção dos ${needsRepair.length} equipamento${needsRepair.length !== 1 ? 's' : ''} antes do próximo show para evitar imprevistos técnicos.`)
      if (neverUsed.length > 0) parts.push(`Avalie o custo-benefício de manter ${neverUsed.length} equipamento${neverUsed.length !== 1 ? 's' : ''} sem uso no inventário — venda ou empréstimo podem gerar recursos adicionais.`)
    }
    return parts.join(' ')
  }, [equipment, neverUsed, needsRepair])

  const insight = useMemo(() => {
    if (!equipment?.length) return 'Nenhum equipamento cadastrado.'
    if (neverUsed.length > 0) return `${neverUsed.length} equipamento${neverUsed.length !== 1 ? 's' : ''} cadastrado${neverUsed.length !== 1 ? 's' : ''} nunca ${neverUsed.length !== 1 ? 'foram utilizados' : 'foi utilizado'} em shows — ainda faz${neverUsed.length !== 1 ? 'em' : ''} parte do inventário ativo?`
    if (needsRepair.length) return `${needsRepair.length} equipamento${needsRepair.length !== 1 ? 's' : ''} precisando de reparo. Verifique antes do próximo show.`
    return `${equipment.length} equipamentos cadastrados. Todos utilizados em pelo menos um show.`
  }, [equipment, neverUsed, needsRepair])

  useEffect(() => { onInsightsChange([insight]) }, [insight])

  return (
    <div className="space-y-4">
      <AnalyticPara text={introText} />

      <SectionCard title="Equipamentos por Categoria (usos em shows)">
        <ChartBox title="Equipamentos por Categoria">
          {!byCategory.some(d => d.uses > 0) ? EMPTY_CHART : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byCategory} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="uses" name="Usos" fill={C.blue} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartBox>
      </SectionCard>

      <AnalyticPara text={chartContextTexts[0]} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {neverUsed.length > 0 && (
          <Card className="rounded-2xl">
            <CardHeader className="pb-2 border-b border-slate-100 px-5 pt-4">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Nunca Utilizados
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {neverUsed.slice(0, 5).map(eq => (
                <div key={eq.id} className="flex items-center justify-between">
                  <span className="text-sm text-slate-700 truncate">{eq.name}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">{eq.category || '—'}</span>
                </div>
              ))}
              {neverUsed.length > 5 && <p className="text-xs text-slate-400">+{neverUsed.length - 5} mais</p>}
            </CardContent>
          </Card>
        )}

        {needsRepair.length > 0 && (
          <Card className="rounded-2xl border-red-200">
            <CardHeader className="pb-2 border-b border-red-100 px-5 pt-4">
              <CardTitle className="text-sm font-semibold text-red-600 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Precisando de Reparo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {needsRepair.slice(0, 5).map(eq => (
                <div key={eq.id} className="flex items-center justify-between">
                  <span className="text-sm text-red-700 truncate">{eq.name}</span>
                  <span className="text-[10px] text-red-400 shrink-0">{eq.status}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <InsightCard text={insight} />
      <AnalyticPara text={conclusionText} />
    </div>
  )
}

// ── Module: Orçamentos ─────────────────────────────────────────────────────

function OrcamentosModule({ budgets, onInsightsChange }) {
  const list = budgets || []

  const { rascunho, enviado, aprovado } = useMemo(() => ({
    rascunho: list.filter(b => b.status === 'Rascunho').length,
    enviado:  list.filter(b => b.status === 'Enviado').length,
    aprovado: list.filter(b => b.status === 'Aprovado').length,
  }), [list])

  const funnelData = [
    { name: 'Rascunho', value: rascunho + enviado + aprovado, fill: C.slate  },
    { name: 'Enviado',  value: enviado  + aprovado,           fill: C.blue   },
    { name: 'Aprovado', value: aprovado,                      fill: C.green  },
  ]

  const taxaAprov = list.length > 0 ? Math.round((aprovado / list.length) * 100) : 0

  const valorMedioAprov = useMemo(() => {
    const aprov = list.filter(b => b.status === 'Aprovado' && b.value)
    return aprov.length ? aprov.reduce((s, b) => s + (b.value || 0), 0) / aprov.length : 0
  }, [list])

  const proxVencimento = useMemo(() => {
    const today = new Date()
    return list.filter(b => {
      if (b.status !== 'Enviado' || !b.expiresAt) return false
      const exp = new Date(b.expiresAt)
      const days = Math.round((exp - today) / 86_400_000)
      return days >= 0 && days <= 7
    })
  }, [list])

  const introText = useMemo(() => {
    if (!list.length) return ''
    const parts = []
    parts.push(`O funil de orçamentos possui ${list.length} proposta${list.length !== 1 ? 's' : ''} no total: ${rascunho} rascunho${rascunho !== 1 ? 's' : ''}, ${enviado} enviado${enviado !== 1 ? 's' : ''} e ${aprovado} aprovado${aprovado !== 1 ? 's' : ''}.`)
    if (aprovado > 0 && valorMedioAprov > 0) parts.push(`O valor médio das propostas aprovadas é de ${fmtCurrency(valorMedioAprov)}.`)
    if (taxaAprov < 30 && list.length >= 3) parts.push(`A taxa de aprovação de ${taxaAprov}% está abaixo do esperado — revise o posicionamento de preços e os argumentos de venda.`)
    else if (taxaAprov >= 50) parts.push(`A taxa de aprovação de ${taxaAprov}% está acima da média, indicando boa efetividade nas propostas enviadas.`)
    return parts.join(' ')
  }, [list, rascunho, enviado, aprovado, taxaAprov, valorMedioAprov])

  const chartContextTexts = useMemo(() => {
    const t0 = (() => {
      if (!list.length) return 'Nenhum orçamento cadastrado.'
      const totalInFunnel = rascunho + enviado + aprovado
      if (!totalInFunnel) return 'Funil vazio no momento.'
      const approvalRate = Math.round((aprovado / totalInFunnel) * 100)
      if (approvalRate < 20 && totalInFunnel >= 3) return `O funil revela taxa de conversão baixa: apenas ${approvalRate}% das propostas são aprovadas. Isso pode indicar valores acima do mercado, proposta que não comunica valor suficiente ou processo de follow-up que precisa ser reforçado. Identifique em qual etapa as propostas travam para ajustar o processo.`
      if (approvalRate >= 50) return `O funil apresenta excelente taxa de conversão (${approvalRate}%), indicando que as propostas estão bem alinhadas às expectativas dos contratantes. Mantenha a qualidade e documente o processo de vendas para replicar o sucesso.`
      return 'O funil de conversão mostra um fluxo típico de propostas, com oportunidades de melhora na passagem de cada etapa. Monitore o tempo médio entre envio e resposta para identificar onde as negociações demoram mais e otimize o follow-up.'
    })()
    return [t0]
  }, [list, rascunho, enviado, aprovado])

  const conclusionText = useMemo(() => {
    if (!list.length) return ''
    const parts = []
    if (proxVencimento.length > 0) parts.push(`Ação imediata: ${proxVencimento.length} orçamento${proxVencimento.length !== 1 ? 's estão' : ' está'} vencendo nos próximos 7 dias sem resposta — entre em contato agora para evitar perda de oportunidade.`)
    if (taxaAprov < 30 && list.length >= 3) parts.push(`Para melhorar a taxa de aprovação de ${taxaAprov}%, considere revisar o formato da proposta, ajustar valores ao mercado ou incluir garantias que reduzam o risco percebido pelo contratante.`)
    else if (taxaAprov >= 50) parts.push(`Continue expandindo a base de propostas — com taxa de aprovação de ${taxaAprov}%, cada novo orçamento enviado tem boa probabilidade de se converter em show.`)
    return parts.join(' ')
  }, [list, proxVencimento, taxaAprov])

  const insight = useMemo(() => {
    if (!list.length) return 'Nenhum orçamento cadastrado.'
    if (proxVencimento.length > 0)
      return `${proxVencimento.length} orçamento${proxVencimento.length !== 1 ? 's' : ''} enviado${proxVencimento.length !== 1 ? 's' : ''} ${proxVencimento.length !== 1 ? 'estão próximos' : 'está próximo'} do vencimento sem resposta — considere fazer um follow-up.`
    if (taxaAprov < 30 && list.length >= 3)
      return `Taxa de aprovação de ${taxaAprov}% — revise os valores ou prazos dos orçamentos enviados.`
    return `Taxa de aprovação: ${taxaAprov}%. Valor médio aprovado: ${fmtCurrency(valorMedioAprov)}.`
  }, [list, proxVencimento, taxaAprov, valorMedioAprov])

  useEffect(() => { onInsightsChange([insight]) }, [insight])

  return (
    <div className="space-y-4">
      <AnalyticPara text={introText} />

      <SectionCard title="Funil de Conversão">
        <ChartBox title="Funil de Conversão">
          {!list.length ? EMPTY_CHART : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={funnelData} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" name="Quantidade" radius={[0, 4, 4, 0]}>
                  {funnelData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartBox>
      </SectionCard>

      <AnalyticPara text={chartContextTexts[0]} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Taxa de Aprovação',  value: `${taxaAprov}%`,           color: taxaAprov >= 50 ? 'text-emerald-600' : 'text-amber-500' },
          { label: 'Valor Médio Aprovado', value: fmtCurrency(valorMedioAprov), color: 'text-slate-800' },
          { label: 'Vencendo em 7 dias',  value: proxVencimento.length,     color: proxVencimento.length > 0 ? 'text-red-500' : 'text-emerald-600' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="rounded-2xl">
            <CardContent className="p-4">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
              <p className={cn('text-xl font-bold mt-1', color)}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <InsightCard text={insight} />
      <AnalyticPara text={conclusionText} />
    </div>
  )
}

// ── Module: Despesas ──────────────────────────────────────────────────────

function DespesasModule({ events, members, payments, expenses, period, customFrom, customTo, filterCategory, onInsightsChange }) {
  const { start, end } = getPeriodRange(period, customFrom, customTo)

  const filteredEvents = useMemo(() => eventsInPeriod(events, start, end), [events, start, end])

  const getEvCaches = useCallback((ev) =>
    (ev.members || []).reduce((s, memId) => {
      const m = members.find(x => x.id === memId)
      if (!m) return s
      const entry = payments[ev.id]?.[m.id] ?? {}
      const base  = m.cache ?? 0
      return s + (entry.customValue != null ? entry.customValue : (entry.doubled ? base * 2 : base))
    }, 0),
  [members, payments])

  const varExpenses = useMemo(() =>
    (expenses || []).filter(e => filteredEvents.some(ev => ev.id === e.eventId)),
  [expenses, filteredEvents])

  const filteredVarExp = useMemo(() =>
    filterCategory === 'all' ? varExpenses : varExpenses.filter(e => (e.type || 'Outros') === filterCategory),
  [varExpenses, filterCategory])

  // Previous period
  const { prevStart, prevEnd } = useMemo(() => {
    const duration = end - start
    return { prevEnd: new Date(start.getTime() - 1), prevStart: new Date(start.getTime() - duration) }
  }, [start, end])

  const prevFilteredEvents = useMemo(() => eventsInPeriod(events, prevStart, prevEnd), [events, prevStart, prevEnd])
  const prevVarExpenses    = useMemo(() =>
    (expenses || []).filter(e => prevFilteredEvents.some(ev => ev.id === e.eventId)),
  [expenses, prevFilteredEvents])

  const totalVarExp     = useMemo(() => filteredVarExp.reduce((s, e) => s + (e.amount || 0), 0), [filteredVarExp])
  const prevVarExpTotal = useMemo(() => prevVarExpenses.reduce((s, e) => s + (e.amount || 0), 0), [prevVarExpenses])
  const totalCaches     = useMemo(() => filteredEvents.reduce((s, ev) => s + getEvCaches(ev), 0), [filteredEvents, getEvCaches])
  const totalAll        = totalVarExp + totalCaches
  const avgPerShow      = filteredEvents.length > 0 ? totalAll / filteredEvents.length : 0

  const showsWithoutExp = useMemo(() =>
    filteredEvents.filter(ev => !varExpenses.some(e => e.eventId === ev.id)).length,
  [filteredEvents, varExpenses])

  const expChangePct = prevVarExpTotal > 0
    ? Math.round(((totalVarExp - prevVarExpTotal) / prevVarExpTotal) * 100)
    : null

  const catTotals = useMemo(() => {
    const map = {}
    filteredVarExp.forEach(e => { const c = e.type || 'Outros'; map[c] = (map[c] || 0) + (e.amount || 0) })
    if (totalCaches > 0) map['Cachês'] = totalCaches
    return map
  }, [filteredVarExp, totalCaches])

  const biggestCat = useMemo(() => {
    const entries = Object.entries(catTotals)
    return entries.length ? entries.reduce((a, b) => b[1] > a[1] ? b : a) : null
  }, [catTotals])

  const months   = useMemo(() => getMonthsInRange(start, end), [start, end])
  const lineData = useMemo(() => {
    const cats = Object.keys(EXPENSE_CATEGORY_COLORS)
    return months.map(({ year, month }) => {
      const monthEvs = filteredEvents.filter(ev => {
        const d = new Date(ev.date + 'T12:00:00')
        return d.getFullYear() === year && d.getMonth() === month
      })
      const row = { name: MONTHS[month].slice(0, 3) }
      cats.forEach(cat => {
        row[cat] = cat === 'Cachês'
          ? monthEvs.reduce((s, ev) => s + getEvCaches(ev), 0)
          : (expenses || []).filter(e => monthEvs.some(ev => ev.id === e.eventId) && (e.type || 'Outros') === cat)
              .reduce((s, e) => s + (e.amount || 0), 0)
      })
      return row
    })
  }, [filteredEvents, expenses, months, getEvCaches])

  const pieData = useMemo(() =>
    Object.entries(catTotals)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value, fill: EXPENSE_CATEGORY_COLORS[name] || C.slate })),
  [catTotals])

  // Time-series: cost per show ordered chronologically (replaces ranking BarChart)
  const showTimelineData = useMemo(() =>
    [...filteredEvents]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(ev => {
        const varE  = (expenses || []).filter(e => e.eventId === ev.id).reduce((s, e) => s + (e.amount || 0), 0)
        const cache = getEvCaches(ev)
        return {
          name:     fmtDate(ev.date).slice(0, 5),
          fullName: ev.name || '',
          caches:   cache,
          varExp:   varE,
          total:    varE + cache,
          revenue:  ev.value || 0,
        }
      }),
  [filteredEvents, expenses, getEvCaches])

  // Historical avg across ALL events for PDF comparison
  const historicalAvg = useMemo(() => {
    if (!events.length) return 0
    const t = events.reduce((s, ev) => {
      const varE = (expenses || []).filter(e => e.eventId === ev.id).reduce((s2, e) => s2 + (e.amount || 0), 0)
      return s + varE + getEvCaches(ev)
    }, 0)
    return t / events.length
  }, [events, expenses, getEvCaches])

  // ── Analytical texts ───────────────────────────────────────────────────

  const introText = useMemo(() => {
    if (!filteredEvents.length) return ''
    const n = filteredEvents.length
    const parts = []
    parts.push(`No período analisado, a banda realizou ${n} show${n !== 1 ? 's' : ''} com custo operacional total de ${fmtCurrency(totalAll)}.`)
    if (totalAll > 0) {
      if (totalCaches > 0 && totalVarExp > 0) {
        const cachePct = Math.round((totalCaches / totalAll) * 100)
        parts.push(`Os cachês representam ${cachePct}% desse total (${fmtCurrency(totalCaches)}), enquanto as despesas variáveis correspondem aos outros ${100 - cachePct}% (${fmtCurrency(totalVarExp)}).`)
      } else if (totalCaches > 0) {
        parts.push(`O custo é composto integralmente por cachês dos músicos (${fmtCurrency(totalCaches)}), sem despesas variáveis registradas.`)
      } else {
        parts.push(`O custo é composto integralmente por despesas variáveis (${fmtCurrency(totalVarExp)}), sem cachês registrados.`)
      }
    }
    if (biggestCat && totalAll > 0) {
      const pct = Math.round((biggestCat[1] / totalAll) * 100)
      parts.push(`A categoria mais significativa foi ${biggestCat[0]}, concentrando ${pct}% das despesas totais com ${fmtCurrency(biggestCat[1])}.`)
    }
    if (expChangePct !== null) {
      const dir = expChangePct > 0 ? `crescimento de ${expChangePct}%` : `redução de ${Math.abs(expChangePct)}%`
      parts.push(`Em comparação ao período anterior, as despesas variáveis apresentaram ${dir}.`)
    }
    return parts.join(' ')
  }, [filteredEvents, totalAll, totalCaches, totalVarExp, biggestCat, expChangePct])

  const chartContextTexts = useMemo(() => {
    const cats = Object.keys(EXPENSE_CATEGORY_COLORS)

    const t1 = (() => {
      if (!lineData.length || lineData.every(d => cats.every(k => !d[k]))) {
        return 'Não há dados suficientes no período para identificar tendências nas categorias de despesa.'
      }
      if (lineData.length >= 2) {
        const first = lineData[0], last = lineData[lineData.length - 1]
        let risingCat = null, maxGrowth = 0
        cats.forEach(cat => {
          if (first[cat] > 0 && last[cat] > first[cat]) {
            const g = (last[cat] - first[cat]) / first[cat]
            if (g > maxGrowth) { maxGrowth = g; risingCat = cat }
          }
        })
        if (risingCat) {
          const pct = Math.round(maxGrowth * 100)
          return `A evolução mensal revela que ${risingCat} cresceu ${pct}% entre o início e o fim do período — um sinal de que esse custo merece atenção prioritária. Avalie se o aumento reflete maior volume de shows ou elevação de preços, pois cada cenário exige uma estratégia de controle distinta. Considere renegociar contratos ou buscar alternativas nessa categoria antes do próximo ciclo.`
        }
      }
      const last    = lineData[lineData.length - 1]
      const topCat  = cats.map(k => [k, last[k] || 0]).sort((a, b) => b[1] - a[1])[0]
      if (topCat?.[1] > 0) {
        return `A evolução mensal indica que ${topCat[0]} é a categoria de maior impacto no período recente. Monitorar sua trajetória nos próximos meses permitirá identificar padrões sazonais e antecipar ajustes orçamentários antes que o custo se torne pressão sobre a margem.`
      }
      return 'A evolução das categorias ao longo do período permite identificar quais tipos de despesa crescem mais rapidamente e onde concentrar esforços de controle de custos.'
    })()

    const t2 = (() => {
      if (!pieData.length) return 'Não há dados de distribuição para o período selecionado.'
      const tot    = pieData.reduce((s, d) => s + d.value, 0)
      const sorted = [...pieData].sort((a, b) => b.value - a.value)
      const dom    = sorted[0]
      const domPct = tot > 0 ? Math.round((dom.value / tot) * 100) : 0
      if (domPct >= 50) {
        return `${dom.name} concentra ${domPct}% do orçamento de despesas, caracterizando alta dependência de uma única categoria. Essa concentração amplifica o risco financeiro, pois qualquer variação nesse custo impacta diretamente o resultado final. Diversificar fornecedores ou renegociar acordos nessa categoria pode gerar economias relevantes.`
      }
      const top2    = sorted.slice(0, Math.min(2, sorted.length))
      const top2Pct = tot > 0 ? Math.round((top2.reduce((s, d) => s + d.value, 0) / tot) * 100) : 0
      return `As despesas apresentam distribuição relativamente equilibrada, com ${top2.map(d => d.name).join(' e ')} somando ${top2Pct}% do total. Uma composição diversificada facilita o controle granular, mas requer gestão atenta de múltiplas categorias — monitore se alguma começa a concentrar mais de 50% dos gastos.`
    })()

    const t3 = (() => {
      if (!showTimelineData.length) return 'Não há shows no período para análise de custo individual.'
      if (showTimelineData.length === 1) {
        const s = showTimelineData[0]
        return `Com apenas um show no período, o custo total foi de ${fmtCurrency(s.total)}, composto por ${fmtCurrency(s.caches)} em cachês e ${fmtCurrency(s.varExp)} em despesas variáveis. Para uma análise de tendência mais robusta, selecione um período com múltiplos shows.`
      }
      const costs   = showTimelineData.map(d => d.total)
      const avg     = costs.reduce((s, v) => s + v, 0) / costs.length
      const maxCost = Math.max(...costs)
      const half    = Math.ceil(costs.length / 2)
      const avgFirst  = costs.slice(0, half).reduce((s, v) => s + v, 0) / half
      const avgSecond = costs.slice(half).reduce((s, v) => s + v, 0) / (costs.length - half || 1)
      const maxShow   = showTimelineData.find(d => d.total === maxCost)
      if (avgSecond > avgFirst * 1.1) {
        const diff = Math.round(((avgSecond - avgFirst) / avgFirst) * 100)
        return `O custo por show apresenta tendência de alta ao longo do período: a segunda metade dos eventos custou em média ${diff}% mais que a primeira. Esse padrão pode indicar escalada de custos operacionais — "${maxShow?.fullName}" representou o pico com ${fmtCurrency(maxCost)}. Analise o que elevou esse custo para evitar recorrência.`
      } else if (avgSecond < avgFirst * 0.9) {
        const diff = Math.round(((avgFirst - avgSecond) / avgFirst) * 100)
        return `O custo por show demonstra tendência de queda ao longo do período, com redução média de ${diff}% na segunda metade dos eventos — um resultado positivo que pode refletir maior eficiência operacional. Documente as estratégias adotadas e mantenha-as no próximo ciclo.`
      }
      return `O custo por show manteve-se relativamente estável no período, com média de ${fmtCurrency(avg)} por evento. Essa estabilidade facilita o planejamento orçamentário, mas não elimina a necessidade de monitorar cada show individualmente para evitar desvios pontuais.`
    })()

    return [t1, t2, t3]
  }, [lineData, pieData, showTimelineData])

  const conclusionText = useMemo(() => {
    if (!filteredEvents.length) return ''
    const parts = []
    if (expChangePct !== null && expChangePct > 20) {
      parts.push(`O aumento de ${expChangePct}% nas despesas variáveis em relação ao período anterior é o principal ponto de atenção e deve ser investigado com prioridade antes do próximo ciclo operacional.`)
    } else if (expChangePct !== null && expChangePct < -10) {
      parts.push(`A redução de ${Math.abs(expChangePct)}% nas despesas variáveis em relação ao período anterior é um resultado positivo que deve ser documentado e replicado.`)
    } else {
      parts.push(`As despesas do período mantiveram-se em nível controlado, com custo médio de ${fmtCurrency(avgPerShow)} por show.`)
    }
    if (biggestCat && totalAll > 0) {
      const pct = Math.round((biggestCat[1] / totalAll) * 100)
      parts.push(`Para o próximo período, priorize a gestão de ${biggestCat[0]} (${pct}% do custo total), onde há o maior potencial de otimização.`)
    }
    if (showsWithoutExp > 0) {
      parts.push(`Atenção: ${showsWithoutExp} show${showsWithoutExp !== 1 ? 's' : ''} sem despesas variáveis registradas pode${showsWithoutExp !== 1 ? 'm' : ''} indicar lançamentos pendentes — certifique-se de que todos os custos foram inseridos para manter a precisão da análise.`)
    }
    return parts.join(' ')
  }, [filteredEvents, expChangePct, avgPerShow, biggestCat, totalAll, showsWithoutExp])

  const insights = useMemo(() => {
    const parts = []
    if (prevVarExpTotal > 0 && expChangePct !== null && expChangePct > 20) {
      parts.push(`Despesas variáveis cresceram ${expChangePct}% em relação ao período anterior — verifique quais categorias estão pressionando os custos.`)
    }
    const heavy = filteredEvents.find(ev => {
      const varE  = (expenses || []).filter(e => e.eventId === ev.id).reduce((s, e) => s + (e.amount || 0), 0)
      return (ev.value || 0) > 0 && (varE + getEvCaches(ev)) / (ev.value || 1) > 0.6
    })
    if (heavy) parts.push(`"${heavy.name}" teve custo total acima de 60% do valor do contrato — margem crítica.`)
    if (!parts.length) {
      if (!filteredEvents.length) return ['Nenhum show no período selecionado.']
      return [`Total de despesas no período: ${fmtCurrency(totalAll)}. Média por show: ${fmtCurrency(avgPerShow)}.`]
    }
    return parts
  }, [filteredEvents, expenses, prevVarExpTotal, expChangePct, totalAll, avgPerShow, getEvCaches])

  useEffect(() => { onInsightsChange(insights) }, [insights])

  // Dialog state
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportEventId,    setExportEventId]    = useState('')
  const [exporting,        setExporting]        = useState(false)
  const { companyProfile } = useStore()

  const sortedFilteredEvents = useMemo(() =>
    [...filteredEvents].sort((a, b) => b.date.localeCompare(a.date)),
  [filteredEvents])

  async function handleEventExport() {
    const ev = filteredEvents.find(e => String(e.id) === exportEventId)
    if (!ev) return
    setExporting(true)
    try {
      await generateEventExpensePDF({
        event: ev,
        expenses: expenses || [],
        members,
        payments,
        companyProfile,
        historicalAvg,
        historicalCount: events.length,
      })
      toast.success('PDF exportado!')
      setExportDialogOpen(false)
    } catch (err) {
      console.error('[export expenses]', err)
      toast.error('Erro ao gerar PDF.')
    } finally {
      setExporting(false)
    }
  }

  const summaryCards = [
    {
      label: 'Total de Despesas',
      value: fmtCurrency(totalAll),
      sub: expChangePct !== null
        ? `${expChangePct > 0 ? '+' : ''}${expChangePct}% vs período anterior`
        : `${filteredEvents.length} shows no período`,
      color: expChangePct !== null && expChangePct > 20 ? 'text-red-500' : 'text-slate-800',
    },
    {
      label: 'Maior Categoria',
      value: biggestCat ? biggestCat[0] : '—',
      sub: biggestCat ? fmtCurrency(biggestCat[1]) : '—',
      color: 'text-slate-800',
    },
    {
      label: 'Média por Show',
      value: fmtCurrency(avgPerShow),
      sub: `${filteredEvents.length} shows`,
      color: 'text-slate-800',
    },
    {
      label: 'Shows sem Despesas',
      value: showsWithoutExp,
      sub: 'sem despesas variáveis',
      color: showsWithoutExp > 0 ? 'text-amber-500' : 'text-emerald-600',
    },
  ]

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summaryCards.map(({ label, value, sub, color }) => (
          <Card key={label} className="rounded-2xl">
            <CardContent className="p-4">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
              <p className={cn('text-lg font-bold mt-1', color)}>{value}</p>
              <p className="text-xs text-slate-400">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Introductory analytical paragraph */}
      <AnalyticPara text={introText} />

      {/* LineChart by category */}
      <SectionCard title="Evolução por Categoria">
        <ChartBox title="Despesas por Categoria ao Longo do Tempo">
          {lineData.every(d => Object.keys(EXPENSE_CATEGORY_COLORS).every(k => !d[k])) ? EMPTY_CHART : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={lineData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => fmtCurrencyShort(v)} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={52} />
                <Tooltip content={<ChartTooltip currency />} />
                <Legend iconType="circle" iconSize={8} formatter={v => <span className="text-xs text-slate-600">{v}</span>} />
                {Object.entries(EXPENSE_CATEGORY_COLORS).map(([cat, color]) => (
                  <Line key={cat} type="monotone" dataKey={cat} name={cat} stroke={color} strokeWidth={2} dot={false} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartBox>
      </SectionCard>

      <AnalyticPara text={chartContextTexts[0]} />

      {/* PieChart distribution — percentage only, not time-series */}
      <SectionCard title="Distribuição por Categoria">
        <ChartBox title="Distribuição de Despesas">
          {!pieData.length ? EMPTY_CHART : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" nameKey="name" paddingAngle={3}>
                  {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip content={<ChartTooltip currency />} />
                <Legend iconType="circle" iconSize={8} formatter={v => <span className="text-xs text-slate-600">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartBox>
      </SectionCard>

      <AnalyticPara text={chartContextTexts[1]} />

      {/* Time-series LineChart: custo vs receita por show ao longo do tempo */}
      <SectionCard title="Custo vs Receita por Show">
        <ChartBox title="Custo Total e Receita por Show ao Longo do Tempo">
          {!showTimelineData.length || showTimelineData.every(d => !d.total && !d.revenue) ? EMPTY_CHART : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={showTimelineData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => fmtCurrencyShort(v)} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={52} />
                <Tooltip content={<ChartTooltip currency />} />
                <Legend iconType="circle" iconSize={8} formatter={v => <span className="text-xs text-slate-600">{v}</span>} />
                <Line type="monotone" dataKey="revenue" name="Receita" stroke={C.green} strokeWidth={2} dot={{ r: 3, fill: C.green }} strokeDasharray="5 3" connectNulls />
                <Line type="monotone" dataKey="total"   name="Custo Total" stroke={C.red} strokeWidth={2} dot={{ r: 3, fill: C.red }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartBox>
      </SectionCard>

      <AnalyticPara text={chartContextTexts[2]} />

      {insights.map((text, i) => <InsightCard key={i} text={text} />)}

      {/* Conclusion paragraph */}
      <AnalyticPara text={conclusionText} />

      {/* Export dialog trigger */}
      {filteredEvents.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            className="gap-2 text-xs border-slate-200 hover:border-orange-400 hover:text-orange-600"
            onClick={() => { setExportEventId(''); setExportDialogOpen(true) }}
          >
            <FileDown className="w-3.5 h-3.5" />
            Exportar relatório de show específico
          </Button>
        </div>
      )}

      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Relatório de Despesas por Show</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-500">
              Selecione um show do período para gerar o relatório detalhado de despesas, incluindo análise comparativa com a média histórica.
            </p>
            <Select value={exportEventId} onValueChange={setExportEventId}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Selecione um show..." />
              </SelectTrigger>
              <SelectContent>
                {sortedFilteredEvents.map(ev => (
                  <SelectItem key={ev.id} value={String(ev.id)}>
                    {fmtDate(ev.date)} — {ev.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)} className="text-sm">Cancelar</Button>
            <Button
              disabled={!exportEventId || exporting}
              onClick={handleEventExport}
              className="gap-2 text-sm bg-orange-500 hover:bg-orange-600 text-white"
            >
              {exporting
                ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <FileDown className="w-3.5 h-3.5" />}
              {exporting ? 'Gerando...' : 'Gerar PDF'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Filter Bar ─────────────────────────────────────────────────────────────

function FilterBar({
  period, setPeriod, customFrom, setCustomFrom, customTo, setCustomTo,
  module, members, contractors, songs, rehearsals,
  filterTipo, setFilterTipo,
  filterIniciativa, setFilterIniciativa,
  filterRole, setFilterRole,
  filterTag, setFilterTag,
  filterMembro, setFilterMembro,
  filterEstado, setFilterEstado,
  filterCategory, setFilterCategory,
  filterMembroEspecifico, setFilterMembroEspecifico,
  filterEventoMembro, setFilterEventoMembro,
  memberEvents,
  filterEventoFinance, setFilterEventoFinance,
  financeEvents,
  onExport, exporting,
}) {
  const roles   = useMemo(() => [...new Set((members || []).map(m => m.role).filter(Boolean))], [members])
  const tags    = useMemo(() => [...new Set((songs || []).flatMap(s => s.tags || []))], [songs])
  const estados = useMemo(() => [...new Set((contractors || []).map(c => c.state).filter(Boolean))].sort(), [contractors])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
      {/* Period pills */}
      <div className="flex flex-wrap gap-2 items-center">
        {PERIOD_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
              period === opt.value
                ? 'bg-orange-500 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >{opt.label}</button>
        ))}
      </div>

      {period === 'custom' && (
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium shrink-0">De</span>
            <div className="w-40"><DatePicker light value={customFrom} onChange={setCustomFrom} placeholder="Início" /></div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium shrink-0">Até</span>
            <div className="w-40"><DatePicker light value={customTo} onChange={setCustomTo} placeholder="Fim" /></div>
          </div>
        </div>
      )}

      {/* Module-specific filters + export button */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {(module === 'contracts' || module === 'finance') && (<>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="show">Show solo</SelectItem>
                <SelectItem value="festival">Festival</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterIniciativa} onValueChange={setFilterIniciativa}>
              <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="Iniciativa" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="publico">Pública</SelectItem>
                <SelectItem value="privado">Privada</SelectItem>
              </SelectContent>
            </Select>
          </>)}

          {module === 'finance' && (financeEvents || []).length > 0 && (
            <Select value={filterEventoFinance} onValueChange={setFilterEventoFinance}>
              <SelectTrigger className="h-8 text-xs w-52"><SelectValue placeholder="Todos os eventos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os eventos</SelectItem>
                {(financeEvents || []).map(ev => (
                  <SelectItem key={ev.id} value={String(ev.id)}>
                    {fmtDate(ev.date)} — {ev.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {module === 'members' && roles.length > 0 && (
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="h-8 text-xs w-40"><SelectValue placeholder="Instrumento/Cargo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          {module === 'members' && (members || []).length > 0 && (
            <Select value={filterMembroEspecifico} onValueChange={v => { setFilterMembroEspecifico(v); setFilterEventoMembro('') }}>
              <SelectTrigger className="h-8 text-xs w-44"><SelectValue placeholder="Todos os membros" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os membros</SelectItem>
                {(members || []).map(m => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          {module === 'members' && filterMembroEspecifico && filterMembroEspecifico !== 'all' && (memberEvents || []).length > 0 && (
            <Select value={filterEventoMembro} onValueChange={setFilterEventoMembro}>
              <SelectTrigger className="h-8 text-xs w-52"><SelectValue placeholder="Selecione um show..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os shows</SelectItem>
                {(memberEvents || []).map(ev => (
                  <SelectItem key={ev.id} value={String(ev.id)}>
                    {fmtDate(ev.date)} — {ev.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {module === 'repertoire' && tags.length > 0 && (
            <Select value={filterTag} onValueChange={setFilterTag}>
              <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="Tag" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as tags</SelectItem>
                {tags.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          {module === 'rehearsals' && (members || []).length > 0 && (
            <Select value={filterMembro} onValueChange={setFilterMembro}>
              <SelectTrigger className="h-8 text-xs w-40"><SelectValue placeholder="Membro" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os membros</SelectItem>
                {(members || []).map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          {module === 'contractors' && estados.length > 0 && (
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {estados.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          {module === 'expenses' && (
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-8 text-xs w-40"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {Object.keys(EXPENSE_CATEGORY_COLORS).map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <Button
          onClick={onExport}
          disabled={exporting}
          variant="outline"
          className="gap-2 h-8 text-xs border-slate-200 hover:border-orange-400 hover:text-orange-600 shrink-0"
        >
          {exporting
            ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            : <FileDown className="w-3.5 h-3.5" />}
          {exporting ? 'Gerando...' : 'Exportar relatório completo'}
        </Button>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function Reports({ isLoading }) {
  const {
    events, members, payments, expenses, contractors,
    equipment, showEquipment, songs, setlists, rehearsals,
    budgets, companyProfile,
  } = useStore()

  const [selectedModule, setSelectedModule] = useState('contracts')
  const [period, setPeriod]       = useState('3m')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo,   setCustomTo]   = useState('')
  const [filterTipo,      setFilterTipo]      = useState('all')
  const [filterIniciativa, setFilterIniciativa] = useState('all')
  const [filterRole,      setFilterRole]      = useState('all')
  const [filterTag,       setFilterTag]       = useState('all')
  const [filterMembro,    setFilterMembro]    = useState('all')
  const [filterEstado,    setFilterEstado]    = useState('all')
  const [filterCategory,  setFilterCategory]  = useState('all')
  const [filterMembroEspecifico, setFilterMembroEspecifico] = useState('all')
  const [filterEventoMembro,    setFilterEventoMembro]    = useState('')
  const [filterEventoFinance,   setFilterEventoFinance]   = useState('all')
  const [exporting, setExporting] = useState(false)

  const insightsRef    = useRef([])
  const modulePanelRef = useRef(null)

  const onInsightsChange = useCallback(ins => { insightsRef.current = ins }, [])

  useEffect(() => {
    setFilterTipo('all'); setFilterIniciativa('all')
    setFilterRole('all'); setFilterTag('all')
    setFilterMembro('all'); setFilterEstado('all')
    setFilterCategory('all')
    setFilterMembroEspecifico('all'); setFilterEventoMembro('')
    setFilterEventoFinance('all')
  }, [selectedModule])

  const periodLabel = useMemo(() => {
    if (period === 'custom') return `${customFrom || '?'} a ${customTo || '?'}`
    return PERIOD_OPTIONS.find(p => p.value === period)?.label || ''
  }, [period, customFrom, customTo])

  const moduleLabel = MODULES.find(m => m.value === selectedModule)?.label || ''

  const financeEvents = useMemo(() => {
    const { start: ps, end: pe } = getPeriodRange(period, customFrom, customTo)
    return eventsInPeriod(events, ps, pe).sort((a, b) => b.date.localeCompare(a.date))
  }, [events, period, customFrom, customTo])

  const memberEvents = useMemo(() => {
    if (!filterMembroEspecifico || filterMembroEspecifico === 'all') return []
    const { start: ps, end: pe } = getPeriodRange(period, customFrom, customTo)
    const memberId = Number(filterMembroEspecifico)
    return eventsInPeriod(events, ps, pe)
      .filter(ev => (ev.members || []).includes(memberId))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [filterMembroEspecifico, events, period, customFrom, customTo])

  const handleExport = async () => {
    setExporting(true)
    try {
      const panel = modulePanelRef.current
      const els = panel ? [...panel.querySelectorAll('[data-chart], [data-insight], [data-analytic]')] : []

      const html2canvas = (await import('html2canvas')).default
      const blocks = await Promise.all(els.map(async el => {
        if (el.hasAttribute('data-chart')) {
          const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2, logging: false, useCORS: true })
          return { type: 'chart', title: el.getAttribute('data-chart'), imageDataUrl: canvas.toDataURL('image/png') }
        }
        if (el.hasAttribute('data-insight')) {
          return { type: 'insight', text: el.textContent?.trim() || '' }
        }
        return { type: 'analytic', text: el.textContent?.trim() || '' }
      }))

      await generateIntelligencePDF({
        moduleName: moduleLabel,
        periodLabel,
        companyProfile,
        blocks,
        filename: `inteligencia_${selectedModule.replace('/', '_')}_${periodSlug(period, customFrom, customTo)}.pdf`,
      })
      toast.success('PDF exportado!')
    } catch (err) {
      console.error('[export]', err)
      toast.error('Erro ao gerar PDF.')
    } finally {
      setTimeout(() => setExporting(false), 800)
    }
  }

  if (isLoading) return <ReportsSkeleton />

  const sharedProps = { period, customFrom, customTo, onInsightsChange }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
          <Brain className="w-5 h-5 text-orange-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Inteligência e Relatórios</h1>
          <p className="text-sm text-slate-500 mt-0.5">Análise estratégica para tomada de decisões</p>
        </div>
      </div>

      {/* Module selector */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Selecione o módulo para análise
        </label>
        <Select value={selectedModule} onValueChange={setSelectedModule}>
          <SelectTrigger className="h-12 text-sm font-semibold rounded-xl border-slate-200 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODULES.map(m => (
              <SelectItem key={m.value} value={m.value} className="text-sm py-2.5">
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filter bar */}
      <FilterBar
        period={period} setPeriod={setPeriod}
        customFrom={customFrom} setCustomFrom={setCustomFrom}
        customTo={customTo} setCustomTo={setCustomTo}
        module={selectedModule}
        members={members} contractors={contractors} songs={songs} rehearsals={rehearsals}
        filterTipo={filterTipo}           setFilterTipo={setFilterTipo}
        filterIniciativa={filterIniciativa} setFilterIniciativa={setFilterIniciativa}
        filterRole={filterRole}           setFilterRole={setFilterRole}
        filterTag={filterTag}             setFilterTag={setFilterTag}
        filterMembro={filterMembro}       setFilterMembro={setFilterMembro}
        filterEstado={filterEstado}       setFilterEstado={setFilterEstado}
        filterCategory={filterCategory}   setFilterCategory={setFilterCategory}
        filterMembroEspecifico={filterMembroEspecifico} setFilterMembroEspecifico={setFilterMembroEspecifico}
        filterEventoMembro={filterEventoMembro}         setFilterEventoMembro={setFilterEventoMembro}
        memberEvents={memberEvents}
        filterEventoFinance={filterEventoFinance} setFilterEventoFinance={setFilterEventoFinance}
        financeEvents={financeEvents}
        onExport={handleExport} exporting={exporting}
      />

      {/* Module panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedModule}
          ref={modulePanelRef}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        >
          {selectedModule === 'contracts' && (
            <ContractsModule events={events} filterTipo={filterTipo} filterIniciativa={filterIniciativa} {...sharedProps} />
          )}
          {selectedModule === 'finance' && (
            <FinanceModule events={events} members={members} payments={payments} expenses={expenses} filterTipo={filterTipo} filterIniciativa={filterIniciativa} filterEventoFinance={filterEventoFinance} {...sharedProps} />
          )}
          {selectedModule === 'expenses' && (
            <DespesasModule events={events} members={members} payments={payments} expenses={expenses} filterCategory={filterCategory} {...sharedProps} />
          )}
          {selectedModule === 'members' && (
            <MembrosModule events={events} members={members} payments={payments} rehearsals={rehearsals} filterRole={filterRole}
              filterMembroEspecifico={filterMembroEspecifico}
              filterEventoMembro={filterEventoMembro}
              memberEvents={memberEvents}
              onExportGeneral={handleExport}
              {...sharedProps} />
          )}
          {selectedModule === 'repertoire' && (
            <RepertorioModule songs={songs} filterTag={filterTag} {...sharedProps} />
          )}
          {selectedModule === 'rehearsals' && (
            <EnsaiosModule rehearsals={rehearsals} members={members} songs={songs} filterMembro={filterMembro} {...sharedProps} />
          )}
          {selectedModule === 'contractors' && (
            <ContratantesModule contractors={contractors} events={events} members={members} payments={payments} expenses={expenses} filterEstado={filterEstado} {...sharedProps} />
          )}
          {selectedModule === 'equipment' && (
            <EquipamentosModule equipment={equipment} showEquipment={showEquipment} {...sharedProps} />
          )}
          {selectedModule === 'budgets' && (
            <OrcamentosModule budgets={budgets} {...sharedProps} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex gap-3"><Skeleton className="w-10 h-10 rounded-xl" /><div className="space-y-2"><Skeleton className="h-6 w-56" /><Skeleton className="h-4 w-72" /></div></div>
      <Skeleton className="h-12 rounded-xl" />
      <Skeleton className="h-24 rounded-2xl" />
      <div className="space-y-4">
        <Skeleton className="h-64 rounded-2xl" />
        <div className="grid grid-cols-2 gap-4"><Skeleton className="h-48 rounded-2xl" /><Skeleton className="h-48 rounded-2xl" /></div>
        <Skeleton className="h-20 rounded-xl" />
      </div>
    </div>
  )
}
