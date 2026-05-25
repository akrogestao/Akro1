import { useState, useMemo, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Pencil, Trash2, Search, SlidersHorizontal, X, ArrowUpDown, Clock, Calendar, MapPin, Users, Landmark, Building2, Eye, CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Check, ChevronDown } from 'lucide-react'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import ContractDrawer from '@/components/shared/ContractDrawer'
import DatePicker from '@/components/shared/DatePicker'
import CurrencyInput from '@/components/shared/CurrencyInput'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import EventModal from '@/components/modals/EventModal'
import { fmtCurrency } from '@/lib/format'
import { useStore } from '@/hooks/useStore'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const TYPE_BADGE = { Show: 'default', Festival: 'blue', Casamento: 'success', Aniversário: 'warning', Corporativo: 'secondary', Outro: 'outline' }

const SHOW_TYPE_OPTIONS = [
  { value: 'show',     label: 'Show solo' },
  { value: 'festival', label: 'Festival'  },
]

const VISIBILITY_OPTIONS = [
  { value: 'publico', label: 'Pública',  Icon: Landmark  },
  { value: 'privado', label: 'Privada',  Icon: Building2 },
]

const SORT_OPTIONS = [
  { value: 'date_asc',   label: 'Data (mais antiga)' },
  { value: 'date_desc',  label: 'Data (mais recente)' },
  { value: 'value_asc',  label: 'Valor (crescente)' },
  { value: 'value_desc', label: 'Valor (decrescente)' },
]

const STATES_UF = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
]

const DEFAULT_FILTERS = {
  sort:        'date_desc',
  eventTypes:  [],
  visibilities: [],
  states:      [],
  minValue:    0,
  maxValue:    0,
  periodMode:  'all',   // 'all' | 'month' | 'range'
  periodMonth: '',      // 'YYYY-MM'
  periodStart: '',      // 'YYYY-MM-DD'
  periodEnd:   '',      // 'YYYY-MM-DD'
}

function MemberStack({ memberObjects, limit = 4 }) {
  const shown = memberObjects.slice(0, limit)
  const rest  = memberObjects.length - limit
  return (
    <div className="flex -space-x-1.5 items-center">
      {shown.map(m => (
        <div
          key={m.id}
          title={m.name}
          style={{ backgroundColor: m.color }}
          className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center text-[9px] font-bold text-white shrink-0"
        >
          {m.init}
        </div>
      ))}
      {rest > 0 && (
        <div className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-[9px] font-semibold text-slate-600 dark:text-slate-300">
          +{rest}
        </div>
      )}
    </div>
  )
}

function ContractCard({ event, members, onEdit, onDelete, onView }) {
  const evMembers = members.filter(m => event.members?.includes(m.id))
  const d       = new Date(event.date + 'T12:00:00')
  const dayNum  = d.getDate()
  const mon     = d.toLocaleDateString('pt-BR', { month: 'short' })
  const dayName = d.toLocaleDateString('pt-BR', { weekday: 'short' })
  const dateStr = d.toLocaleDateString('pt-BR')
  const location = [event.city, event.state].filter(Boolean).join(', ') || event.local || '—'
  const timeStr  = event.time ? (event.end ? `${event.time} – ${event.end}` : event.time) : null

  return (
    <Card className="rounded-2xl p-4">
      <div className="flex gap-3 sm:gap-4">
        {/* Date tile */}
        <div className="flex flex-col items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/30 shrink-0">
          <span className="text-base sm:text-lg font-bold text-orange-600 leading-none">{dayNum}</span>
          <span className="text-[9px] sm:text-[10px] text-orange-500 uppercase tracking-wide">{mon}</span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Name + badges */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{event.name}</p>
              {event.organizer_name && (
                <p className="text-xs text-slate-400 truncate">{event.organizer_name}</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {event.visibility === 'publico' ? (
                <Badge variant="blue" className="text-[10px] flex items-center gap-0.5">
                  <Landmark className="w-2.5 h-2.5" /> Pública
                </Badge>
              ) : event.visibility === 'privado' ? (
                <Badge variant="secondary" className="text-[10px] flex items-center gap-0.5">
                  <Building2 className="w-2.5 h-2.5" /> Privada
                </Badge>
              ) : null}
              <Badge variant={TYPE_BADGE[event.type] || 'outline'} className="text-[10px]">
                {event.type}
              </Badge>
            </div>
          </div>

          {/* Location + time */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-slate-500">
            <span className="flex items-center gap-1 min-w-0">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{location}</span>
            </span>
            <span className="flex items-center gap-1 shrink-0">
              <Calendar className="w-3 h-3" />
              {dayName}, {dateStr}
            </span>
            {timeStr && (
              <span className="flex items-center gap-1 shrink-0">
                <Clock className="w-3 h-3" />
                {timeStr}
              </span>
            )}
          </div>

          {/* Bottom: members + value + actions */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <div className="flex items-center gap-2">
              {evMembers.length > 0 ? (
                <>
                  <MemberStack memberObjects={evMembers} />
                  <span className="text-xs text-slate-400">
                    {evMembers.length} membro{evMembers.length !== 1 ? 's' : ''}
                  </span>
                </>
              ) : (
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Users className="w-3 h-3" /> Sem membros
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-auto">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {fmtCurrency(event.value)}
              </span>
              <button
                onClick={onView}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-orange-500 transition-colors duration-150"
              >
                <Eye className="w-3.5 h-3.5" />
                Ver detalhes
              </button>
              <Button size="icon-sm" variant="ghost" onClick={onEdit} title="Editar">
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="icon-sm" variant="ghost"
                className="text-red-400 hover:text-red-600 hover:bg-red-50"
                onClick={onDelete}
                title="Excluir"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

function FilterDropdown({ label, icon: Icon, options, values, onChange, single = false }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const toggle = (v) => {
    if (single) { onChange([v]); setOpen(false) }
    else onChange(values.includes(v) ? values.filter(x => x !== v) : [...values, v])
  }

  const hasActive = !single && values.length > 0
  const displayLabel = single
    ? (options.find(o => o.value === values[0])?.label ?? label)
    : values.length > 0 ? `${label} (${values.length})` : label

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150',
          hasActive || (open && hasActive)
            ? 'bg-orange-500 border-orange-500 text-white'
            : open
              ? 'border-orange-400 bg-orange-50 text-orange-600'
              : 'bg-white border-slate-200 text-slate-600 hover:border-orange-300 hover:bg-orange-50'
        )}
      >
        {Icon && <Icon className="w-3 h-3" />}
        <span className="max-w-[130px] truncate">{displayLabel}</span>
        <ChevronDown className={cn('w-3 h-3 shrink-0 transition-transform duration-150', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute top-full left-0 mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-lg py-1 min-w-[160px]"
          >
            {options.map(opt => {
              const selected = values.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggle(opt.value)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors duration-100',
                    selected ? 'text-orange-600 hover:bg-orange-50' : 'text-slate-600 hover:bg-slate-50'
                  )}
                >
                  <span className={cn(
                    'w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border',
                    selected ? 'bg-orange-500 border-orange-500' : 'border-slate-300'
                  )}>
                    {selected && <Check className="w-2.5 h-2.5 text-white" />}
                  </span>
                  {opt.Icon && <opt.Icon className="w-3 h-3 text-slate-400" />}
                  {opt.label}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const MONTH_NAMES_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function MonthPicker({ value, onChange }) {
  const today = new Date()
  const selYear  = value ? parseInt(value.slice(0, 4)) : null
  const selMonth = value ? parseInt(value.slice(5, 7)) - 1 : null
  const [viewYear, setViewYear] = useState(selYear ?? today.getFullYear())

  const select = (i) => onChange(`${viewYear}-${String(i + 1).padStart(2, '0')}`)

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 w-56 shadow-sm">
      {/* Year navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setViewYear(y => y - 1)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-bold text-slate-800 select-none">{viewYear}</span>
        <button
          type="button"
          onClick={() => setViewYear(y => y + 1)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Month grid */}
      <div className="grid grid-cols-4 gap-1">
        {MONTH_NAMES_SHORT.map((name, i) => {
          const isSelected    = selYear === viewYear && selMonth === i
          const isCurrentMonth = today.getFullYear() === viewYear && today.getMonth() === i
          return (
            <button
              key={i}
              type="button"
              onClick={() => select(i)}
              className={cn(
                'py-1.5 rounded-lg text-xs font-semibold transition-colors duration-100 select-none',
                isSelected
                  ? 'bg-orange-500 text-white'
                  : isCurrentMonth
                    ? 'border border-orange-400 text-orange-500 hover:bg-orange-50'
                    : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              {name}
            </button>
          )
        })}
      </div>

      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="mt-2 w-full text-[11px] text-slate-400 hover:text-red-500 transition-colors"
        >
          Limpar seleção
        </button>
      )}
    </div>
  )
}

function FilterPanel({ filters, onChange, events, onClose }) {
  const set = (k, v) => onChange({ ...filters, [k]: v })

  const usedStates  = [...new Set(events.map(e => e.state).filter(Boolean))].sort()
  const stateOptions = usedStates.map(s => ({ value: s, label: s }))

  const activeCount =
    filters.eventTypes.length + filters.visibilities.length + filters.states.length +
    (filters.minValue ? 1 : 0) + (filters.maxValue ? 1 : 0) +
    (filters.periodMode !== 'all' ? 1 : 0)

  const setPeriodMode = (mode) => onChange({
    ...filters,
    periodMode:  mode,
    periodMonth: '',
    periodStart: '',
    periodEnd:   '',
  })

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">Filtros</span>
          {activeCount > 0 && (
            <span className="text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-bold leading-none">{activeCount}</span>
          )}
        </div>
        <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Compact dropdown row */}
      <div className="flex flex-wrap gap-2">
        <FilterDropdown
          label="Ordenar"
          icon={ArrowUpDown}
          options={SORT_OPTIONS}
          values={[filters.sort]}
          onChange={([v]) => set('sort', v)}
          single
        />
        <FilterDropdown
          label="Tipo"
          options={SHOW_TYPE_OPTIONS}
          values={filters.eventTypes}
          onChange={v => set('eventTypes', v)}
        />
        <FilterDropdown
          label="Iniciativa"
          options={VISIBILITY_OPTIONS}
          values={filters.visibilities}
          onChange={v => set('visibilities', v)}
        />
        {stateOptions.length > 0 && (
          <FilterDropdown
            label="Estado"
            options={stateOptions}
            values={filters.states}
            onChange={v => set('states', v)}
          />
        )}
      </div>

      {/* Value range — compact inline */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider shrink-0">Valor</span>
        <CurrencyInput
          value={filters.minValue}
          onChange={v => set('minValue', v)}
          placeholder="Mínimo"
          className="w-32 py-1.5 text-xs"
        />
        <span className="text-xs text-slate-400">–</span>
        <CurrencyInput
          value={filters.maxValue}
          onChange={v => set('maxValue', v)}
          placeholder="Máximo"
          className="w-32 py-1.5 text-xs"
        />
      </div>

      {/* Período — full width */}
      <div className="pt-3 border-t border-slate-200 space-y-3">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="w-3 h-3" /> Período
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { value: 'all',   label: 'Todos',          Icon: null          },
            { value: 'month', label: 'Mês específico', Icon: CalendarDays  },
            { value: 'range', label: 'Intervalo',       Icon: CalendarRange },
          ].map(({ value, label, Icon }) => (
            <button
              key={value}
              onClick={() => setPeriodMode(value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150',
                filters.periodMode === value
                  ? 'bg-orange-500 border-orange-500 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-orange-300 hover:bg-orange-50'
              )}
            >
              {Icon && <Icon className="w-3 h-3" />}
              {label}
            </button>
          ))}
        </div>

        <AnimatePresence initial={false} mode="wait">
          {filters.periodMode === 'month' && (
            <motion.div
              key="month"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{ overflow: 'hidden' }}
              className="pt-1"
            >
              <MonthPicker
                value={filters.periodMonth}
                onChange={v => set('periodMonth', v)}
              />
            </motion.div>
          )}
          {filters.periodMode === 'range' && (
            <motion.div
              key="range"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div className="flex flex-wrap gap-3 mt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium shrink-0">De</span>
                  <div className="w-44">
                    <DatePicker
                      light
                      value={filters.periodStart}
                      onChange={v => set('periodStart', v)}
                      placeholder="Data inicial"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium shrink-0">Até</span>
                  <div className="w-44">
                    <DatePicker
                      light
                      value={filters.periodEnd}
                      onChange={v => set('periodEnd', v)}
                      placeholder="Data final"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default function Contracts({ isLoading, initialEventData, onClearInitial }) {
  const { events, deleteEvent, members } = useStore()
  const [modalOpen, setModalOpen]       = useState(false)
  const [editId, setEditId]             = useState(null)
  const [initialFormData, setInitialFormData] = useState(null)
  const [search, setSearch]             = useState('')
  const [showFilters, setShowFilters]   = useState(false)
  const [filters, setFilters]           = useState(DEFAULT_FILTERS)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [drawerEvent, setDrawerEvent]   = useState(null)

  useEffect(() => {
    if (!initialEventData) return
    setInitialFormData({
      name:           initialEventData.name           || '',
      date:           initialEventData.eventDate      || '',
      city:           initialEventData.city           || '',
      state:          initialEventData.state          || '',
      type:           initialEventData.eventType      || 'Show',
      event_type:     initialEventData.event_type     || 'show',
      visibility:     initialEventData.visibility     || 'publico',
      organizer_name: initialEventData.organizer_name || '',
      value:          initialEventData.finalValue     || 0,
    })
    setEditId(null)
    setModalOpen(true)
    onClearInitial?.()
  }, [initialEventData])

  const handleModalOpenChange = (open) => {
    if (!open) setInitialFormData(null)
    setModalOpen(open)
  }

  const openAdd  = () => { setEditId(null); setInitialFormData(null); setModalOpen(true) }
  const openEdit = (id) => { setEditId(id); setInitialFormData(null); setModalOpen(true) }

  const handleDelete = (id) => setDeleteConfirmId(id)

  const doDelete = () => {
    deleteEvent(deleteConfirmId)
    toast.success('Evento excluído.')
  }

  const activeFilterCount = useMemo(() =>
    filters.eventTypes.length + filters.visibilities.length + filters.states.length +
    (filters.minValue ? 1 : 0) + (filters.maxValue ? 1 : 0) +
    (filters.periodMode !== 'all' ? 1 : 0),
  [filters])

  const filtered = useMemo(() => {
    let list = [...events]

    // text search
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.local.toLowerCase().includes(q) ||
        (e.city || '').toLowerCase().includes(q)
      )
    }

    // event_type filter (show / festival)
    if (filters.eventTypes.length > 0)
      list = list.filter(e => filters.eventTypes.includes(e.event_type))

    // visibility filter (publico / privado)
    if (filters.visibilities.length > 0)
      list = list.filter(e => filters.visibilities.includes(e.visibility))

    // state filter
    if (filters.states.length > 0)
      list = list.filter(e => filters.states.includes(e.state))

    // value range
    if (filters.minValue > 0)
      list = list.filter(e => (e.value || 0) >= filters.minValue)
    if (filters.maxValue > 0)
      list = list.filter(e => (e.value || 0) <= filters.maxValue)

    // period filter
    if (filters.periodMode === 'month' && filters.periodMonth)
      list = list.filter(e => e.date && e.date.startsWith(filters.periodMonth))
    if (filters.periodMode === 'range') {
      if (filters.periodStart)
        list = list.filter(e => e.date && e.date >= filters.periodStart)
      if (filters.periodEnd)
        list = list.filter(e => e.date && e.date <= filters.periodEnd)
    }

    // sort
    list.sort((a, b) => {
      if (filters.sort === 'date_asc')   return a.date.localeCompare(b.date)
      if (filters.sort === 'date_desc')  return b.date.localeCompare(a.date)
      if (filters.sort === 'value_asc')  return (a.value || 0) - (b.value || 0)
      if (filters.sort === 'value_desc') return (b.value || 0) - (a.value || 0)
      return 0
    })

    return list
  }, [events, search, filters])

  const total = filtered.reduce((s, e) => s + (e.value || 0), 0)

  if (isLoading) return <ContractsSkeleton />

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Contratos</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {filtered.length} contrato{filtered.length !== 1 ? 's' : ''}
            {filtered.length !== events.length ? ` de ${events.length}` : ''} · {fmtCurrency(total)}
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo Contrato</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-44">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, local ou cidade..."
            className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {activeFilterCount > 0 && (
          <button
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-500 hover:border-red-300 hover:bg-red-50 hover:text-red-500 transition-all"
          >
            <X className="w-3 h-3" /> Limpar filtros
          </button>
        )}

        <button
          onClick={() => setShowFilters(v => !v)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all',
            showFilters || activeFilterCount > 0
              ? 'bg-orange-500 border-orange-500 text-white'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-orange-300 hover:bg-orange-50'
          )}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filtros
          {activeFilterCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-white/20">{activeFilterCount}</span>
          )}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          events={events}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* Contract cards */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-12 text-center">
          <Search className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm text-slate-400">Nenhum contrato encontrado</p>
          {(search || activeFilterCount > 0) && (
            <button
              onClick={() => { setSearch(''); setFilters(DEFAULT_FILTERS) }}
              className="mt-2 text-xs text-orange-500 hover:underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(e => (
            <ContractCard
              key={e.id}
              event={e}
              members={members}
              onEdit={() => openEdit(e.id)}
              onDelete={() => handleDelete(e.id)}
              onView={() => setDrawerEvent(e)}
            />
          ))}
        </div>
      )}

      <EventModal key={editId ?? 'new'} open={modalOpen} onOpenChange={handleModalOpenChange} editId={editId} initialData={initialFormData} />
      <ContractDrawer
        isOpen={drawerEvent !== null}
        onClose={() => setDrawerEvent(null)}
        event={drawerEvent}
        onEdit={() => openEdit(drawerEvent.id)}
      />
      <ConfirmDialog
        open={deleteConfirmId !== null}
        onOpenChange={(v) => { if (!v) setDeleteConfirmId(null) }}
        title="Excluir este evento permanentemente?"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={doDelete}
      />
    </div>
  )
}

function ContractsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex justify-between"><Skeleton className="h-8 w-32" /><Skeleton className="h-9 w-36" /></div>
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  )
}
