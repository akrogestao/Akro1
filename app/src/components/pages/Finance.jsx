import { useState, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTip, ResponsiveContainer,
} from 'recharts'
import {
  DollarSign, TrendingDown, TrendingUp, Clock,
  ChevronDown, CheckCircle2, AlertCircle, Banknote, X, AlertTriangle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import CurrencyInput from '@/components/shared/CurrencyInput'
import { fmtCurrency, fmtCurrencyShort, MONTHS_SHORT } from '@/lib/format'
import { useStore } from '@/hooks/useStore'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const TYPE_COLOR = {
  Show: 'bg-orange-500', Festival: 'bg-blue-500', Casamento: 'bg-emerald-500',
  Aniversário: 'bg-orange-300', Corporativo: 'bg-slate-500', Outro: 'bg-slate-300',
}
const TYPE_BADGE = {
  Show: 'default', Festival: 'blue', Casamento: 'success',
  Aniversário: 'warning', Corporativo: 'secondary', Outro: 'outline',
}

const RECEIPT_BTNS = [
  { value: 'pending', label: 'Pendente', active: 'bg-white text-orange-500 shadow-sm'  },
  { value: 'partial', label: 'Parcial',  active: 'bg-white text-blue-500 shadow-sm'    },
  { value: 'paid',    label: 'Pago',     active: 'bg-white text-emerald-500 shadow-sm' },
]

// ── Helpers ───────────────────────────────────────────
function memberCacheVal(m, ev, getPayEntry) {
  const base = m.cache ?? 0
  const e = getPayEntry(ev.id, m.id)
  if (e.customValue !== null) return e.customValue
  return e.doubled ? base * 2 : base
}

function calcEvent(ev, members, getPayEntry, allExpenses, contractors = []) {
  const faturamento = ev.value || 0
  const evExps      = allExpenses.filter(e => e.eventId === ev.id)
  const alimentacao = evExps.filter(e => e.type === 'Alimentação').reduce((s, e) => s + (e.amount || 0), 0)
  const hospedagem  = evExps.filter(e => e.type === 'Hospedagem').reduce((s, e) => s + (e.amount || 0), 0)
  const combustivel = evExps.filter(e => e.type === 'Combustível').reduce((s, e) => s + (e.amount || 0), 0)
  const outro       = evExps.filter(e => e.type === 'Outro').reduce((s, e) => s + (e.amount || 0), 0)
  const comissao    = evExps.filter(e => e.type === 'Comissão').reduce((s, e) => s + (e.amount || 0), 0)
  const comissaoContractorIds = [...new Set(
    evExps.filter(e => e.type === 'Comissão').flatMap(e => e.commission_contractors || [])
  )]
  const caches = (ev.members || []).reduce((sum, mid) => {
    const m = members.find(x => x.id === mid)
    return m ? sum + memberCacheVal(m, ev, getPayEntry) : sum
  }, 0)
  const totalDespesas = alimentacao + hospedagem + combustivel + outro + comissao + caches
  const lucro         = faturamento - totalDespesas
  const margem        = faturamento > 0 ? Math.round((lucro / faturamento) * 100) : 0
  return { faturamento, alimentacao, hospedagem, combustivel, outro, comissao, comissaoContractorIds, caches, totalDespesas, lucro, margem }
}

// ── Stat card ─────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, pct, barColor, iconBg }) {
  return (
    <Card className="rounded-2xl overflow-hidden">
      <CardContent className="p-5 pb-6 relative">
        <div className="flex items-start justify-between gap-2 mb-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide leading-tight">{label}</p>
          <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', iconBg || 'bg-slate-100')}>
            <Icon className="w-3.5 h-3.5 text-slate-500" />
          </div>
        </div>
        <p className="text-2xl font-bold text-slate-900 tracking-tight leading-none">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1.5">{sub}</p>}
      </CardContent>
      <div className="h-1.5 bg-slate-100">
        <div
          className={cn('h-full transition-all duration-700', barColor)}
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>
    </Card>
  )
}

// ── Bar chart tooltip ─────────────────────────────────
function BarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-modal px-3 py-2.5 text-left min-w-[180px]">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-6 mb-1 last:mb-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.fill }} />
            <span className="text-xs text-slate-600">{p.name}</span>
          </div>
          <span className="text-xs font-bold text-slate-900">{fmtCurrency(p.value)}</span>
        </div>
      ))}
      {payload.length === 2 && payload[0].value > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[10px] text-slate-400">Margem</span>
          <span className="text-[10px] font-bold text-emerald-600">
            {Math.round((payload[1].value / payload[0].value) * 100)}%
          </span>
        </div>
      )}
    </div>
  )
}

// ── Faturamento vs Lucro bar chart ────────────────────
function RevenueVsProfitChart({ data }) {
  const hasData = data.some(d => d.faturamento > 0)
  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <p className="text-sm text-slate-400">Nenhum dado disponível</p>
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }} barGap={4} barCategoryGap="28%">
        <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DD" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#787878' }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 10, fill: '#787878' }}
          axisLine={false} tickLine={false}
          tickFormatter={v => fmtCurrencyShort(v)}
          width={60}
        />
        <RechartsTip content={<BarTooltip />} cursor={{ fill: '#F4F1EC', opacity: 0.6 }} />
        <Bar dataKey="faturamento" name="Faturamento" fill="#F26419" radius={[4, 4, 0, 0]} maxBarSize={40} />
        <Bar dataKey="lucro"       name="Lucro"       fill="#7CB87A" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Contract payment control ──────────────────────────
function ContractPaymentControl({ evId, evValue }) {
  const { getContractReceipt, setContractReceipt, addPartialPayment, removePartialPayment } = useStore()
  const [newAmount, setNewAmount] = useState(0)
  const [dialog,    setDialog]    = useState(null) // { from, to }

  const receipt         = getContractReceipt(evId)
  const status          = receipt.paid ? 'paid' : receipt.partial ? 'partial' : 'pending'
  const paidAmount      = receipt.paidAmount ?? 0
  const partialPayments = receipt.partialPayments || []
  const remaining       = Math.max(0, evValue - paidAmount)
  const pct             = evValue > 0 ? Math.min(100, (paidAmount / evValue) * 100) : 0

  const fmtDateTime = (iso) => {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  const openDialog = (next) => {
    if (next === status) return
    setNewAmount(0)
    setDialog({ from: status, to: next })
  }

  // Bug fix: every transition sets paidAmount explicitly — no stale cached value
  const executeTransition = (to) => {
    if (to === 'paid') {
      setContractReceipt(evId, { paid: true, partial: false, paidAmount: evValue, paidAt: new Date().toISOString() })
    } else if (to === 'partial') {
      const correctPaid = partialPayments.reduce((s, p) => s + p.amount, 0)
      setContractReceipt(evId, { paid: false, partial: true, paidAmount: correctPaid || null, paidAt: null })
    } else if (to === 'pending') {
      setContractReceipt(evId, { paid: false, partial: false, paidAmount: null, paidAt: null, partialPaidAt: null, partialPayments: [] })
    }
    setDialog(null)
  }

  const confirmDialog = () => {
    if (!dialog) return
    if (dialog.to === 'partial' && dialog.from === 'pending') {
      const correctPaid = partialPayments.reduce((s, p) => s + p.amount, 0)
      setContractReceipt(evId, { paid: false, partial: true, paidAmount: correctPaid || null, paidAt: null })
      if (newAmount > 0) { addPartialPayment(evId, newAmount); setNewAmount(0) }
      setDialog(null)
    } else {
      executeTransition(dialog.to)
    }
  }

  const handleAddPartial = () => {
    if (!newAmount || newAmount <= 0) return
    const newTotal = paidAmount + newAmount
    addPartialPayment(evId, newAmount)
    setNewAmount(0)
    if (evValue > 0 && newTotal >= evValue) {
      setContractReceipt(evId, { paid: true, partial: false, paidAmount: evValue, paidAt: new Date().toISOString() })
      toast.success('Contrato quitado automaticamente!')
    }
  }

  const DIALOG_MAP = {
    'pending→partial': {
      iconType: 'partial',
      title: 'Registrar pagamento parcial',
      confirmLabel: 'Salvar',
      isForm: true,
    },
    'pending→paid': {
      iconType: 'confirm',
      title: 'Confirmar pagamento integral',
      description: `Confirmar que o valor total de ${fmtCurrency(evValue)} foi recebido integralmente?`,
      confirmLabel: 'Confirmar pagamento',
    },
    'partial→paid': {
      iconType: 'confirm',
      title: 'Quitar pagamento',
      description: `Você já recebeu ${fmtCurrency(paidAmount)} de forma parcial. Confirmar recebimento do saldo restante de ${fmtCurrency(remaining)}?`,
      confirmLabel: 'Confirmar quitação',
    },
    'partial→pending': {
      iconType: 'warning',
      title: 'Reverter para pendente',
      description: 'Atenção: o histórico de pagamentos parciais será mantido, mas o status voltará para pendente. Tem certeza?',
      confirmLabel: 'Sim, reverter',
    },
    'paid→partial': {
      iconType: 'warning',
      title: 'Reverter pagamento',
      description: 'Este contrato está marcado como pago integralmente. Reverter para parcial irá remover a data de quitação. Tem certeza?',
      confirmLabel: 'Sim, reverter',
    },
    'paid→pending': {
      iconType: 'warning',
      title: 'Reverter para pendente',
      description: 'Atenção: este contrato está marcado como pago. Reverter irá remover todas as datas de confirmação de pagamento. Tem certeza?',
      confirmLabel: 'Sim, reverter',
    },
  }

  const cfg = dialog ? DIALOG_MAP[`${dialog.from}→${dialog.to}`] : null

  return (
    <>
      <Dialog open={!!dialog} onOpenChange={(v) => { if (!v) setDialog(null) }}>
        <DialogContent className="max-w-sm">
          <motion.div
            key={dialog ? `${dialog.from}-${dialog.to}` : 'none'}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            {cfg && (
              <>
                <DialogHeader>
                  <div className="flex flex-col items-center gap-3 pt-2 pb-1">
                    {cfg.iconType === 'confirm' && <CheckCircle2 className="w-10 h-10 text-emerald-500" />}
                    {cfg.iconType === 'warning'  && <AlertTriangle className="w-10 h-10 text-red-500" />}
                    {cfg.iconType === 'partial'  && <DollarSign className="w-10 h-10 text-amber-500" />}
                    <DialogTitle className="text-center text-base">{cfg.title}</DialogTitle>
                  </div>
                  {cfg.description && (
                    <p className="text-sm text-slate-500 text-center px-2 pt-1">{cfg.description}</p>
                  )}
                </DialogHeader>

                {cfg.isForm && (
                  <div className="py-4 px-6">
                    <CurrencyInput value={newAmount} onChange={setNewAmount} />
                  </div>
                )}

                <DialogFooter className="gap-2 pt-4 flex flex-row justify-center">
                  <button
                    onClick={() => setDialog(null)}
                    className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmDialog}
                    className={cn(
                      'px-4 py-2 text-sm font-semibold text-white rounded-xl transition-colors',
                      cfg.iconType === 'warning' ? 'bg-red-500 hover:bg-red-600' :
                      cfg.iconType === 'confirm' ? 'bg-emerald-500 hover:bg-emerald-600' :
                                                   'bg-amber-500 hover:bg-amber-600'
                    )}
                  >
                    {cfg.confirmLabel}
                  </button>
                </DialogFooter>
              </>
            )}
          </motion.div>
        </DialogContent>
      </Dialog>

      <div className="space-y-3">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Pagamento do Contrato
        </p>

        <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
          {RECEIPT_BTNS.map(btn => (
            <button
              key={btn.value}
              onClick={() => openDialog(btn.value)}
              className={cn(
                'flex-1 text-[11px] font-semibold px-2 py-1.5 rounded-md transition-all duration-150',
                status === btn.value ? btn.active : 'text-slate-400 hover:text-slate-600'
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {status === 'paid' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-emerald-700">Pagamento integral confirmado</p>
                {receipt.paidAt && (
                  <p className="text-[10px] text-emerald-500 mt-0.5">{fmtDateTime(receipt.paidAt)}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {status === 'partial' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <CurrencyInput value={newAmount} onChange={setNewAmount} />
              </div>
              <button
                onClick={handleAddPartial}
                className="shrink-0 text-xs font-semibold px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Adicionar
              </button>
            </div>

            {partialPayments.length > 0 && (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {partialPayments.map(pp => (
                  <div key={pp.id} className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-slate-700 tabular-nums">{fmtCurrency(pp.amount)}</span>
                      <span className="text-[10px] text-slate-400 ml-2">{fmtDateTime(pp.receivedAt)}</span>
                    </div>
                    <button
                      onClick={() => removePartialPayment(evId, pp.id)}
                      className="text-slate-300 hover:text-rose-400 transition-colors shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {evValue > 0 && (
              <>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-400 transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-blue-500 font-semibold tabular-nums">Recebido: {fmtCurrency(paidAmount)}</span>
                  <span className={cn('tabular-nums', remaining <= 0 ? 'text-emerald-500 font-semibold' : 'text-slate-400')}>
                    {remaining <= 0 ? 'Quitado' : `Falta: ${fmtCurrency(remaining)}`}
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {status === 'pending' && (
          <div className="flex items-center gap-1.5 text-xs text-orange-500 font-medium">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            Aguardando pagamento de {fmtCurrency(evValue)}
          </div>
        )}
      </div>
    </>
  )
}

// ── Receipt status badge (collapsed row) ──────────────
function ReceiptBadge({ evId }) {
  const { getContractReceipt } = useStore()
  const r = getContractReceipt(evId)
  if (r.paid)    return <span className="hidden sm:flex items-center gap-1 text-[10px] font-semibold text-emerald-600 shrink-0"><CheckCircle2 className="w-3 h-3" />Pago</span>
  if (r.partial) return <span className="hidden sm:flex items-center gap-1 text-[10px] font-semibold text-blue-500 shrink-0"><span className="w-1.5 h-1.5 rounded-full bg-blue-400" />Parcial</span>
  return               <span className="hidden sm:flex items-center gap-1 text-[10px] font-semibold text-orange-400 shrink-0"><span className="w-1.5 h-1.5 rounded-full bg-orange-300" />Pendente</span>
}

// ── Event accordion row ───────────────────────────────
function EventRow({ ev, members, getPayEntry, allExpenses, contractors }) {
  const [open, setOpen] = useState(false)
  const fin = useMemo(() => calcEvent(ev, members, getPayEntry, allExpenses, contractors), [ev, members, getPayEntry, allExpenses, contractors])
  const d   = new Date(ev.date + 'T12:00:00')

  const comissaoNames = (fin.comissaoContractorIds || [])
    .map(id => (contractors || []).find(c => c.id === id)?.name).filter(Boolean)

  const despesaRows = [
    { label: 'Alimentação', val: fin.alimentacao },
    { label: 'Hospedagem',  val: fin.hospedagem  },
    { label: 'Combustível', val: fin.combustivel  },
    { label: 'Outro',       val: fin.outro        },
    ...(fin.comissao > 0 ? [{
      label: `Comissão${comissaoNames.length > 0 ? ` (${comissaoNames.join(', ')})` : ''}`,
      val: fin.comissao,
    }] : []),
    { label: 'Cachês',      val: fin.caches       },
  ]

  return (
    <>
      {/* Collapsed row */}
      <div
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-slate-100 transition-colors duration-150',
          open ? 'bg-orange-50/50' : 'hover:bg-slate-50'
        )}
      >
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}>
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        </motion.div>

        <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex flex-col items-center justify-center shrink-0">
          <span className="text-xs font-bold text-orange-600 leading-none">{d.getDate()}</span>
          <span className="text-[8px] text-orange-400 uppercase">{MONTHS_SHORT[d.getMonth()]}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-800 truncate">{ev.name}</div>
          <div className="text-xs text-slate-400 truncate">{ev.local}</div>
        </div>

        <ReceiptBadge evId={ev.id} />
        <Badge variant={TYPE_BADGE[ev.type] || 'outline'} className="hidden lg:inline-flex text-[10px] shrink-0">{ev.type}</Badge>
        <span className="text-sm font-bold text-slate-900 shrink-0">{fmtCurrency(fin.faturamento)}</span>
      </div>

      {/* Expanded */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="bg-slate-50/60 border-b border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">

                {/* Col 1 — composição */}
                <div className="px-5 py-4 space-y-2">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Composição</p>

                  <div className="flex items-center justify-between text-sm py-1 border-b border-slate-200">
                    <span className="font-medium text-slate-700">Faturamento</span>
                    <span className="font-bold text-slate-900">{fmtCurrency(fin.faturamento)}</span>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <p className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider">Despesas</p>
                    {despesaRows.map(({ label, val }) => (
                      <div key={label} className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">{label}</span>
                        <span className={cn('font-semibold tabular-nums', val > 0 ? 'text-rose-500' : 'text-slate-300')}>
                          {val > 0 ? `− ${fmtCurrency(val)}` : '—'}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between text-xs border-t border-dashed border-slate-200 pt-1.5 mt-1">
                      <span className="font-semibold text-slate-600">Total Despesas</span>
                      <span className="font-bold text-rose-500 tabular-nums">− {fmtCurrency(fin.totalDespesas)}</span>
                    </div>
                  </div>
                </div>

                {/* Col 2 — resultado */}
                <div className="px-5 py-4 flex flex-col items-center justify-center">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Resultado</p>

                  <p className={cn(
                    'text-3xl font-bold tracking-tight leading-none mb-2 tabular-nums',
                    fin.lucro >= 0 ? 'text-emerald-500' : 'text-rose-500'
                  )}>
                    {fin.lucro < 0 && '−'}{fmtCurrency(Math.abs(fin.lucro))}
                  </p>

                  <div className={cn(
                    'inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full mb-4',
                    fin.lucro >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
                  )}>
                    {fin.lucro >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {fin.lucro >= 0 ? 'Lucro' : 'Prejuízo'} de {Math.abs(fin.margem)}%
                  </div>

                  {fin.faturamento > 0 && (
                    <div className="w-full space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Despesas</span><span>Lucro</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
                        <div className="h-full bg-rose-400 transition-all duration-700"
                          style={{ width: `${Math.min(100, (fin.totalDespesas / fin.faturamento) * 100)}%` }} />
                        <div className="h-full bg-emerald-400 transition-all duration-700"
                          style={{ width: `${Math.max(0, fin.margem)}%` }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Col 3 — pagamento do contrato */}
                <div className="px-5 py-4">
                  <ContractPaymentControl evId={ev.id} evValue={fin.faturamento} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ── Main page ─────────────────────────────────────────
export default function Finance({ isLoading }) {
  const { events, members, getPayEntry, expenses: allExpenses, getContractReceipt, contractors } = useStore()

  const stats = useMemo(() => {
    let totalFaturamento = 0, totalDespesas = 0
    let recebido = 0, paidCount = 0, partialCount = 0
    const byType = {}

    events.forEach(ev => {
      const fin = calcEvent(ev, members, getPayEntry, allExpenses, contractors)
      totalFaturamento += fin.faturamento
      totalDespesas    += fin.totalDespesas
      if (ev.value > 0) byType[ev.type] = (byType[ev.type] || 0) + ev.value

      const r = getContractReceipt(ev.id)
      if (r.paid) {
        recebido  += ev.value || 0
        paidCount += 1
      } else if (r.partial) {
        recebido     += r.paidAmount || 0
        partialCount += 1
      }
    })

    const pendingCount = events.length - paidCount - partialCount
    const aReceber     = totalFaturamento - recebido
    const lucro        = totalFaturamento - totalDespesas
    const lucroMargin  = totalFaturamento > 0 ? Math.max(0, Math.round((lucro / totalFaturamento) * 100)) : 0
    const activeTypes  = Object.entries(byType).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])

    return {
      totalFaturamento, recebido, aReceber,
      lucro, lucroMargin,
      paidCount, partialCount, pendingCount,
      activeTypes,
    }
  }, [events, members, getPayEntry, allExpenses, getContractReceipt, contractors])

  const last6Months = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 6 }, (_, i) => {
      const d  = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
      const y  = d.getFullYear(), m = d.getMonth()
      const monthEvents = events.filter(e => {
        const ed = new Date(e.date + 'T12:00:00')
        return ed.getFullYear() === y && ed.getMonth() === m
      })
      const faturamento   = monthEvents.reduce((s, e) => s + (e.value || 0), 0)
      const totalDespesas = monthEvents.reduce((s, ev) =>
        s + calcEvent(ev, members, getPayEntry, allExpenses, contractors).totalDespesas, 0)
      const lucro = Math.max(0, faturamento - totalDespesas)
      return { month: MONTHS_SHORT[m], faturamento, lucro }
    })
  }, [events, members, getPayEntry, allExpenses, contractors])

  const sortedEvents = useMemo(() =>
    [...events].sort((a, b) => b.date.localeCompare(a.date)),
  [events])

  if (isLoading) return <FinanceSkeleton />

  const recebidoPct = stats.totalFaturamento > 0
    ? Math.round((stats.recebido / stats.totalFaturamento) * 100) : 0
  const aReceberPct = stats.totalFaturamento > 0
    ? Math.round((stats.aReceber / stats.totalFaturamento) * 100) : 0

  const recebidoSub = [
    stats.paidCount   > 0 ? `${stats.paidCount} pago${stats.paidCount   !== 1 ? 's' : ''}` : null,
    stats.partialCount > 0 ? `${stats.partialCount} parcial${stats.partialCount !== 1 ? 'is' : ''}` : null,
  ].filter(Boolean).join(' · ') || 'nenhum recebido'

  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Financeiro</h1>
        <p className="text-sm text-slate-500 mt-0.5">Visão geral de receitas, despesas e lucro</p>
      </div>

      {/* 4 stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          icon={DollarSign}
          label="Faturamento"
          value={fmtCurrency(stats.totalFaturamento)}
          sub={`${events.length} contrato${events.length !== 1 ? 's' : ''}`}
          pct={100}
          barColor="bg-orange-400"
          iconBg="bg-orange-50"
        />
        <StatCard
          icon={Banknote}
          label="Recebido"
          value={fmtCurrency(stats.recebido)}
          sub={recebidoSub}
          pct={recebidoPct}
          barColor="bg-emerald-400"
          iconBg="bg-emerald-50"
        />
        <StatCard
          icon={Clock}
          label="A Receber"
          value={fmtCurrency(stats.aReceber)}
          sub={`${stats.pendingCount} pendente${stats.pendingCount !== 1 ? 's' : ''}`}
          pct={aReceberPct}
          barColor="bg-blue-400"
          iconBg="bg-blue-50"
        />
        <StatCard
          icon={TrendingUp}
          label="Lucro Estimado"
          value={fmtCurrency(Math.max(0, stats.lucro))}
          sub={`${stats.lucroMargin}% de margem`}
          pct={stats.lucroMargin}
          barColor="bg-emerald-500"
          iconBg="bg-emerald-50"
        />
      </div>

      {/* Bar chart */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-700">
              Faturamento vs Lucro — Últimos 6 Meses
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-orange-400" />
                <span className="text-[11px] text-slate-500">Faturamento</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                <span className="text-[11px] text-slate-500">Lucro</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 pb-3">
          <RevenueVsProfitChart data={last6Months} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue by type */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-3"><CardTitle>Receita por Tipo</CardTitle></CardHeader>
          <CardContent className="pt-0 space-y-3">
            {stats.activeTypes.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Nenhum dado</p>
            ) : stats.activeTypes.map(([type, val]) => (
              <div key={type}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${TYPE_COLOR[type] || 'bg-slate-400'}`} />
                    <span className="text-xs font-medium text-slate-700">{type}</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-900">{fmtCurrency(val)}</span>
                </div>
                <Progress
                  value={stats.totalFaturamento > 0 ? (val / stats.totalFaturamento) * 100 : 0}
                  className="h-1"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Events accordion */}
        <Card className="lg:col-span-2 rounded-2xl overflow-hidden">
          <CardHeader className="pb-0 border-b border-slate-100">
            <CardTitle>Eventos</CardTitle>
          </CardHeader>

          <div className="flex items-center gap-3 px-4 py-2 bg-slate-50/80 border-b border-slate-100">
            <div className="w-4 shrink-0" />
            <div className="w-9 shrink-0" />
            <div className="flex-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Evento</div>
            <div className="hidden sm:block text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">Status</div>
            <div className="hidden lg:block text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">Tipo</div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">Valor</div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {sortedEvents.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-10">Nenhum evento cadastrado</p>
            ) : sortedEvents.map(ev => (
              <EventRow key={ev.id} ev={ev} members={members} getPayEntry={getPayEntry} allExpenses={allExpenses} contractors={contractors} />
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function FinanceSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-8 w-32" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="lg:col-span-2 h-64 rounded-2xl" />
      </div>
    </div>
  )
}
