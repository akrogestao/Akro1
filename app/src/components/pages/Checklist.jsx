import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, ClipboardList, Check, Lock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useStore } from '@/hooks/useStore'
import { usePlanLimits } from '@/hooks/usePlanLimits'
import UpgradeModal from '@/components/shared/UpgradeModal'
import { cn } from '@/lib/utils'

const TYPE_VARIANT = {
  Show: 'default', Festival: 'blue', Casamento: 'success',
  Aniversário: 'warning', Corporativo: 'secondary', Outro: 'outline',
}

export default function Checklist({ isLoading, onNav }) {
  const { events, checklistItems, toggleChecklistItem, initChecklist } = useStore()
  const { isFeatureAvailable, plan } = usePlanLimits()
  const [filter, setFilter] = useState('todos')
  const [openEvents, setOpenEvents] = useState({})
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  const relevantEvents = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const cutoff = new Date(now)
    cutoff.setDate(cutoff.getDate() - 30)
    return [...events]
      .filter(ev => new Date(ev.date + 'T12:00:00') >= cutoff)
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [events])

  const allItems = useMemo(() =>
    checklistItems.filter(i => relevantEvents.some(e => e.id === i.eventId)),
  [checklistItems, relevantEvents])

  const totalItems   = allItems.length
  const doneItems    = allItems.filter(i => i.done).length
  const pendingItems = totalItems - doneItems
  const progressPct  = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0

  const filteredEvents = useMemo(() => {
    if (filter === 'pendentes')  return relevantEvents.filter(ev => {
      const items = checklistItems.filter(i => i.eventId === ev.id)
      return items.length === 0 || items.some(i => !i.done)
    })
    if (filter === 'concluidos') return relevantEvents.filter(ev => {
      const items = checklistItems.filter(i => i.eventId === ev.id)
      return items.length > 0 && items.every(i => i.done)
    })
    return relevantEvents
  }, [relevantEvents, checklistItems, filter])

  const toggleEvent = (evId) => {
    setOpenEvents(prev => {
      const isOpening = !prev[evId]
      if (isOpening) initChecklist(evId)
      return { ...prev, [evId]: isOpening }
    })
  }

  if (isLoading) return <ChecklistSkeleton />

  if (!isFeatureAvailable('hasChecklist')) {
    return (
      <div className="space-y-5 animate-slide-up">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Checklist</h1>
          <p className="text-sm text-slate-500 mt-0.5">Acompanhe as tarefas por evento</p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-slate-200 bg-slate-50">
          <Lock className="w-10 h-10 text-slate-400 mb-3" />
          <p className="text-sm text-slate-400">Este recurso não está disponível no seu plano atual</p>
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
          feature="Checklist de produção"
          currentPlan={plan}
          onNav={onNav}
        />
      </div>
    )
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Checklist</h1>
        <p className="text-sm text-slate-500 mt-0.5">Acompanhe as tarefas por evento</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total de Itens', value: totalItems,        color: 'text-slate-700',   bg: 'bg-slate-50',   border: 'border-slate-100' },
          { label: 'Concluídos',     value: doneItems,         color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
          { label: 'Pendentes',      value: pendingItems,      color: pendingItems > 0 ? 'text-orange-500' : 'text-slate-400', bg: pendingItems > 0 ? 'bg-orange-50' : 'bg-slate-50', border: pendingItems > 0 ? 'border-orange-100' : 'border-slate-100' },
          { label: 'Progresso',      value: `${progressPct}%`, color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-100' },
        ].map(({ label, value, color, bg, border }) => (
          <Card key={label} className="rounded-2xl">
            <CardContent className={cn('p-4 rounded-2xl border', bg, border)}>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
              <p className={cn('text-2xl font-bold', color)}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'todos',      label: 'Todos' },
          { id: 'pendentes',  label: 'Pendentes' },
          { id: 'concluidos', label: 'Concluídos' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              'px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150',
              filter === f.id
                ? 'bg-orange-500 border-orange-500 text-white shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:border-orange-300 hover:text-orange-600'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Events accordion */}
      {filteredEvents.length === 0 ? (
        <Card className="rounded-2xl">
          <div className="text-center py-14 text-slate-400">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium">Nenhum evento encontrado</p>
            <p className="text-sm mt-1">Tente outro filtro ou cadastre shows nos próximos dias</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredEvents.map(ev => {
            const items = checklistItems.filter(i => i.eventId === ev.id)
            const done  = items.filter(i => i.done).length
            const total = items.length
            const pct   = total > 0 ? Math.round((done / total) * 100) : 0
            const isOpen = !!openEvents[ev.id]
            const sortedItems = [...items].sort((a, b) => Number(a.done) - Number(b.done))
            const evDate = new Date(ev.date + 'T12:00:00')
            const isPast = evDate < today

            return (
              <Card key={ev.id} className="rounded-2xl overflow-hidden">
                <button
                  onClick={() => toggleEvent(ev.id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-slate-50/50 transition-colors"
                >
                  {/* Date badge */}
                  <div className={cn('text-center w-10 shrink-0 rounded-lg py-1', isPast ? 'bg-slate-100' : 'bg-orange-50')}>
                    <p className={cn('text-[10px] font-bold uppercase', isPast ? 'text-slate-400' : 'text-orange-500')}>
                      {evDate.toLocaleString('pt-BR', { month: 'short' }).replace('.', '')}
                    </p>
                    <p className={cn('text-lg font-bold leading-none', isPast ? 'text-slate-500' : 'text-orange-600')}>
                      {evDate.getDate()}
                    </p>
                  </div>

                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-800 truncate">{ev.name}</p>
                      <Badge variant={TYPE_VARIANT[ev.type] || 'outline'} className="text-[10px]">{ev.type}</Badge>
                    </div>
                    <p className="text-xs text-slate-400 truncate">
                      {ev.local}{ev.city ? ` · ${ev.city}/${ev.state}` : ''}
                    </p>
                    {total > 0 ? (
                      <div className="flex items-center gap-2 mt-1.5">
                        <Progress value={pct} className="h-1 flex-1" />
                        <span className="text-[10px] text-slate-500 shrink-0">{done}/{total}</span>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 mt-1">Clique para inicializar checklist</p>
                    )}
                  </div>

                  <div className="shrink-0 text-slate-400">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-1">
                        {sortedItems.length === 0 ? (
                          <p className="text-center text-sm text-slate-400 py-4">Inicializando...</p>
                        ) : (
                          sortedItems.map(item => (
                            <div
                              key={item.id}
                              className={cn('flex items-start gap-2.5 p-2.5 rounded-lg transition-colors', item.done ? 'opacity-60' : 'hover:bg-slate-50')}
                            >
                              <button
                                onClick={() => toggleChecklistItem(item.id)}
                                className={cn(
                                  'mt-0.5 w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-all',
                                  item.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-orange-400'
                                )}
                              >
                                {item.done && <Check className="w-2.5 h-2.5 text-white" />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className={cn('text-sm', item.done ? 'line-through text-slate-400' : 'text-slate-700')}>
                                  {item.text}
                                </p>
                                {item.done && item.doneAt && (
                                  <p className="text-[10px] text-slate-400">
                                    {new Date(item.doneAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ChecklistSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-8 w-40" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
      </div>
      <div className="flex gap-2">
        {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-8 w-24 rounded-full" />)}
      </div>
      <div className="space-y-2">
        {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
      </div>
    </div>
  )
}
