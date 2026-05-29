import { useState, useEffect, useRef, useMemo } from 'react'
import { useUnsavedGuard } from '@/hooks/useUnsavedGuard'
import { toast } from 'sonner'
import { Trash2, Check, Plus, Landmark, Building2 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import CurrencyInput from '@/components/shared/CurrencyInput'
import TimePicker from '@/components/shared/TimePicker'
import CitySelect from '@/components/shared/CitySelect'
import DatePicker from '@/components/shared/DatePicker'
import Avatar from '@/components/shared/Avatar'
import { useStore } from '@/hooks/useStore'
import { cn } from '@/lib/utils'

const SHOW_TYPES = [
  { value: 'show',     label: 'Show solo' },
  { value: 'festival', label: 'Festival'  },
]
const BLANK = { name: '', local: '', date: '', type: 'Show', event_type: 'show', visibility: 'publico', organizer_name: '', time: '20:00', end: '23:00', value: 0, notes: '', members: [], contractorIds: [], city: '', state: '', lat: null, lng: null, expenses: { alimentacao: 0, hospedagem: 0, logistica: 0 } }

export default function EventModal({ open, onOpenChange, editId, initialData = null }) {
  const { events, members, contractors, addEvent, updateEvent, deleteEvent,
          checklistItems, initChecklist, toggleChecklistItem, addChecklistItem, deleteChecklistItem } = useStore()
  const [form, setForm] = useState(BLANK)
  const [activeTab, setActiveTab] = useState('details')
  const [newItemText, setNewItemText] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const draftIdRef   = useRef(null)
  const savedRef     = useRef(false)
  const initialRef   = useRef(BLANK)

  useEffect(() => {
    if (!open) {
      setActiveTab('details')
      setNewItemText('')
      if (!editId && draftIdRef.current && !savedRef.current) {
        checklistItems
          .filter(i => i.eventId === draftIdRef.current)
          .forEach(i => deleteChecklistItem(i.id))
      }
      draftIdRef.current = null
      savedRef.current   = false
      return
    }
    if (editId) {
      const e = events.find((x) => x.id === editId)
      const state = e ? { ...BLANK, ...e } : BLANK
      setForm(state)
      initialRef.current = state
    } else {
      const newId = crypto.randomUUID()
      draftIdRef.current = newId
      savedRef.current   = false
      const state = initialData ? { ...BLANK, ...initialData } : BLANK
      setForm(state)
      initialRef.current = state
      initChecklist(newId)
    }
  }, [open, editId, events])

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialRef.current),
    [form]
  )
  const { guard, UnsavedDialog } = useUnsavedGuard(isDirty)

  const effectiveId = editId || draftIdRef.current

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const toggleMember = (id) =>
    set('members', form.members.includes(id) ? form.members.filter((x) => x !== id) : [...form.members, id])

  const allSelected = members.length > 0 && members.every((m) => form.members.includes(m.id))
  const toggleAll = () => set('members', allSelected ? [] : members.map((m) => m.id))


  const handleSave = () => {
    if (!form.name.trim() || !form.date) {
      toast.error('Preencha os campos obrigatórios (*)'); return
    }
    if (editId) {
      updateEvent(editId, form)
      toast.success('Evento atualizado!')
    } else {
      savedRef.current = true
      const draftItems = checklistItems.filter(i => i.eventId === draftIdRef.current)
      addEvent({ ...form, id: draftIdRef.current }, draftItems)
      toast.success('Evento adicionado!')
    }
    onOpenChange(false)
  }

  const handleDelete = () => setDeleteConfirm(true)

  const doDelete = () => {
    deleteEvent(editId)
    toast.success('Evento excluído.')
    onOpenChange(false)
  }

  const handleAddItem = () => {
    if (!newItemText.trim()) return
    addChecklistItem(effectiveId, { text: newItemText.trim(), owner: 'both' })
    setNewItemText('')
  }

  const handleTabSwitch = (tabId) => {
    setActiveTab(tabId)
    if (tabId === 'checklist' && effectiveId) initChecklist(effectiveId)
  }

  const eventItems  = effectiveId ? checklistItems.filter(item => item.eventId === effectiveId) : []
  const sortedItems = [...eventItems].sort((a, b) => Number(a.done) - Number(b.done))
  const doneCount   = eventItems.filter(i => i.done).length
  const totalCount  = eventItems.length
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  const handleClose = () => guard(() => onOpenChange(false))

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => { if (v) onOpenChange(v); else handleClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editId ? 'Editar Evento' : 'Adicionar Evento'}</DialogTitle>
        </DialogHeader>

        {/* Tab bar */}
        <div className="flex border-b border-slate-200 px-6 -mt-1">
          {[
            { id: 'details',   label: 'Detalhes' },
            { id: 'checklist', label: `Checklist${totalCount > 0 ? ` (${doneCount}/${totalCount})` : ''}` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabSwitch(tab.id)}
              className={cn(
                'pb-2.5 pt-1 mr-6 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Details tab */}
        {activeTab === 'details' && (
          <div className="px-6 py-2 space-y-4">
            <div className="space-y-1.5">
              <Label className="pb-2 block">Nome do Evento *</Label>
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex: Show no Clube Noturno" autoFocus />
            </div>

            <div className="space-y-1.5">
              <Label className="pb-2 block">Local / Endereço *</Label>
              <Input value={form.local} onChange={(e) => set('local', e.target.value)} placeholder="Nome do local, endereço" />
            </div>

            <div className="space-y-1.5">
              <Label className="pb-2 block">Contratante do Evento</Label>
              <Select
                value={String((form.contractorIds || [])[0] ?? 'none')}
                onValueChange={val => set('contractorIds', val === 'none' ? [] : [contractors.find(c => String(c.id) === val)?.id].filter(Boolean))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum contratante" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum contratante</SelectItem>
                  {(contractors || []).map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}{c.company ? ` — ${c.company}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="pb-2 block">Cidade</Label>
              <CitySelect
                city={form.city}
                state={form.state}
                onChange={({ city, state, lat, lng }) => setForm(p => ({ ...p, city, state, lat, lng }))}
              />
              {form.city && form.lat != null && (
                <p className="text-[10px] text-slate-400">
                  Coordenadas: {form.lat.toFixed(4)}, {form.lng.toFixed(4)}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="pb-2 block">Data *</Label>
                <DatePicker value={form.date} onChange={(v) => set('date', v)} placeholder="Selecione a data..." />
              </div>
              <div className="space-y-1.5">
                <Label className="pb-2 block">Tipo de show</Label>
                <div className="flex gap-2">
                  {SHOW_TYPES.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => set('event_type', t.value)}
                      className={cn(
                        'flex-1 py-2 text-xs font-semibold rounded-lg border transition-all duration-150',
                        form.event_type === t.value
                          ? 'bg-orange-500 border-orange-500 text-white'
                          : 'border-slate-200 text-slate-600 hover:border-orange-300 hover:text-orange-600'
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="pb-2 block">Iniciativa</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => set('visibility', 'publico')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg border transition-all duration-150',
                    form.visibility === 'publico'
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : 'border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'
                  )}
                >
                  <Landmark className="w-3.5 h-3.5" /> Pública
                </button>
                <button
                  type="button"
                  onClick={() => set('visibility', 'privado')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg border transition-all duration-150',
                    form.visibility === 'privado'
                      ? 'bg-slate-700 border-slate-700 text-white'
                      : 'border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-700'
                  )}
                >
                  <Building2 className="w-3.5 h-3.5" /> Privada
                </button>
              </div>
            </div>

            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={form.visibility}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                style={{ overflow: 'hidden' }}
                className="space-y-1.5"
              >
                <Label className="pb-2 block">
                  {form.visibility === 'publico' ? 'Órgão contratante' : 'Empresa ou produtor contratante'}
                </Label>
                <Input
                  value={form.organizer_name || ''}
                  onChange={(e) => set('organizer_name', e.target.value)}
                  placeholder={form.visibility === 'publico' ? 'Ex: Prefeitura de São Paulo' : 'Ex: Produtora XYZ'}
                />
              </motion.div>
            </AnimatePresence>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="pb-2 block">Horário Início</Label>
                <TimePicker value={form.time} onChange={(v) => set('time', v)} />
              </div>
              <div className="space-y-1.5">
                <Label className="pb-2 block">Horário Fim</Label>
                <TimePicker value={form.end} onChange={(v) => set('end', v)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="pb-2 block">Valor do Contrato</Label>
              <CurrencyInput value={form.value} onChange={(v) => set('value', v)} />
            </div>

            <div className="space-y-1.5">
              <Label className="pb-2 block">Observações</Label>
              <textarea
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Informações adicionais, rider, dress code..."
                rows={2}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all duration-150"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="pb-2 block">Membros da Escalação</Label>
                {members.length > 0 && (
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                    <span className="text-xs text-slate-500">Todos</span>
                  </label>
                )}
              </div>
              {members.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">Nenhum membro cadastrado ainda.</p>
              ) : (
                <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                  {members.map((m) => (
                    <label key={m.id} className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 hover:border-orange-200 hover:bg-orange-50/40 cursor-pointer transition-all duration-150">
                      <Checkbox checked={form.members.includes(m.id)} onCheckedChange={() => toggleMember(m.id)} />
                      <Avatar init={m.init} color={m.color} size="sm" />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-slate-800 truncate">{m.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">{m.role}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Checklist tab */}
        {activeTab === 'checklist' && (
          <div className="px-6 py-2 space-y-4">
            {/* Progress */}
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span>{doneCount} de {totalCount} {totalCount === 1 ? 'item' : 'itens'} concluídos</span>
                <span className="font-semibold text-slate-700">{progressPct}%</span>
              </div>
              <Progress value={progressPct} className="h-1.5" />
            </div>

            {/* Items list */}
            <div className="space-y-1 max-h-72 overflow-y-auto -mx-1 px-1">
              {sortedItems.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-6">Nenhum item ainda. Adicione abaixo.</p>
              ) : (
                sortedItems.map(item => (
                  <div
                    key={item.id}
                    className={cn('flex items-center gap-2.5 p-2.5 rounded-lg border transition-colors',
                      item.done ? 'bg-slate-50/80 border-slate-100' : 'bg-white border-slate-200'
                    )}
                  >
                    <button
                      onClick={() => toggleChecklistItem(item.id)}
                      className={cn(
                        'w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-all',
                        item.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-orange-400'
                      )}
                    >
                      {item.done && <Check className="w-2.5 h-2.5 text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm', item.done ? 'line-through text-slate-400' : 'text-slate-800')}>
                        {item.text}
                      </p>
                      {item.done && item.doneAt && (
                        <p className="text-[10px] text-slate-400">
                          {new Date(item.doneAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteChecklistItem(item.id)}
                      className="shrink-0 text-slate-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add item form */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500">Adicionar item personalizado</p>
              <div className="flex gap-2">
                <Input
                  value={newItemText}
                  onChange={e => setNewItemText(e.target.value)}
                  placeholder="Descrição do item..."
                  className="flex-1"
                  onKeyDown={e => { if (e.key === 'Enter') handleAddItem() }}
                />
                <Button
                  size="icon"
                  onClick={handleAddItem}
                  disabled={!newItemText.trim()}
                  className="bg-orange-500 hover:bg-orange-600 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {editId && (
            <Button variant="destructive" onClick={handleDelete} className="mr-auto gap-1.5 h-10 px-4">
              <Trash2 className="w-3.5 h-3.5" /> Excluir
            </Button>
          )}
          <Button variant="outline" className="h-10 px-4" onClick={handleClose}>Cancelar</Button>
          <Button className="h-10 px-4" onClick={handleSave}>Salvar Evento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <ConfirmDialog
      open={deleteConfirm}
      onOpenChange={setDeleteConfirm}
      title="Excluir este evento permanentemente?"
      description="Esta ação não pode ser desfeita."
      confirmLabel="Excluir"
      onConfirm={doDelete}
    />
    {UnsavedDialog}
    </>
  )
}
