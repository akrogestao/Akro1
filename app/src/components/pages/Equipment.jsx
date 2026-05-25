import { useState, useMemo, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  Package, Plus, Search, X, Pencil, Trash2, AlertTriangle,
  CheckCircle2, ChevronDown, Download, Lock,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { useStore } from '@/hooks/useStore'
import { usePlanLimits } from '@/hooks/usePlanLimits'
import UpgradeModal from '@/components/shared/UpgradeModal'
import { generateBacklineReport } from '@/lib/pdfGenerator'
import { fmtDate } from '@/lib/format'
import { cn } from '@/lib/utils'

// ── Constants ─────────────────────────────────────────────
const CATEGORIES = ['Som', 'Instrumento', 'Cabo', 'Iluminação', 'Acessório', 'Outro']
const CONDITIONS  = ['Ótimo', 'Bom', 'Regular', 'Precisando de reparo']

const CATEGORY_STYLES = {
  'Som':                 'bg-blue-100 text-blue-700 border-blue-200',
  'Instrumento':         'bg-orange-100 text-orange-700 border-orange-200',
  'Cabo':                'bg-slate-100 text-slate-600 border-slate-200',
  'Iluminação':          'bg-amber-100 text-amber-700 border-amber-200',
  'Acessório':           'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Outro':               'bg-gray-100 text-gray-600 border-gray-200',
}

const CONDITION_STYLES = {
  'Ótimo':               'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Bom':                 'bg-blue-100 text-blue-700 border-blue-200',
  'Regular':             'bg-amber-100 text-amber-700 border-amber-200',
  'Precisando de reparo':'bg-red-100 text-red-700 border-red-200',
}

// ── Helpers ───────────────────────────────────────────────
function CategoryBadge({ category }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', CATEGORY_STYLES[category] || CATEGORY_STYLES['Outro'])}>
      {category}
    </span>
  )
}

function ConditionBadge({ condition }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', CONDITION_STYLES[condition] || CONDITION_STYLES['Regular'])}>
      {condition}
    </span>
  )
}

function fmtDateTime(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// ── EquipmentDialog ───────────────────────────────────────
const BLANK = { name: '', category: 'Som', condition: 'Ótimo', description: '', serialNumber: '', notes: '' }

function EquipmentDialog({ open, onOpenChange, editItem, onSave, onDelete }) {
  const [form, setForm] = useState(BLANK)
  const [delConfirm, setDelConfirm] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(editItem
      ? { name: editItem.name, category: editItem.category, condition: editItem.condition,
          description: editItem.description || '', serialNumber: editItem.serialNumber || '', notes: editItem.notes || '' }
      : BLANK)
  }, [open, editItem])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('O nome é obrigatório'); return }
    onSave({ ...form, name: form.name.trim() })
    onOpenChange(false)
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-y-visible">
        <DialogHeader>
          <DialogTitle>{editItem ? 'Editar Equipamento' : 'Adicionar Equipamento'}</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-2 space-y-4 max-h-[calc(85vh-180px)] overflow-y-auto">
          <div className="space-y-1.5">
            <Label className="pb-2 block">Nome *</Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: Caixa de som JBL" autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="pb-2 block">Categoria</Label>
              <Select value={form.category} onValueChange={v => set('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="pb-2 block">Estado</Label>
              <Select value={form.condition} onValueChange={v => set('condition', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="pb-2 block">Número de série</Label>
            <Input value={form.serialNumber} onChange={e => set('serialNumber', e.target.value)} placeholder="SN-00000" />
          </div>

          <div className="space-y-1.5">
            <Label className="pb-2 block">Descrição</Label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Descrição opcional do equipamento…" rows={2}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all duration-150" />
          </div>

          <div className="space-y-1.5">
            <Label className="pb-2 block">Notas</Label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Observações, histórico de manutenção…" rows={3}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all duration-150" />
          </div>
        </div>

        <DialogFooter>
          {editItem && (
            <Button variant="destructive" onClick={() => setDelConfirm(true)} className="mr-auto gap-1.5 h-10 px-4">
              <Trash2 className="w-3.5 h-3.5" /> Excluir
            </Button>
          )}
          <Button variant="outline" className="h-10 px-4" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="h-10 px-4" onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      open={delConfirm}
      onOpenChange={setDelConfirm}
      title="Excluir este equipamento?"
      description="Ele será removido de todas as listas de show. Esta ação não pode ser desfeita."
      confirmLabel="Excluir"
      onConfirm={() => { onDelete(editItem.id); onOpenChange(false) }}
    />
    </>
  )
}

// ── EquipmentCard ─────────────────────────────────────────
function EquipmentCard({ item, onEdit, onDelete }) {
  return (
    <div className="group relative bg-white border border-slate-200 rounded-2xl p-4 hover:border-orange-200 hover:shadow-sm transition-all duration-150">
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <Button size="icon-sm" variant="ghost" onClick={() => onEdit(item)}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button size="icon-sm" variant="ghost"
          className="text-red-400 hover:text-red-600 hover:bg-red-50"
          onClick={() => onDelete(item.id)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="pr-16">
        <h3 className="font-semibold text-slate-900 truncate">{item.name}</h3>
        {item.serialNumber && (
          <p className="text-xs text-slate-400 mt-0.5 truncate">S/N: {item.serialNumber}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mt-3">
        <CategoryBadge category={item.category} />
        <ConditionBadge condition={item.condition} />
      </div>

      {item.description && (
        <p className="text-xs text-slate-500 mt-2.5 line-clamp-2 leading-relaxed">{item.description}</p>
      )}
    </div>
  )
}

// ── KpiCard ───────────────────────────────────────────────
function KpiCard({ label, value, sub, alert }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-4">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className={cn('font-bold mt-1.5 text-2xl', alert ? 'text-red-500' : 'text-slate-900')}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>}
      </CardContent>
    </Card>
  )
}

// ── InventoryTab ──────────────────────────────────────────
function InventoryTab({ equipment }) {
  const { addEquipment, updateEquipment, deleteEquipment, showEquipment: showEqList } = useStore()
  const [search,      setSearch]      = useState('')
  const [catFilter,   setCatFilter]   = useState([])
  const [condFilter,  setCondFilter]  = useState('')
  const [dialogOpen,  setDialogOpen]  = useState(false)
  const [editItem,    setEditItem]    = useState(null)
  const [delId,       setDelId]       = useState(null)

  // KPI: top category
  const topCategory = useMemo(() => {
    if (!equipment.length) return null
    const counts = {}
    equipment.forEach(e => { counts[e.category] = (counts[e.category] || 0) + 1 })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  }, [equipment])

  const needsRepair = useMemo(() => equipment.filter(e => e.condition === 'Precisando de reparo').length, [equipment])

  const showsWithEquipment = useMemo(() =>
    showEqList.filter(se => se.equipmentIds?.length > 0).length,
  [showEqList])

  const filtered = useMemo(() => {
    let r = equipment
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(e => e.name.toLowerCase().includes(q))
    }
    if (catFilter.length > 0) r = r.filter(e => catFilter.includes(e.category))
    if (condFilter) r = r.filter(e => e.condition === condFilter)
    return r
  }, [equipment, search, catFilter, condFilter])

  const toggleCat = (cat) =>
    setCatFilter(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])

  const handleSave = (data) => {
    if (editItem) {
      updateEquipment(editItem.id, data)
      toast.success('Equipamento atualizado!')
    } else {
      addEquipment(data)
      toast.success('Equipamento adicionado!')
    }
  }

  const handleDelete = (id) => {
    deleteEquipment(id)
    toast.success('Equipamento excluído.')
    setDelId(null)
  }

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total de equipamentos" value={equipment.length} />
        <KpiCard
          label="Categoria com mais itens"
          value={topCategory ? topCategory[0] : '—'}
          sub={topCategory ? `${topCategory[1]} item${topCategory[1] !== 1 ? 's' : ''}` : null}
        />
        <KpiCard
          label="Precisando de reparo"
          value={needsRepair}
          sub={needsRepair > 0 ? 'atenção necessária' : 'tudo em ordem'}
          alert={needsRepair > 0}
        />
        <KpiCard
          label="Shows com equipamentos"
          value={showsWithEquipment}
          sub="shows com lista definida"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-1.5 bg-white flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome…"
            className="text-xs outline-none text-slate-700 placeholder:text-slate-400 w-full bg-transparent" />
          {search && (
            <button onClick={() => setSearch('')} className="text-slate-300 hover:text-slate-500">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <Select value={condFilter} onValueChange={v => setCondFilter(v === '__all__' ? '' : v)}>
          <SelectTrigger className="w-44 h-[34px] text-xs">
            <SelectValue placeholder="Todos os estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os estados</SelectItem>
            {CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Button onClick={() => { setEditItem(null); setDialogOpen(true) }} className="gap-1.5 shrink-0">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Adicionar equipamento</span>
          <span className="sm:hidden">Adicionar</span>
        </Button>
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => toggleCat(cat)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium border transition-all duration-150',
              catFilter.includes(cat)
                ? 'bg-orange-500 border-orange-500 text-white'
                : cn(CATEGORY_STYLES[cat], 'hover:opacity-80'),
            )}>
            {cat}
          </button>
        ))}
        {catFilter.length > 0 && (
          <button onClick={() => setCatFilter([])}
            className="px-3 py-1 rounded-full text-xs font-medium border border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-400 transition-all duration-150">
            Limpar
          </button>
        )}
      </div>

      {/* Grid */}
      {equipment.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Nenhum equipamento cadastrado</p>
          <p className="text-xs mt-1">Clique em "Adicionar equipamento" para começar</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14 text-slate-400">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhum equipamento encontrado</p>
          <button onClick={() => { setSearch(''); setCatFilter([]); setCondFilter('') }}
            className="mt-2 text-xs text-orange-500 hover:underline">Limpar filtros</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(item => (
            <EquipmentCard key={item.id} item={item}
              onEdit={item => { setEditItem(item); setDialogOpen(true) }}
              onDelete={id => setDelId(id)}
            />
          ))}
        </div>
      )}

      <EquipmentDialog
        open={dialogOpen}
        onOpenChange={v => { setDialogOpen(v); if (!v) setEditItem(null) }}
        editItem={editItem}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      <ConfirmDialog
        open={delId !== null}
        onOpenChange={v => { if (!v) setDelId(null) }}
        title="Excluir este equipamento?"
        description="Ele será removido de todas as listas de show. Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={() => handleDelete(delId)}
      />
    </div>
  )
}

// ── ShowEquipmentTab ──────────────────────────────────────
function ShowEquipmentTab({ equipment }) {
  const { events, setShowEquipment, getShowEquipment, showEquipment: showEqList, companyProfile } = useStore()
  const [selEventId, setSelEventId]   = useState(null)
  const [localIds,   setLocalIds]     = useState([])
  const [libSearch,  setLibSearch]    = useState('')
  const [libCat,     setLibCat]       = useState('')
  const [notes,      setNotes]        = useState('')
  const [editing,    setEditing]      = useState(false)

  const eligibleEvents = useMemo(() => {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    return [...events]
      .filter(ev => new Date(ev.date + 'T12:00:00') >= cutoff)
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [events])

  // Auto-select the nearest upcoming event
  useEffect(() => {
    if (selEventId !== null || !eligibleEvents.length) return
    const upcoming = eligibleEvents.find(e => new Date(e.date + 'T12:00:00') >= new Date())
    setSelEventId(upcoming ? upcoming.id : eligibleEvents[eligibleEvents.length - 1].id)
  }, [eligibleEvents])

  const record = selEventId ? getShowEquipment(selEventId) : null

  // Sync local state when event changes
  useEffect(() => {
    if (!selEventId) return
    const rec = getShowEquipment(selEventId)
    setLocalIds(rec?.equipmentIds ?? [])
    setNotes(rec?.notes ?? '')
    setEditing(!rec)
  }, [selEventId])

  const eqMap = useMemo(() => Object.fromEntries(equipment.map(e => [e.id, e])), [equipment])

  const selectedItems   = localIds.map(id => eqMap[id]).filter(Boolean)
  const availableItems  = useMemo(() => {
    return equipment.filter(e => {
      if (localIds.includes(e.id)) return false
      if (libCat && e.category !== libCat) return false
      if (libSearch.trim()) {
        const q = libSearch.toLowerCase()
        if (!e.name.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [equipment, localIds, libSearch, libCat])

  const handleAdd    = (id) => setLocalIds(prev => [...prev, id])
  const handleRemove = (id) => setLocalIds(prev => prev.filter(i => i !== id))

  const handleConfirm = () => {
    setShowEquipment(selEventId, localIds, { checkedAt: new Date().toISOString(), notes })
    toast.success('Lista confirmada!')
    setEditing(false)
  }

  const handleExportPdf = async () => {
    try {
      await generateBacklineReport({
        eventId: selEventId,
        state: { events, showEquipment: showEqList, equipment, companyProfile },
      })
    } catch {
      toast.error('Erro ao gerar PDF do backline')
    }
  }

  const handleSaveNotes = () => {
    setShowEquipment(selEventId, localIds, { notes, checkedAt: record?.checkedAt ?? null })
    toast.success('Observações salvas.')
  }

  const selectedEvent = events.find(e => e.id === selEventId) || null

  return (
    <div className="space-y-5">
      {/* Event picker */}
      <Card className="rounded-2xl">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Label className="shrink-0">Evento</Label>
            {eligibleEvents.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Nenhum evento nos últimos 90 dias ou futuro.</p>
            ) : (
              <Select value={selEventId ? String(selEventId) : ''}
                onValueChange={v => setSelEventId(Number(v))}>
                <SelectTrigger className="flex-1 min-w-[200px]">
                  <SelectValue placeholder="Selecione um evento…" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleEvents.map(ev => (
                    <SelectItem key={ev.id} value={String(ev.id)}>
                      {ev.name} — {fmtDate(ev.date)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {selEventId && (
        <>
          {/* Confirmed banner */}
          {record?.checkedAt && !editing && (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <p className="text-sm text-emerald-700 flex-1">
                Lista confirmada em <span className="font-semibold">{fmtDateTime(record.checkedAt)}</span>
              </p>
              <Button size="sm" variant="outline" className="h-7 text-xs shrink-0 gap-1.5"
                onClick={handleExportPdf}>
                <Download className="w-3 h-3" /> Exportar PDF
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs shrink-0"
                onClick={() => setEditing(true)}>
                Editar lista
              </Button>
            </div>
          )}

          {/* Empty state */}
          {!record && !editing && (
            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
              <Package className="w-9 h-9 mb-3 opacity-30" />
              <p className="text-sm font-medium text-slate-500">Nenhum equipamento definido para este show</p>
              <p className="text-xs mt-1 opacity-80">Monte a lista de equipamentos que serão levados</p>
              <Button onClick={() => setEditing(true)} className="mt-5 gap-1.5">
                <Plus className="w-4 h-4" /> Montar lista
              </Button>
            </div>
          )}

          {/* Editor */}
          {(editing || (record && !record.checkedAt)) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Left: selected list */}
              <Card className="rounded-2xl">
                <CardContent className="pt-4 space-y-3">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Equipamentos do show</p>

                  {selectedItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                      <Package className="w-6 h-6 mb-2 opacity-40" />
                      <p className="text-sm">Nenhum equipamento selecionado</p>
                      <p className="text-xs mt-0.5 opacity-70">Use o inventário à direita</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
                      {selectedItems.map(item => (
                        <div key={item.id}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-100 bg-white">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <CategoryBadge category={item.category} />
                              <ConditionBadge condition={item.condition} />
                            </div>
                          </div>
                          <button onClick={() => handleRemove(item.id)}
                            className="shrink-0 text-slate-300 hover:text-red-400 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="text-xs text-slate-500">
                      {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selecionado{selectedItems.length !== 1 ? 's' : ''}
                    </span>
                    <Button size="sm" onClick={handleConfirm} disabled={selectedItems.length === 0}
                      className="gap-1.5 h-7 text-xs">
                      <CheckCircle2 className="w-3 h-3" /> Confirmar lista
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Right: library */}
              <Card className="rounded-2xl">
                <CardContent className="pt-4 space-y-3">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Inventário disponível</p>

                  <div className="flex gap-2">
                    <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-1.5 bg-white flex-1">
                      <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <input value={libSearch} onChange={e => setLibSearch(e.target.value)}
                        placeholder="Buscar…"
                        className="text-xs outline-none text-slate-700 placeholder:text-slate-400 w-full bg-transparent" />
                      {libSearch && (
                        <button onClick={() => setLibSearch('')} className="text-slate-300 hover:text-slate-500">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <Select value={libCat || '__all__'} onValueChange={v => setLibCat(v === '__all__' ? '' : v)}>
                      <SelectTrigger className="w-36 h-[34px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Todas</SelectItem>
                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
                    {availableItems.length === 0 ? (
                      <p className="text-center text-xs text-slate-400 py-6 italic">
                        {equipment.length === 0
                          ? 'Nenhum equipamento cadastrado'
                          : 'Todos os equipamentos já foram adicionados'}
                      </p>
                    ) : (
                      availableItems.map(item => (
                        <div key={item.id}
                          className="group flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-100 hover:border-orange-200 hover:bg-orange-50/40 transition-all duration-150">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                              {item.condition === 'Precisando de reparo' && (
                                <span title="Equipamento necessita de reparo" className="shrink-0">
                                  <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <CategoryBadge category={item.category} />
                            </div>
                          </div>
                          <Button size="icon-sm" variant="ghost"
                            className="shrink-0 text-orange-500 hover:text-orange-700 hover:bg-orange-100 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleAdd(item.id)}>
                            <Plus className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Notes section */}
          {(record || editing) && (
            <Card className="rounded-2xl">
              <CardContent className="pt-4 space-y-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Observações do show</p>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Notas gerais sobre os equipamentos para este show…"
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all duration-150" />
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5"
                    onClick={handleSaveNotes}>
                    Salvar observações
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────
function EquipmentSkeleton() {
  return (
    <div className="space-y-5">
      <div><Skeleton className="h-7 w-44" /><Skeleton className="h-4 w-32 mt-1.5" /></div>
      <div className="flex gap-6 border-b border-slate-200 pb-2.5">
        <Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-20" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 flex-1 rounded-lg" />
        <Skeleton className="h-8 w-40 rounded-lg" />
        <Skeleton className="h-8 w-40 rounded-lg" />
      </div>
      <div className="flex gap-1.5">
        {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-7 w-20 rounded-full" />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────
export default function Equipment({ isLoading, onNav }) {
  const { equipment } = useStore()
  const { isFeatureAvailable, plan } = usePlanLimits()
  const [tab, setTab] = useState('inventory')
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  if (isLoading) return <EquipmentSkeleton />

  if (!isFeatureAvailable('hasEquipamentos')) {
    return (
      <div className="space-y-5 animate-slide-up">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Equipamentos</h1>
          <p className="text-sm text-slate-500 mt-0.5">Controle de equipamentos da banda</p>
        </div>
        <div className="flex flex-col items-center justify-center py-32 rounded-2xl border border-dashed border-slate-200">
          <Lock className="w-12 h-12 text-slate-300 mb-4" />
          <p className="text-sm font-medium text-slate-500">Disponível nos planos Profissional e Multi-bandas</p>
          <button
            onClick={() => setUpgradeOpen(true)}
            className="mt-4 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors"
          >
            Ver planos de upgrade
          </button>
        </div>
        <UpgradeModal
          isOpen={upgradeOpen}
          onClose={() => setUpgradeOpen(false)}
          feature="Controle de equipamentos"
          currentPlan={plan}
          onNav={onNav}
        />
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Equipamentos</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {equipment.length} equipamento{equipment.length !== 1 ? 's' : ''} cadastrado{equipment.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {[
          { id: 'inventory', label: 'Inventário' },
          { id: 'byshow',    label: 'Por show'   },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn(
              'pb-2.5 pt-1 mr-6 text-sm font-medium border-b-2 transition-colors',
              tab === t.id
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-700',
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'inventory'
        ? <InventoryTab equipment={equipment} />
        : <ShowEquipmentTab equipment={equipment} />
      }
    </div>
  )
}
