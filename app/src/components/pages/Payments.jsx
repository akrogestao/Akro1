import { useState, useMemo, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, CheckCircle2, Clock, AlertCircle, Users, CheckCheck, X } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import Avatar from '@/components/shared/Avatar'
import { fmtCurrency, fmtDate, parseBRL } from '@/lib/format'
import { useStore } from '@/hooks/useStore'
import { cn } from '@/lib/utils'

// ── helpers ──────────────────────────────────────────
function usePaymentCalc() {
  const { events, members, getPayEntry } = useStore()

  const finalVal = useCallback((mid, evId) => {
    const m = members.find((x) => x.id === mid)
    const base = m?.cache ?? 0
    const e = getPayEntry(evId, mid)
    if (e.customValue !== null) return e.customValue
    return e.doubled ? base * 2 : base
  }, [members, getPayEntry])

  const evStatus = useCallback((ev) => {
    const mems = (ev.members || []).filter((mid) => members.find((m) => m.id === mid))
    if (!mems.length) return 'pend'
    const paid = mems.filter((mid) => getPayEntry(ev.id, mid).paid).length
    if (paid === 0) return 'pend'
    if (paid === mems.length) return 'paid'
    return 'part'
  }, [members, getPayEntry])

  const summary = useMemo(() => {
    const now = new Date()
    const mY = now.getFullYear(), mM = now.getMonth()
    let pending = 0, paidMonth = 0, due = 0, paidSlots = 0, total = 0

    events.forEach((ev) => {
      const mems = (ev.members || []).filter((mid) => members.find((m) => m.id === mid))
      const d = new Date(ev.date + 'T12:00:00')
      const diff = (d - now) / 86400000
      let hasUnpaid = false
      mems.forEach((mid) => {
        const e = getPayEntry(ev.id, mid)
        const v = finalVal(mid, ev.id)
        total++
        if (e.paid) {
          paidSlots++
          if (d.getFullYear() === mY && d.getMonth() === mM) paidMonth += v
        } else { pending += v; hasUnpaid = true }
      })
      if (diff >= 0 && diff <= 7 && hasUnpaid) due++
    })

    const pct = total > 0 ? Math.round((paidSlots / total) * 100) : 0
    return { pending, paidMonth, due, paidSlots, total, pct }
  }, [events, members, getPayEntry, finalVal])

  return { finalVal, evStatus, summary }
}

// ── Status badge ─────────────────────────────────────
const STATUS_CFG = {
  pend: { label: 'Pendente', variant: 'destructive', icon: AlertCircle },
  part: { label: 'Parcial',  variant: 'warning',     icon: Clock },
  paid: { label: 'Pago',     variant: 'success',     icon: CheckCircle2 },
}

function StatusBadge({ status }) {
  const { label, variant, icon: Icon } = STATUS_CFG[status] || STATUS_CFG.pend
  return (
    <Badge variant={variant} className="gap-1">
      <Icon className="w-3 h-3" /> {label}
    </Badge>
  )
}

// ── Member row inside accordion ───────────────────────
function MemberRow({ evId, mid, batchSelected, onBatchChange }) {
  const { members, getPayEntry, setPayEntry } = useStore()
  const { finalVal } = usePaymentCalc()
  const m = members.find((x) => x.id === mid)
  if (!m) return null

  const entry = getPayEntry(evId, mid)
  const base = m.cache ?? 0
  const fv = finalVal(mid, evId)
  const isManual = entry.customValue !== null

  const [raw, setRaw] = useState(
    fv.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  )

  const handleDoubled = (checked) => {
    setPayEntry(evId, mid, { doubled: checked, customValue: null })
    const newVal = checked ? base * 2 : base
    setRaw(newVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
  }

  const handleValBlur = () => {
    const v = parseBRL(raw)
    const computed = entry.doubled ? base * 2 : base
    setPayEntry(evId, mid, { customValue: Math.abs(v - computed) > 0.001 ? v : null })
    setRaw(v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
  }

  const handlePaid = (checked) => {
    setPayEntry(evId, mid, { paid: checked })
    if (checked) toast.success(`Pagamento de ${m.name} registrado!`, { icon: '✓' })
  }

  return (
    <tr className="group border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors duration-100">
      <td className="py-3 pl-4 pr-2 w-10">
        <Checkbox
          checked={batchSelected}
          onCheckedChange={(v) => onBatchChange(mid, v)}
        />
      </td>
      <td className="py-3 px-3">
        <div className="flex items-center gap-2.5">
          <Avatar init={m.init} color={m.color} size="sm" />
          <div>
            <div className="text-sm font-medium text-slate-800">{m.name}</div>
            <div className="text-xs text-slate-400">{m.role}</div>
          </div>
        </div>
      </td>
      <td className="py-3 px-3 text-xs text-slate-500">{fmtCurrency(base)}</td>
      <td className="py-3 px-3 text-center">
        <Checkbox checked={entry.doubled} onCheckedChange={handleDoubled} />
      </td>
      <td className="py-3 px-3">
        <input
          type="text"
          inputMode="decimal"
          value={raw}
          onChange={(e) => setRaw(e.target.value.replace(/[^\d,\.]/g, ''))}
          onFocus={(e) => e.target.select()}
          onBlur={handleValBlur}
          className={cn(
            'w-24 rounded-lg border px-2.5 py-1.5 text-xs font-semibold text-right text-slate-800 outline-none transition-all duration-150 bg-white',
            isManual
              ? 'border-orange-300 bg-orange-50/50 ring-1 ring-orange-200'
              : 'border-slate-200 focus:border-orange-300 focus:ring-1 focus:ring-orange-200'
          )}
        />
      </td>
      <td className="py-3 pl-3 pr-4 text-center">
        <Switch checked={entry.paid} onCheckedChange={handlePaid} />
      </td>
    </tr>
  )
}

// ── Event accordion row ───────────────────────────────
function EventRow({ ev, isOpen, onToggle }) {
  const { members, setPayEntry, getPayEntry } = useStore()
  const { finalVal, evStatus } = usePaymentCalc()

  const evMembers = (ev.members || []).filter((mid) => members.find((m) => m.id === mid))
  const status = evStatus(ev)

  const [batchSel, setBatchSel] = useState({})
  const [batchOpen, setBatchOpen] = useState(false)

  const selectedIds = evMembers.filter((mid) => batchSel[mid])
  const allChecked = evMembers.length > 0 && evMembers.every((mid) => batchSel[mid])

  const toggleAll = (v) => {
    const next = {}
    evMembers.forEach((mid) => { next[mid] = v })
    setBatchSel(next)
  }

  const handleBatchChange = (mid, v) => setBatchSel((p) => ({ ...p, [mid]: v }))

  const batchTotal = selectedIds.reduce((s, mid) => s + finalVal(mid, ev.id), 0)

  const confirmBatch = () => {
    selectedIds.forEach((mid) => setPayEntry(ev.id, mid, { paid: true }))
    setBatchSel({})
    setBatchOpen(false)
    toast.success(`${selectedIds.length} pagamento${selectedIds.length > 1 ? 's' : ''} confirmado${selectedIds.length > 1 ? 's' : ''}!`, { icon: '🎉' })
  }

  return (
    <>
      {/* Header row */}
      <tr
        className={cn('cursor-pointer border-b border-slate-100 transition-colors duration-150', isOpen ? 'bg-orange-50/50' : 'hover:bg-slate-50')}
        onClick={onToggle}
      >
        <td className="py-4 pl-5 pr-3 w-10">
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2, ease: [0.4,0,0.2,1] }}>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </motion.div>
        </td>
        <td className="py-4 px-3">
          <div className="font-semibold text-sm text-slate-900">{ev.name}</div>
          <div className="text-xs text-slate-400 mt-0.5">{ev.local}</div>
        </td>
        <td className="py-4 px-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(ev.date)}</td>
        <td className="py-4 px-3 text-sm font-semibold text-slate-900">{fmtCurrency(ev.value)}</td>
        <td className="py-4 px-3"><StatusBadge status={status} /></td>
        <td className="py-4 pl-3 pr-5 text-right">
          <span className="text-xs text-slate-400 flex items-center justify-end gap-1">
            <Users className="w-3 h-3" /> {evMembers.length}
          </span>
        </td>
      </tr>

      {/* Accordion content */}
      <tr>
        <td colSpan={6} className="p-0 border-b border-slate-100">
          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                style={{ overflow: 'hidden' }}
              >
                {/* Batch bar */}
                <AnimatePresence>
                  {selectedIds.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-5 py-2.5 bg-orange-50 border-b border-orange-100">
                        <span className="text-xs font-semibold text-orange-700">
                          {selectedIds.length} selecionado{selectedIds.length > 1 ? 's' : ''}
                        </span>
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); setBatchOpen(true) }} className="gap-1.5 h-7 text-xs">
                          <CheckCheck className="w-3.5 h-3.5" /> Registrar Pagamento em Lote
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Sub-table */}
                {evMembers.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">Nenhum membro neste evento</p>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100">
                        <th className="py-2 pl-4 pr-2 w-10">
                          <Checkbox checked={allChecked} onCheckedChange={toggleAll} />
                        </th>
                        {['Membro','Valor Base','Dobrar','Valor Final','Pago'].map((h) => (
                          <th key={h} className="py-2 px-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {evMembers.map((mid) => (
                        <MemberRow key={mid} evId={ev.id} mid={mid} batchSelected={!!batchSel[mid]} onBatchChange={handleBatchChange} />
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Batch confirm modal */}
                <Dialog open={batchOpen} onOpenChange={setBatchOpen}>
                  <DialogContent className="max-w-sm" onClick={(e) => e.stopPropagation()}>
                    <DialogHeader><DialogTitle>Pagamento em Lote</DialogTitle></DialogHeader>
                    <div className="px-6 space-y-0">
                      {selectedIds.map((mid) => {
                        const m = members.find((x) => x.id === mid)
                        const v = finalVal(mid, ev.id)
                        return (
                          <div key={mid} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
                            <Avatar init={m?.init} color={m?.color} size="sm" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-slate-800">{m?.name}</div>
                              <div className="text-xs text-slate-400">{m?.role}</div>
                            </div>
                            <span className="text-sm font-semibold text-slate-900">{fmtCurrency(v)}</span>
                          </div>
                        )
                      })}
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between px-6 pb-4">
                      <span className="text-sm font-semibold text-slate-500">Total a Pagar</span>
                      <span className="text-xl font-bold text-slate-900">{fmtCurrency(batchTotal)}</span>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setBatchOpen(false)}>Cancelar</Button>
                      <Button onClick={confirmBatch} className="gap-1.5">
                        <CheckCheck className="w-4 h-4" /> Confirmar e Gerar Recibos
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </motion.div>
            )}
          </AnimatePresence>
        </td>
      </tr>
    </>
  )
}

// ── Main page ─────────────────────────────────────────
export default function Payments({ isLoading }) {
  const { events } = useStore()
  const { summary } = usePaymentCalc()
  const [openRows, setOpenRows] = useState(new Set())

  const toggle = (id) => setOpenRows((prev) => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const sorted = useMemo(() => [...events].sort((a, b) => a.date.localeCompare(b.date)), [events])

  if (isLoading) return <PaymentsSkeleton />

  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Controle de Pagamentos</h1>
        <p className="text-sm text-slate-500 mt-0.5">Gerencie cachês e pagamentos dos membros por evento</p>
      </div>

      {/* Top 3 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Pendente',    value: fmtCurrency(summary.pending),   icon: AlertCircle,  color: 'text-red-500',   bg: 'bg-red-50'     },
          { label: 'Total Pago (Mês)', value: fmtCurrency(summary.paidMonth), icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Próx. Vencimentos',value: String(summary.due),            icon: Clock,        color: 'text-amber-500',  bg: 'bg-amber-50'   },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="hover:shadow-card-hover transition-shadow duration-200">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
                  <p className={cn('text-2xl font-bold tracking-tight', color)}>{value}</p>
                </div>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${bg} ${color}`}>
                  <Icon className="w-[18px] h-[18px]" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-orange-50 border-orange-100 rounded-2xl">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">Membros Pagos</p>
            <p className="text-3xl font-bold text-orange-700 mb-2">{summary.pct}%</p>
            <Progress value={summary.pct} className="h-2 bg-orange-100" indicatorClassName="bg-orange-500" />
            <p className="text-xs text-orange-400 mt-2">{summary.paidSlots} de {summary.total} pagamentos realizados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Valor Restante</p>
            <p className="text-3xl font-bold text-red-500 mb-1">{fmtCurrency(summary.pending)}</p>
            <p className="text-xs text-slate-400">total ainda a liquidar</p>
          </CardContent>
        </Card>
      </div>

      {/* Main accordion table */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-0 border-b border-slate-100">
          <CardTitle className="pb-4">Eventos e Pagamentos</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="py-3 pl-5 pr-3 w-10" />
                {['Evento','Data','Valor Contrato','Status','Membros'].map((h) => (
                  <th key={h} className="py-3 px-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-sm text-slate-400">Nenhum evento cadastrado</td></tr>
              ) : (
                sorted.map((ev) => (
                  <EventRow key={ev.id} ev={ev} isOpen={openRows.has(ev.id)} onToggle={() => toggle(ev.id)} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function PaymentsSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{Array(2).fill(0).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  )
}
