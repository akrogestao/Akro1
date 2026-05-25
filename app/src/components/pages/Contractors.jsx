import { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react'
import { useUnsavedGuard } from '@/hooks/useUnsavedGuard'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Building2, Phone, Mail, MapPin, Plus, Pencil, Trash2, X,
  Search, TrendingUp, Users, BarChart3, CalendarDays, Calendar, DollarSign, Eye,
} from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import CitySelect from '@/components/shared/CitySelect'
import PhoneInput from '@/components/shared/PhoneInput'
import { useStore } from '@/hooks/useStore'
import { fmtCurrency, fmtDate, fmtCurrencyShort } from '@/lib/format'
import { cn } from '@/lib/utils'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

const BrazilMap = lazy(() => import('@/components/shared/BrazilMap'))

// ── Helpers ───────────────────────────────────────────────
function calcStats(contractor, allEvents, allExpenses, allMembers) {
  const linked = allEvents.filter(ev => (ev.contractorIds || []).includes(contractor.id))
  const ltv = linked.reduce((s, e) => s + (e.value || 0), 0)
  const ticket = linked.length ? ltv / linked.length : 0
  const caches = linked.reduce((s, ev) =>
    s + (ev.members || []).reduce((cs, mid) => cs + (allMembers.find(m => m.id === mid)?.cache ?? 0), 0), 0)
  const varExp = allExpenses.filter(exp => linked.some(ev => ev.id === exp.eventId))
    .reduce((s, exp) => s + (exp.amount || 0), 0)
  const profit = ltv - caches - varExp
  const margin = ltv > 0 ? Math.round((profit / ltv) * 100) : 0
  return { linked, ltv, ticket, caches, varExp, profit, margin }
}

// ── ContractorModal ───────────────────────────────────────
const BLANK_FORM = { name: '', company: '', role: '', phone: '', email: '', city: '', state: '', lat: null, lng: null, notes: '' }

function ContractorModal({ open, onOpenChange, editId }) {
  const { contractors, addContractor, updateContractor, deleteContractor } = useStore()
  const [form, setForm] = useState(BLANK_FORM)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const initialRef = useRef(BLANK_FORM)

  useEffect(() => {
    if (!open) return
    if (editId) {
      const c = contractors.find(x => x.id === editId)
      const state = c ? { ...BLANK_FORM, ...c } : BLANK_FORM
      setForm(state)
      initialRef.current = state
    } else {
      setForm(BLANK_FORM)
      initialRef.current = BLANK_FORM
    }
  }, [open, editId, contractors])

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialRef.current),
    [form]
  )
  const { guard, UnsavedDialog } = useUnsavedGuard(isDirty)
  const handleClose = () => guard(() => onOpenChange(false))

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error('O nome do contratante é obrigatório.'); return
    }
    if (editId) {
      updateContractor(editId, form)
      toast.success('Contratante atualizado!')
    } else {
      addContractor(form)
      toast.success('Contratante adicionado!')
    }
    onOpenChange(false)
  }

  const handleDelete = () => setDeleteConfirm(true)
  const doDelete = () => { deleteContractor(editId); toast.success('Contratante excluído.'); onOpenChange(false) }

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => { if (v) onOpenChange(v); else handleClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editId ? 'Editar Contratante' : 'Novo Contratante'}</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-2 space-y-4">
          {/* Nome da pessoa */}
          <div className="space-y-1.5">
            <Label className="pb-2 block">Nome *</Label>
            <Input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Ex: Carlos Mendes"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Empresa / Local que representa */}
            <div className="space-y-1.5">
              <Label className="pb-2 block">Empresa / Local</Label>
              <Input
                value={form.company}
                onChange={e => set('company', e.target.value)}
                placeholder="Ex: Bar Noturno SP"
              />
            </div>
            {/* Cargo / Função */}
            <div className="space-y-1.5">
              <Label className="pb-2 block">Cargo / Função</Label>
              <Input
                value={form.role}
                onChange={e => set('role', e.target.value)}
                placeholder="Ex: Produtor, Gerente"
              />
            </div>
          </div>

          {/* Cidade */}
          <div className="space-y-1.5">
            <Label className="pb-2 block">Cidade</Label>
            <CitySelect
              city={form.city}
              state={form.state}
              onChange={({ city, state, lat, lng }) => setForm(p => ({ ...p, city, state, lat, lng }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Telefone */}
            <div className="space-y-1.5">
              <Label className="pb-2 block">Telefone</Label>
              <PhoneInput
                value={form.phone}
                onChange={v => set('phone', v)}
              />
            </div>
            {/* Email */}
            <div className="space-y-1.5">
              <Label className="pb-2 block">E-mail</Label>
              <Input
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="contato@exemplo.com"
              />
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label className="pb-2 block">Observações</Label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Preferências, histórico, forma de contato..."
              rows={3}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all duration-150"
            />
          </div>

        </div>

        <DialogFooter>
          {editId && (
            <Button variant="destructive" onClick={handleDelete} className="mr-auto gap-1.5 h-10 px-4">
              <Trash2 className="w-3.5 h-3.5" /> Excluir
            </Button>
          )}
          <Button variant="outline" className="h-10 px-4" onClick={handleClose}>Cancelar</Button>
          <Button className="h-10 px-4" onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <ConfirmDialog
      open={deleteConfirm}
      onOpenChange={setDeleteConfirm}
      title="Excluir este contratante permanentemente?"
      description="Esta ação não pode ser desfeita."
      confirmLabel="Excluir"
      onConfirm={doDelete}
    />
    {UnsavedDialog}
    </>
  )
}

// ── ContractorDrawer ──────────────────────────────────────
function ContractorDrawer({ contractor, onClose, onEdit }) {
  const { events, expenses, members } = useStore()
  const stats = contractor ? calcStats(contractor, events, expenses, members) : null

  return createPortal(
    <AnimatePresence>
      {contractor && stats && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Drawer panel */}
          <motion.div
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
            className="fixed right-0 inset-y-0 h-full w-full max-w-sm bg-white border-l border-slate-200 flex flex-col z-50 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 truncate">{contractor.name}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {contractor.role && (
                    <span className="text-xs text-slate-500">{contractor.role}</span>
                  )}
                  {contractor.company && (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      <Building2 className="w-3 h-3" />
                      {contractor.company}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={onClose} className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Contact info */}
              <div className="space-y-2">
                {contractor.city && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{contractor.city}, {contractor.state}</span>
                  </div>
                )}
                {contractor.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{contractor.phone}</span>
                  </div>
                )}
                {contractor.email && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{contractor.email}</span>
                  </div>
                )}
              </div>

              {/* Key metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-orange-50 rounded-xl p-3 text-center border border-orange-100">
                  <p className="text-[10px] font-semibold text-orange-400 uppercase tracking-wide mb-1">LTV Total</p>
                  <p className="text-2xl font-bold text-orange-600">{fmtCurrencyShort(stats.ltv)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Ticket Médio</p>
                  <p className="text-xl font-bold text-slate-700">{fmtCurrencyShort(stats.ticket)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Shows</p>
                  <p className="text-xl font-bold text-slate-700">{stats.linked.length}</p>
                </div>
                <div className={cn('rounded-xl p-3 text-center border', stats.margin >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100')}>
                  <p className={cn('text-[10px] font-semibold uppercase tracking-wide mb-1', stats.margin >= 0 ? 'text-emerald-400' : 'text-red-400')}>Margem</p>
                  <p className={cn('text-xl font-bold', stats.margin >= 0 ? 'text-emerald-600' : 'text-red-600')}>{stats.margin}%</p>
                </div>
              </div>

              {/* Events */}
              {stats.linked.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Eventos</h3>
                  <div className="space-y-2">
                    {[...stats.linked].sort((a, b) => b.date.localeCompare(a.date)).map(ev => {
                      const evExpenses = expenses.filter(e => e.eventId === ev.id).reduce((s, e) => s + (e.amount || 0), 0)
                      const evCaches = (ev.members || []).reduce((s, mid) => s + (members.find(m => m.id === mid)?.cache ?? 0), 0)
                      const evProfit = ev.value - evCaches - evExpenses
                      return (
                        <div key={ev.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">{ev.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{fmtDate(ev.date)}</p>
                          </div>
                          <div className="text-right shrink-0 ml-3">
                            <p className="text-xs font-semibold text-emerald-600">{fmtCurrencyShort(ev.value)}</p>
                            <p className={cn('text-[10px] font-medium', evProfit >= 0 ? 'text-orange-500' : 'text-red-500')}>
                              {evProfit >= 0 ? '+' : ''}{fmtCurrencyShort(evProfit)}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Notes */}
              {contractor.notes && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Observações</h3>
                  <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-3 border border-slate-100">
                    {contractor.notes}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}

// ── RankingChart ──────────────────────────────────────────
function RankingChart({ contractors, allEvents }) {
  const ranked = [...contractors]
    .map(c => ({
      ...c,
      count: allEvents.filter(ev => (ev.contractorIds || []).includes(c.id)).length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  const maxCount = ranked[0]?.count || 1

  return (
    <div className="space-y-2.5">
      {ranked.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">Nenhum dado disponível</p>
      ) : (
        ranked.map((c, i) => (
          <div key={c.id} className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between mb-1">
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-slate-800 truncate block">{c.name}</span>
                  <span className="text-[10px] text-slate-400">{c.company || c.role || '—'}</span>
                </div>
                <span className="text-xs font-bold text-orange-600 ml-2 shrink-0">
                  {c.count} show{c.count !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-orange-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(c.count / maxCount) * 100}%` }}
                  transition={{ duration: 0.5, delay: i * 0.07, ease: [0.4, 0, 0.2, 1] }}
                />
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────
export default function Contractors({ isLoading }) {
  const { contractors, events, expenses, members, deleteContractor } = useStore()
  const [modalOpen,            setModalOpen]            = useState(false)
  const [editId,               setEditId]               = useState(null)
  const [drawerContractor,     setDrawerContractor]     = useState(null)
  const [search,               setSearch]               = useState('')
  const [deleteConfirmId,      setDeleteConfirmId]      = useState(null)

  const openAdd = () => { setEditId(null); setModalOpen(true) }
  const openEdit = (id) => { setEditId(id); setModalOpen(true) }

  const handleDelete = (e, id) => { e.stopPropagation(); setDeleteConfirmId(id) }

  const doDelete = () => {
    deleteContractor(deleteConfirmId)
    toast.success('Contratante excluído.')
    if (drawerContractor?.id === deleteConfirmId) setDrawerContractor(null)
  }

  const filtered = contractors.filter(c =>
    !search.trim() ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.company || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.role || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.city || '').toLowerCase().includes(search.toLowerCase())
  )

  // Global stats
  const allStats = contractors.map(c => calcStats(c, events, expenses, members))
  const totalLtv    = allStats.reduce((s, st) => s + st.ltv, 0)
  const totalShows  = allStats.reduce((s, st) => s + st.linked.length, 0)
  const avgTicket   = contractors.length > 0 ? totalLtv / Math.max(1, totalShows) : 0

  if (isLoading) return <ContractorsSkeleton />

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Contratantes</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {contractors.length} contratante{contractors.length !== 1 ? 's' : ''} cadastrado{contractors.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo Contratante</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Contratantes', value: contractors.length, icon: Users,       fmt: v => v,                          color: 'text-slate-700' },
          { label: 'LTV Total',          value: totalLtv,           icon: TrendingUp,  fmt: v => fmtCurrencyShort(v),        color: 'text-orange-600' },
          { label: 'Ticket Médio Geral', value: avgTicket,          icon: BarChart3,   fmt: v => fmtCurrencyShort(v),        color: 'text-slate-700' },
          { label: 'Shows Realizados',   value: totalShows,         icon: CalendarDays,fmt: v => v,                          color: 'text-slate-700' },
        ].map(({ label, value, icon: Icon, fmt, color }) => (
          <Card key={label} className="rounded-2xl">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-orange-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide truncate">{label}</p>
                <p className={cn('text-lg font-bold leading-none mt-1', color)}>{fmt(value)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart + Map grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="rounded-2xl lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-orange-500" />
              Ranking por Shows
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-4">
            <RankingChart contractors={contractors} allEvents={events} />
          </CardContent>
        </Card>

        <Card className="rounded-2xl lg:col-span-2 overflow-hidden">
          <div className="h-[280px] bg-slate-900">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-slate-500 text-xs">Carregando mapa...</div>}>
              <BrazilMap events={contractors} />
            </Suspense>
          </div>
        </Card>
      </div>

      {/* Search + table */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar contratante..."
              className="pl-9"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">
              {search ? 'Nenhum contratante encontrado' : 'Nenhum contratante cadastrado'}
            </p>
            {!search && (
              <p className="text-sm mt-1">Clique em "Novo Contratante" para começar</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(c => {
              const st = calcStats(c, events, expenses, members)
              return (
                <div key={c.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
                  <div className="p-4 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 truncate">{c.name}</p>
                        {c.company && (
                          <p className="text-xs text-slate-500 truncate mt-0.5">{c.company}</p>
                        )}
                        {c.city && (
                          <div className="flex items-center gap-1 mt-2">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="text-xs text-slate-500 truncate">
                              {c.city}{c.state ? `, ${c.state}` : ''}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0 -mt-1 -mr-1">
                        <Button
                          size="icon-sm" variant="ghost"
                          onClick={e => { e.stopPropagation(); openEdit(c.id) }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon-sm" variant="ghost"
                          className="text-red-400 hover:text-red-600 hover:bg-red-50"
                          onClick={e => handleDelete(e, c.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-orange-500 shrink-0" />
                        <span className="text-xs font-semibold text-slate-300 leading-none">{st.linked.length} shows</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-3 h-3 text-green-500 shrink-0" />
                        <span className="text-xs font-semibold text-slate-300 leading-none">{fmtCurrencyShort(st.ltv)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setDrawerContractor(c)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Ver detalhes
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      <ContractorModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        editId={editId}
      />

      {/* Drawer */}
      <ContractorDrawer
        contractor={drawerContractor}
        onClose={() => setDrawerContractor(null)}
        onEdit={() => {
          setEditId(drawerContractor.id)
          setModalOpen(true)
          setDrawerContractor(null)
        }}
      />
      <ConfirmDialog
        open={deleteConfirmId !== null}
        onOpenChange={(v) => { if (!v) setDeleteConfirmId(null) }}
        title="Excluir este contratante permanentemente?"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={doDelete}
      />
    </div>
  )
}

function ContractorsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-44" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Skeleton className="h-48 rounded-2xl lg:col-span-3" />
        <Skeleton className="h-48 rounded-2xl lg:col-span-2" />
      </div>
      <div className="rounded-2xl overflow-hidden border border-slate-100">
        {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-none border-b border-slate-100" />)}
      </div>
    </div>
  )
}
