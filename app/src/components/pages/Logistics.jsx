import { useState, useMemo, Suspense, lazy, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, ChevronDown, MapPin, Navigation,
  Plus, Pencil, Trash2, UtensilsCrossed, Bed, Fuel, Receipt, Tag, Percent,
  Star, X, Users, CheckCircle2, Clock, Printer, AlertTriangle, DollarSign,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import CurrencyInput from '@/components/shared/CurrencyInput'
import DatePicker from '@/components/shared/DatePicker'
import CitySelect from '@/components/shared/CitySelect'
import Avatar from '@/components/shared/Avatar'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { useStore } from '@/hooks/useStore'
import { MONTHS, fmtCurrency, fmtDate, MONTHS_SHORT, parseBRL } from '@/lib/format'
import { generateReceipt } from '@/lib/pdf'
import { haversine, fmtKm } from '@/lib/geo'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const BrazilMap = lazy(() => import('@/components/shared/BrazilMap'))

// ── Expense type config ───────────────────────────────
const EXP_TYPES = ['Alimentação', 'Hospedagem', 'Combustível', 'Comissão', 'Outro']
const EXP_STYLE = {
  'Alimentação': { variant: 'warning',   Icon: UtensilsCrossed, color: 'text-orange-600', bg: 'bg-orange-50',   border: 'border-orange-100' },
  'Hospedagem':  { variant: 'blue',      Icon: Bed,             color: 'text-blue-600',   bg: 'bg-blue-50',     border: 'border-blue-100'   },
  'Combustível': { variant: 'secondary', Icon: Fuel,            color: 'text-violet-600', bg: 'bg-violet-50',   border: 'border-violet-100' },
  'Comissão':    { variant: 'default',   Icon: Percent,         color: 'text-rose-600',   bg: 'bg-rose-50',     border: 'border-rose-100'   },
  'Outro':       { variant: 'outline',   Icon: Tag,             color: 'text-slate-600',  bg: 'bg-slate-50',    border: 'border-slate-200'  },
}

// ── Stop modal ────────────────────────────────────────
function StopModal({ open, onOpenChange, afterEventId, editStopId }) {
  const { stops, favoriteStops, addStop, updateStop, deleteStop, addFavoriteStop, deleteFavoriteStop } = useStore()
  const [form, setForm] = useState({ city: '', state: '', lat: null, lng: null })
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  useEffect(() => {
    if (!open) return
    if (editStopId) {
      const s = stops.find(x => x.id === editStopId)
      if (s) { setForm({ city: s.city, state: s.state, lat: s.lat, lng: s.lng }); return }
    }
    setForm({ city: '', state: '', lat: null, lng: null })
  }, [open, editStopId])

  const isFav = favoriteStops.some(f => f.city === form.city && f.state === form.state)

  const toggleFav = () => {
    if (isFav) {
      const f = favoriteStops.find(f => f.city === form.city && f.state === form.state)
      if (f) deleteFavoriteStop(f.id)
    } else {
      addFavoriteStop({ city: form.city, state: form.state, lat: form.lat, lng: form.lng })
    }
  }

  const handleSave = () => {
    if (!form.city || !form.state) { toast.error('Selecione a cidade'); return }
    const payload = { afterEventId, city: form.city, state: form.state, lat: form.lat, lng: form.lng }
    if (editStopId) { updateStop(editStopId, payload); toast.success('Parada atualizada!') }
    else            { addStop(payload);                 toast.success('Parada adicionada!') }
    onOpenChange(false)
  }

  const handleDelete = () => setDeleteConfirm(true)
  const doDeleteStop = () => { deleteStop(editStopId); toast.success('Parada removida.'); onOpenChange(false) }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-y-visible">
        <DialogHeader>
          <DialogTitle>{editStopId ? 'Editar Parada' : 'Adicionar Parada'}</DialogTitle>
        </DialogHeader>
        <div className="px-6 py-6 space-y-6">
          {favoriteStops.length > 0 && (
            <div className="space-y-2.5">
              <Label className="text-xs text-slate-500">Favoritos</Label>
              <div className="flex flex-wrap gap-2">
                {favoriteStops.map(f => (
                  <button key={f.id} type="button"
                    onClick={() => setForm({ city: f.city, state: f.state, lat: f.lat, lng: f.lng })}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all duration-150',
                      form.city === f.city && form.state === f.state
                        ? 'border-amber-400 bg-amber-50 text-amber-700'
                        : 'border-slate-200 text-slate-600 hover:border-amber-300 hover:bg-amber-50/50'
                    )}
                  >
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                    {f.city} <span className="text-slate-400 font-normal">{f.state}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-2.5">
            <Label>Cidade da parada</Label>
            <CitySelect city={form.city} state={form.state}
              onChange={({ city, state, lat, lng }) => setForm({ city, state, lat, lng })} />
          </div>
          {form.city && (
            <button type="button" onClick={toggleFav}
              className={cn(
                'w-full flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-150',
                isFav ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-500 hover:border-amber-300 hover:bg-amber-50/40'
              )}
            >
              <Star className={cn('w-4 h-4 shrink-0', isFav ? 'text-amber-400 fill-amber-400' : 'text-slate-300')} />
              {isFav ? `${form.city} está nos favoritos — clique para remover` : `Salvar ${form.city} como favorito`}
            </button>
          )}
        </div>
        <DialogFooter>
          {editStopId && (
            <Button variant="destructive" size="sm" onClick={handleDelete} className="mr-auto gap-1.5">
              <Trash2 className="w-3.5 h-3.5" /> Remover
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!form.city}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <ConfirmDialog
      open={deleteConfirm}
      onOpenChange={setDeleteConfirm}
      title="Remover esta parada da rota?"
      description="Esta ação não pode ser desfeita."
      confirmLabel="Remover"
      onConfirm={doDeleteStop}
    />
    </>
  )
}

// ── Route list with stops ─────────────────────────────
function RouteList({ geoEvents, stops, onAddStop, onEditStop }) {
  const waypoints = useMemo(() => {
    const wps = []
    geoEvents.forEach(ev => {
      wps.push({ type: 'event', id: ev.id, city: ev.city, state: ev.state, name: ev.name, date: ev.date, lat: ev.lat, lng: ev.lng })
      const stop = stops.find(s => s.afterEventId === ev.id)
      if (stop) wps.push({ type: 'stop', id: stop.id, afterEventId: stop.afterEventId, city: stop.city, state: stop.state, lat: stop.lat, lng: stop.lng })
    })
    return wps
  }, [geoEvents, stops])

  if (geoEvents.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <Navigation className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Nenhum evento com localização neste período</p>
      </div>
    )
  }

  return (
    <div className="overflow-y-auto max-h-[50vh] lg:max-h-[calc(100vh-300px)] pr-1">
      {waypoints.map((wp, i) => {
        const next = waypoints[i + 1]
        const km = next && wp.lat != null && next.lat != null
          ? Math.round(haversine(wp.lat, wp.lng, next.lat, next.lng)) : null
        const hasStopAfter = wp.type === 'event' && stops.some(s => s.afterEventId === wp.id)
        const showAddBtn   = wp.type === 'event' && !hasStopAfter
        const showConnector = next != null || showAddBtn

        return (
          <div key={`${wp.type}-${wp.id}`}>
            {wp.type === 'event' ? (
              <div className="flex items-start gap-3 py-2.5">
                <div className="w-3 h-3 rounded-full border-2 border-orange-500 bg-orange-500/20 shrink-0 mt-1" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800 truncate">{wp.city}</div>
                  <div className="text-[10px] text-slate-400">{wp.state} · {wp.name}</div>
                  <div className="text-[10px] text-slate-400">
                    {new Date(wp.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 py-2 group">
                <div className="w-3 h-3 rounded-full border-2 border-slate-300 bg-white shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-slate-500 truncate flex items-center gap-1">
                    {wp.city}
                    <span className="text-slate-400 font-normal">({wp.state})</span>
                    <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full ml-0.5">Parada</span>
                  </div>
                </div>
                <button onClick={() => onEditStop(wp.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
            )}

            {showConnector && (
              <div className="flex items-center gap-2 ml-1.5 py-0.5" style={{ minHeight: 36 }}>
                <div className="flex flex-col items-center gap-1 shrink-0" style={{ width: 12 }}>
                  {[0, 1, 2, 3].map(d => (
                    <div key={d} className={cn('w-0.5 h-1.5 rounded-full', next ? 'bg-orange-300/60' : 'bg-slate-200')} />
                  ))}
                </div>
                {km != null && (
                  <span className="text-[10px] font-semibold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200 shrink-0">
                    {fmtKm(km)}
                  </span>
                )}
                {showAddBtn && (
                  <button onClick={() => onAddStop(wp.id)}
                    className="flex items-center gap-0.5 text-[10px] text-slate-300 hover:text-orange-400 transition-colors duration-200 font-medium select-none">
                    <Plus className="w-3 h-3" /> Parada
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

const STATUS_BTNS = [
  { value: 'pending', label: 'Pend.', active: 'bg-white text-orange-500 shadow-sm'   },
  { value: 'partial', label: 'Parc.', active: 'bg-white text-blue-500 shadow-sm'     },
  { value: 'paid',    label: 'Pago',  active: 'bg-white text-emerald-500 shadow-sm'  },
]

// ── Equipe: member pay row ────────────────────────────
function MemberPayRow({ evId, mid, event }) {
  const { members, getPayEntry, setPayEntry, addMemberPartialPayment, removeMemberPartialPayment, companyProfile } = useStore()
  const [dialog,   setDialog]   = useState(null)
  const [newAmount, setNewAmount] = useState(0)
  const [editing,  setEditing]  = useState(false)
  const [rawValue, setRawValue] = useState('')
  const [printing, setPrinting] = useState(false)

  const m = members.find(x => x.id === mid)
  if (!m) return null

  const entry          = getPayEntry(evId, mid)
  const baseCache      = m.cache ?? 0
  const curValue       = entry.customValue !== null ? entry.customValue : baseCache
  const isCustom       = entry.customValue !== null
  const status         = entry.paid ? 'paid' : (entry.partial ? 'partial' : 'pending')
  const partialPayments = entry.partialPayments || []
  const paidAmount     = partialPayments.reduce((s, p) => s + p.amount, 0)
  const remaining      = Math.max(0, curValue - paidAmount)
  const pct            = curValue > 0 ? Math.min(100, (paidAmount / curValue) * 100) : 0

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

  const executeTransition = (to) => {
    if (to === 'paid') {
      setPayEntry(evId, mid, { paid: true, partial: false, paidAt: new Date().toISOString() })
      toast.success(`${m.name} marcado como pago`)
    } else if (to === 'partial') {
      setPayEntry(evId, mid, { paid: false, partial: true, paidAt: null })
    } else if (to === 'pending') {
      setPayEntry(evId, mid, { paid: false, partial: false, paidAt: null, partialPayments: [] })
    }
    setDialog(null)
  }

  const confirmDialog = () => {
    if (!dialog) return
    if (dialog.to === 'partial' && dialog.from === 'pending') {
      setPayEntry(evId, mid, { paid: false, partial: true, paidAt: null })
      if (newAmount > 0) { addMemberPartialPayment(evId, mid, newAmount); setNewAmount(0) }
      setDialog(null)
    } else {
      executeTransition(dialog.to)
    }
  }

  const handleAddPartial = () => {
    if (!newAmount || newAmount <= 0) return
    const newTotal = paidAmount + newAmount
    addMemberPartialPayment(evId, mid, newAmount)
    setNewAmount(0)
    if (curValue > 0 && newTotal >= curValue) {
      setPayEntry(evId, mid, { paid: true, partial: false, paidAt: new Date().toISOString() })
      toast.success(`${m.name} — cachê quitado automaticamente!`)
    }
  }

  const handlePrint = async () => {
    setPrinting(true)
    try { await generateReceipt({ event, member: m, paidValue: curValue, companyProfile }) }
    catch { toast.error('Erro ao gerar PDF.') }
    finally { setPrinting(false) }
  }

  const startEdit = () => {
    setRawValue(curValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
    setEditing(true)
  }

  const saveEdit = () => {
    const v = parseBRL(rawValue)
    setPayEntry(evId, mid, { customValue: Math.abs(v - baseCache) > 0.001 ? v : null })
    setEditing(false)
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
      title: 'Confirmar pagamento',
      description: `Confirmar que ${m.name} recebeu ${fmtCurrency(curValue)} integralmente?`,
      confirmLabel: 'Confirmar pagamento',
    },
    'partial→paid': {
      iconType: 'confirm',
      title: 'Quitar cachê',
      description: `Já foram registrados ${fmtCurrency(paidAmount)} de forma parcial. Confirmar recebimento do saldo restante de ${fmtCurrency(remaining)}?`,
      confirmLabel: 'Confirmar quitação',
    },
    'partial→pending': {
      iconType: 'warning',
      title: 'Reverter para pendente',
      description: 'Atenção: o histórico de pagamentos parciais será apagado e o status voltará para pendente. Tem certeza?',
      confirmLabel: 'Sim, reverter',
    },
    'paid→partial': {
      iconType: 'warning',
      title: 'Reverter pagamento',
      description: `${m.name} está marcado como pago integralmente. Reverter para parcial irá remover a data de quitação. Tem certeza?`,
      confirmLabel: 'Sim, reverter',
    },
    'paid→pending': {
      iconType: 'warning',
      title: 'Reverter para pendente',
      description: `Atenção: ${m.name} está marcado como pago. Reverter irá apagar o histórico e datas de pagamento. Tem certeza?`,
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

      <div className="border-b border-slate-100 last:border-0">
        {/* Main row */}
        <div className="flex items-center gap-2.5 py-2.5 px-1">
          <Avatar init={m.init} color={m.color} size="sm" />

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{m.name}</p>
            <p className="text-[10px] text-slate-400">{m.role}</p>
          </div>

          {/* Value + inline edit */}
          <div className="flex items-center gap-0.5 shrink-0">
            {editing ? (
              <input
                type="text"
                value={rawValue}
                onChange={e => setRawValue(e.target.value.replace(/[^\d,.]/g, ''))}
                onBlur={saveEdit}
                onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(false) }}
                autoFocus
                className="w-20 rounded-md border border-orange-400 ring-2 ring-orange-500/20 px-2 py-0.5 text-xs font-semibold text-right text-slate-800 outline-none bg-orange-50/50"
              />
            ) : (
              <>
                <span className={cn('text-xs font-semibold tabular-nums', isCustom ? 'text-orange-500' : 'text-slate-500')}>
                  {fmtCurrency(curValue)}
                </span>
                <button onClick={startEdit} title="Editar valor para este evento"
                  className="p-0.5 rounded text-slate-200 hover:text-slate-400 transition-colors">
                  <Pencil className="w-2.5 h-2.5" />
                </button>
              </>
            )}
          </div>

          {/* Segmented pill */}
          <div className="flex bg-slate-100 rounded-lg p-0.5 shrink-0">
            {STATUS_BTNS.map(btn => (
              <button
                key={btn.value}
                onClick={() => openDialog(btn.value)}
                className={cn(
                  'px-2 py-1 rounded-md text-[10px] font-semibold transition-all duration-150 leading-none',
                  status === btn.value ? btn.active : 'text-slate-400 hover:text-slate-600'
                )}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Print receipt — only when paid */}
          {status === 'paid' && (
            <button
              onClick={handlePrint}
              disabled={printing}
              title="Gerar recibo de pagamento"
              className="p-1.5 rounded-lg text-slate-300 hover:text-orange-500 hover:bg-orange-50 transition-colors shrink-0 disabled:opacity-40"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Expanded state — animated */}
        <AnimatePresence initial={false}>
          {status === 'partial' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <div className="px-1 pb-3 space-y-2">
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
                    <div className="space-y-1 max-h-28 overflow-y-auto">
                      {partialPayments.map(pp => (
                        <div key={pp.id} className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-slate-700 tabular-nums">{fmtCurrency(pp.amount)}</span>
                            <span className="text-[10px] text-slate-400 ml-2">{fmtDateTime(pp.paidAt)}</span>
                          </div>
                          <button
                            onClick={() => removeMemberPartialPayment(evId, mid, pp.id)}
                            className="text-slate-300 hover:text-rose-400 transition-colors shrink-0"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {curValue > 0 && (
                    <>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-400 transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-blue-500 font-semibold tabular-nums">Pago: {fmtCurrency(paidAmount)}</span>
                        <span className={cn('tabular-nums', remaining <= 0 ? 'text-emerald-500 font-semibold' : 'text-slate-400')}>
                          {remaining <= 0 ? 'Quitado' : `Falta: ${fmtCurrency(remaining)}`}
                        </span>
                      </div>
                    </>
                  )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

// ── Equipe: event accordion row ───────────────────────
function EquipeEventRow({ ev }) {
  const { members, getPayEntry, setPayEntry } = useStore()
  const [open, setOpen] = useState(false)

  const evMembers = (ev.members || []).filter(mid => members.find(m => m.id === mid))
  const paidCount = evMembers.filter(mid => getPayEntry(ev.id, mid).paid).length
  const totalCache = evMembers.reduce((s, mid) => s + (members.find(x => x.id === mid)?.cache ?? 0), 0)
  const d = new Date(ev.date + 'T12:00:00')
  const allPaid = evMembers.length > 0 && paidCount === evMembers.length

  const markAllPaid = (e) => {
    e.stopPropagation()
    const now = new Date().toISOString()
    evMembers.forEach(mid => setPayEntry(ev.id, mid, { paid: true, partial: false, paidAt: now }))
    toast.success(`Todos os ${evMembers.length} membros marcados como pagos`)
  }

  return (
    <>
      <div
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-slate-100 transition-colors duration-150',
          open ? 'bg-orange-50/50' : 'hover:bg-slate-50'
        )}
      >
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2, ease: [0.4,0,0.2,1] }}>
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        </motion.div>
        <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex flex-col items-center justify-center shrink-0">
          <span className="text-xs font-bold text-orange-600 leading-none">{d.getDate()}</span>
          <span className="text-[8px] text-orange-400 uppercase">{MONTHS_SHORT[d.getMonth()]}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{ev.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Users className="w-3 h-3 text-slate-400" />
            <span className="text-xs text-slate-400">{evMembers.length} membro{evMembers.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-slate-700">{fmtCurrency(totalCache)}</p>
          <div className={cn('flex items-center gap-1 justify-end mt-0.5', allPaid ? 'text-emerald-500' : 'text-slate-400')}>
            {allPaid ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            <span className="text-[10px] font-semibold">{paidCount}/{evMembers.length}</span>
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: [0.4,0,0.2,1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-4 pb-2 pt-0.5 bg-slate-50/60 border-b border-slate-100">
              {evMembers.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-5">Nenhum membro escalado</p>
              ) : (
                <>
                  {evMembers.map(mid => <MemberPayRow key={mid} evId={ev.id} mid={mid} event={ev} />)}
                  {!allPaid && (
                    <button
                      onClick={markAllPaid}
                      className="mt-2 w-full text-[10px] font-medium text-slate-400 hover:text-emerald-500 transition-colors py-1"
                    >
                      Marcar todos como pago
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ── Custos: event accordion row ───────────────────────
function CustosEventRow({ ev, evExpenses, onAdd, onEdit, onDelete }) {
  const { contractors } = useStore()
  const [open, setOpen] = useState(false)
  const total = evExpenses.reduce((s, e) => s + (e.amount || 0), 0)
  const d = new Date(ev.date + 'T12:00:00')

  return (
    <>
      <div
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-slate-100 transition-colors duration-150',
          open ? 'bg-orange-50/50' : 'hover:bg-slate-50'
        )}
      >
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2, ease: [0.4,0,0.2,1] }}>
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        </motion.div>
        <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex flex-col items-center justify-center shrink-0">
          <span className="text-xs font-bold text-orange-600 leading-none">{d.getDate()}</span>
          <span className="text-[8px] text-orange-400 uppercase">{MONTHS_SHORT[d.getMonth()]}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{ev.name}</p>
          <p className="text-xs text-slate-400">{ev.city ? `${ev.city} · ${ev.state}` : ev.local}</p>
        </div>
        <div className="text-right shrink-0">
          <p className={cn('text-sm font-bold', total > 0 ? 'text-rose-500' : 'text-slate-300')}>
            {total > 0 ? `− ${fmtCurrency(total)}` : '—'}
          </p>
          <p className="text-[10px] text-slate-400">{evExpenses.length} item{evExpenses.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: [0.4,0,0.2,1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-4 py-3 bg-slate-50/60 border-b border-slate-100 space-y-3">
              {/* Category chips */}
              <div className="grid grid-cols-3 gap-2">
                {EXP_TYPES.map(type => {
                  const { Icon, color, bg, border } = EXP_STYLE[type]
                  const catTotal = evExpenses.filter(e => e.type === type).reduce((s, e) => s + (e.amount || 0), 0)
                  return (
                    <div key={type} className={cn('flex flex-col gap-1.5 p-2.5 rounded-xl border', bg, border)}>
                      <div className={cn('flex items-center gap-1.5', color)}>
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-[10px] font-semibold leading-none">{type}</span>
                      </div>
                      <span className={cn('text-sm font-bold tabular-nums', catTotal > 0 ? color : 'text-slate-300')}>
                        {catTotal > 0 ? fmtCurrency(catTotal) : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Individual records */}
              {evExpenses.length > 0 && (
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white overflow-hidden">
                  {evExpenses.map(exp => {
                    const { Icon, color } = EXP_STYLE[exp.type] || { Icon: Receipt, color: 'text-slate-400' }
                    const commissionNames = exp.type === 'Comissão'
                      ? (exp.commission_contractors || []).map(id => contractors.find(c => c.id === id)?.name).filter(Boolean)
                      : []
                    return (
                      <div key={exp.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 transition-colors group">
                        <Icon className={cn('w-3.5 h-3.5 shrink-0', color)} />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-slate-600 truncate block">{exp.description || exp.type}</span>
                          {commissionNames.length > 0 && (
                            <span className="text-[10px] text-rose-400 truncate block">{commissionNames.join(', ')}</span>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-rose-500 tabular-nums shrink-0">
                          − {fmtCurrency(exp.amount || 0)}
                        </span>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon-sm" variant="ghost" onClick={e => { e.stopPropagation(); onEdit(exp.id) }}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button size="icon-sm" variant="ghost"
                            className="text-red-400 hover:text-red-600 hover:bg-red-50"
                            onClick={e => { e.stopPropagation(); onDelete(exp.id) }}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}


            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ── Expense modal ─────────────────────────────────────
function ExpenseModal({ open, onOpenChange, editId, defaultEventId }) {
  const { events, expenses, addExpense, updateExpense, deleteExpense, contractors } = useStore()
  const BLANK = { eventId: '', type: 'Alimentação', amount: 0, date: '', description: '', commission_contractors: [] }
  const [form, setForm] = useState(BLANK)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  useMemo(() => {
    if (!open) return
    if (editId) {
      const e = expenses.find(x => x.id === editId)
      if (e) { setForm({ ...BLANK, ...e, eventId: String(e.eventId), commission_contractors: e.commission_contractors || [] }); return }
    }
    const defEvent = defaultEventId ? events.find(e => String(e.id) === String(defaultEventId)) : null
    setForm({ ...BLANK, eventId: defaultEventId ? String(defaultEventId) : '', date: defEvent?.date ?? '' })
  }, [open, editId, defaultEventId])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const sortedEvents = useMemo(() => [...events].sort((a, b) => a.date.localeCompare(b.date)), [events])

  const toggleCommissionContractor = (id) => {
    setForm(p => {
      const cur = p.commission_contractors || []
      return { ...p, commission_contractors: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] }
    })
  }

  const handleSave = () => {
    if (!form.eventId || !form.amount) { toast.error('Selecione o evento e informe o valor'); return }
    const payload = {
      ...form,
      eventId: form.eventId,
      amount: Number(form.amount),
      commission_contractors: form.type === 'Comissão' ? (form.commission_contractors || []) : [],
    }
    if (editId) { updateExpense(editId, payload); toast.success('Despesa atualizada!') }
    else        { addExpense(payload);            toast.success('Despesa adicionada!') }
    onOpenChange(false)
  }

  const handleDelete = () => setDeleteConfirm(true)
  const doDelete = () => { deleteExpense(editId); toast.success('Despesa excluída.'); onOpenChange(false) }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-y-visible flex flex-col max-h-[90dvh]">
        <DialogHeader className="shrink-0"><DialogTitle>{editId ? 'Editar Despesa' : 'Adicionar Despesa'}</DialogTitle></DialogHeader>
        <div className="px-6 py-2 space-y-4 overflow-y-auto min-h-0 flex-1">
          <div className="space-y-1.5">
            <Label className="pb-2 block">Evento *</Label>
            <Select value={String(form.eventId)} onValueChange={v => {
              const ev = events.find(e => String(e.id) === v)
              setForm(p => ({ ...p, eventId: v, date: ev?.date ?? p.date }))
            }}>
              <SelectTrigger><SelectValue placeholder="Selecione o evento..." /></SelectTrigger>
              <SelectContent>
                {sortedEvents.map(ev => (
                  <SelectItem key={ev.id} value={String(ev.id)}>{ev.name} — {fmtDate(ev.date)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="pb-2 block">Tipo de Despesa *</Label>
            <div className="grid grid-cols-3 gap-2">
              {EXP_TYPES.map(t => {
                const { Icon } = EXP_STYLE[t]
                return (
                  <button key={t} type="button" onClick={() => set('type', t)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-semibold transition-all duration-150',
                      form.type === t ? 'border-orange-400 bg-orange-50 text-orange-700 shadow-sm' : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                    )}>
                    <Icon className="w-4 h-4" />{t}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Contratante comissionado — só aparece quando tipo = Comissão */}
          {form.type === 'Comissão' && contractors.length > 0 && (
            <div className="space-y-1.5">
              <Label className="pb-2 block">Contratante comissionado</Label>
              <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                {contractors.map(c => {
                  const selected = (form.commission_contractors || []).includes(c.id)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCommissionContractor(c.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors duration-100',
                        selected ? 'bg-rose-50' : 'hover:bg-slate-50'
                      )}
                    >
                      <div className={cn(
                        'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                        selected ? 'border-rose-500 bg-rose-500' : 'border-slate-300'
                      )}>
                        {selected && <X className="w-2.5 h-2.5 text-white stroke-[3]" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{c.name}</p>
                        {c.company && <p className="text-[10px] text-slate-400 truncate">{c.company}</p>}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="space-y-1.5"><Label className="pb-2 block">Valor *</Label><CurrencyInput value={form.amount} onChange={v => set('amount', v)} /></div>
          <div className="space-y-1.5"><Label className="pb-2 block">Descrição</Label><Input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Ex: Almoço da equipe, Hotel 2 quartos..." /></div>
          <div className="space-y-1.5"><Label className="pb-2 block">Data</Label><DatePicker value={form.date} onChange={(v) => set('date', v)} placeholder="Selecione a data..." /></div>
        </div>
        <DialogFooter className="shrink-0">
          {editId && <Button variant="destructive" onClick={handleDelete} className="mr-auto gap-1.5 h-10 px-4"><Trash2 className="w-3.5 h-3.5" /> Excluir</Button>}
          <Button variant="outline" className="h-10 px-4" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="h-10 px-4" onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <ConfirmDialog
      open={deleteConfirm}
      onOpenChange={setDeleteConfirm}
      title="Excluir esta despesa?"
      description="Esta ação não pode ser desfeita."
      confirmLabel="Excluir"
      onConfirm={doDelete}
    />
    </>
  )
}

// ── Main page ─────────────────────────────────────────
export default function Logistics({ isLoading }) {
  const { events, expenses, stops, deleteExpense } = useStore()
  const [view, setView] = useState('month')

  const now = new Date()
  const [selYear,  setSelYear]  = useState(now.getFullYear())
  const [selMonth, setSelMonth] = useState(now.getMonth())

  const [stopModal,   setStopModal]   = useState(false)
  const [stopAfterEv, setStopAfterEv] = useState(null)
  const [editStopId,  setEditStopId]  = useState(null)

  const [expModal,         setExpModal]         = useState(false)
  const [editExpId,        setEditExpId]        = useState(null)
  const [expDefEventId,    setExpDefEventId]    = useState(null)
  const [deleteExpConfirm, setDeleteExpConfirm] = useState(null)

  const prevPeriod = () => {
    if (view === 'month') {
      if (selMonth === 0) { setSelYear(y => y - 1); setSelMonth(11) } else setSelMonth(m => m - 1)
    } else setSelYear(y => y - 1)
  }
  const nextPeriod = () => {
    if (view === 'month') {
      if (selMonth === 11) { setSelYear(y => y + 1); setSelMonth(0) } else setSelMonth(m => m + 1)
    } else setSelYear(y => y + 1)
  }

  const inPeriod = (dateStr) => {
    const d = new Date(dateStr + 'T12:00:00')
    if (view === 'year') return d.getFullYear() === selYear
    return d.getFullYear() === selYear && d.getMonth() === selMonth
  }

  const geoEvents = useMemo(() =>
    [...events].filter(e => e.city && e.lat != null && inPeriod(e.date))
               .sort((a, b) => a.date.localeCompare(b.date)),
  [events, view, selYear, selMonth])

  const periodEvents = useMemo(() =>
    [...events].filter(e => inPeriod(e.date)).sort((a, b) => a.date.localeCompare(b.date)),
  [events, view, selYear, selMonth])

  const totalKm = useMemo(() => {
    const wps = []
    geoEvents.forEach(ev => {
      wps.push({ lat: ev.lat, lng: ev.lng })
      const s = stops.find(s => s.afterEventId === ev.id)
      if (s && s.lat != null) wps.push({ lat: s.lat, lng: s.lng })
    })
    let total = 0
    for (let i = 1; i < wps.length; i++) {
      const a = wps[i - 1], b = wps[i]
      if (a.lat != null && b.lat != null) total += haversine(a.lat, a.lng, b.lat, b.lng)
    }
    return Math.round(total)
  }, [geoEvents, stops])

  const totalExpenses = useMemo(() =>
    expenses.filter(e => periodEvents.some(ev => ev.id === e.eventId))
            .reduce((s, e) => s + (e.amount || 0), 0),
  [expenses, periodEvents])

  const periodLabel = view === 'month' ? `${MONTHS[selMonth]} ${selYear}` : `${selYear}`

  const openAddStop  = (afterEventId) => { setStopAfterEv(afterEventId); setEditStopId(null); setStopModal(true) }
  const openEditStop = (id)           => { setEditStopId(id); setStopAfterEv(null); setStopModal(true) }
  const openAddExp   = (eventId = null) => { setEditExpId(null); setExpDefEventId(eventId); setExpModal(true) }
  const openEditExp  = (id)           => { setEditExpId(id); setExpDefEventId(null); setExpModal(true) }
  const handleDeleteExp = (id) => setDeleteExpConfirm(id)
  const doDeleteExp = () => { deleteExpense(deleteExpConfirm); toast.success('Despesa excluída.') }

  if (isLoading) return <LogisticsSkeleton />

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Despesas</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {totalKm > 0 ? `${fmtKm(totalKm)} percorridos · ` : ''}
            {fmtCurrency(totalExpenses)} em despesas no período
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            {['month', 'year'].map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 ${view === v ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {v === 'month' ? 'Mensal' : 'Anual'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
            <button onClick={prevPeriod} className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"><ChevronLeft className="w-3.5 h-3.5" /></button>
            <span className="text-xs font-semibold text-slate-700 min-w-[110px] text-center">{periodLabel}</span>
            <button onClick={nextPeriod} className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"><ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </div>

      {/* Map + Route */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3 rounded-2xl overflow-hidden">
          <CardContent className="p-0" style={{ height: 420 }}>
            <div className="w-full h-full bg-slate-900 rounded-2xl">
              <Suspense fallback={<Skeleton className="w-full h-full rounded-2xl" />}>
                <BrazilMap events={geoEvents} />
              </Suspense>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 rounded-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Rota de Cidades</CardTitle>
              {totalKm > 0 && (
                <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-lg px-2.5 py-1">
                  <MapPin className="w-3 h-3 text-orange-500" />
                  <span className="text-xs font-bold text-orange-600">{fmtKm(totalKm)}</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <RouteList geoEvents={geoEvents} stops={stops} onAddStop={openAddStop} onEditStop={openEditStop} />
          </CardContent>
        </Card>
      </div>

      {/* Bottom: two panels side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Left: Equipe e Cachês */}
        <Card className="rounded-2xl overflow-hidden">
          <CardHeader className="pb-0 border-b border-slate-100">
            <div className="flex items-center justify-between pb-4">
              <div>
                <CardTitle>Equipe e Cachês</CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">Confirme os pagamentos por evento</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center">
                <Users className="w-4 h-4 text-orange-500" />
              </div>
            </div>
          </CardHeader>

          <div className="flex items-center gap-3 px-4 py-2 bg-slate-50/80 border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            <div className="w-4 shrink-0" /><div className="w-9 shrink-0" />
            <span className="flex-1">Evento</span>
            <span className="shrink-0 text-right">Cachês</span>
          </div>

          {periodEvents.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum evento neste período</p>
            </div>
          ) : (
            periodEvents.map(ev => <EquipeEventRow key={ev.id} ev={ev} />)
          )}
        </Card>

        {/* Right: Custos Variáveis */}
        <Card className="rounded-2xl overflow-hidden">
          <CardHeader className="pb-0 border-b border-slate-100">
            <div className="flex items-center justify-between pb-4">
              <div>
                <CardTitle>Custos Variáveis</CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">Alimentação, hospedagem e combustível</p>
              </div>
              <Button onClick={() => openAddExp(null)} size="sm" className="gap-1.5 h-8">
                <Plus className="w-3.5 h-3.5" /> Nova despesa
              </Button>
            </div>
          </CardHeader>

          <div className="flex items-center gap-3 px-4 py-2 bg-slate-50/80 border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            <div className="w-4 shrink-0" /><div className="w-9 shrink-0" />
            <span className="flex-1">Evento</span>
            <span className="shrink-0 text-right">Total</span>
          </div>

          {periodEvents.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum evento neste período</p>
            </div>
          ) : (
            periodEvents.map(ev => (
              <CustosEventRow
                key={ev.id}
                ev={ev}
                evExpenses={expenses.filter(e => e.eventId === ev.id)}
                onAdd={openAddExp}
                onEdit={openEditExp}
                onDelete={handleDeleteExp}
              />
            ))
          )}
        </Card>
      </div>

      {/* Modals */}
      <StopModal
        key={stopModal ? `stop-${editStopId ?? stopAfterEv ?? 'new'}` : 'stop-closed'}
        open={stopModal} onOpenChange={setStopModal}
        afterEventId={stopAfterEv} editStopId={editStopId}
      />
      <ExpenseModal
        key={expModal ? `exp-${editExpId ?? 'new'}` : 'exp-closed'}
        open={expModal} onOpenChange={setExpModal}
        editId={editExpId} defaultEventId={expDefEventId}
      />
      <ConfirmDialog
        open={deleteExpConfirm !== null}
        onOpenChange={(v) => { if (!v) setDeleteExpConfirm(null) }}
        title="Excluir esta despesa?"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={doDeleteExp}
      />
    </div>
  )
}

function LogisticsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><Skeleton className="h-8 w-32" /><Skeleton className="h-9 w-52" /></div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Skeleton className="lg:col-span-3 h-[420px] rounded-2xl" />
        <Skeleton className="lg:col-span-2 h-[420px] rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  )
}
