import { useState, useMemo, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Pencil, Trash2, Users, ChevronDown, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import Avatar from '@/components/shared/Avatar'
import MemberModal from '@/components/modals/MemberModal'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { fmtCurrency, fmtDate } from '@/lib/format'
import { useStore } from '@/hooks/useStore'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ── Payment calc helpers ──────────────────────────────
function usePayCalc() {
  const { members, getPayEntry } = useStore()

  const finalVal = useCallback((m, evId) => {
    const base = m.cache ?? 0
    const e = getPayEntry(evId, m.id)
    if (e.customValue !== null) return e.customValue
    return e.doubled ? base * 2 : base
  }, [members, getPayEntry])

  return { finalVal }
}

// ── Status badge ──────────────────────────────────────
function StatusBadge({ paid }) {
  return paid
    ? <Badge variant="success"  className="gap-1 text-[10px]"><CheckCircle2 className="w-2.5 h-2.5" />Pago</Badge>
    : <Badge variant="destructive" className="gap-1 text-[10px]"><AlertCircle className="w-2.5 h-2.5" />Pendente</Badge>
}

// ── Single member accordion row ───────────────────────
function MemberRow({ m, isOpen, onToggle }) {
  const { events, deleteMember, getPayEntry } = useStore()
  const { finalVal } = usePayCalc()
  const [modalOpen, setModalOpen]       = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const handleDelete = (e) => { e.stopPropagation(); setDeleteConfirm(true) }

  const doDelete = () => { deleteMember(m.id); toast.success('Membro excluído.') }

  const memberEvents = useMemo(() => {
    return [...events]
      .filter(ev => (ev.members || []).includes(m.id))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [events, m.id])

  const summary = useMemo(() => {
    let toReceive = 0, received = 0
    memberEvents.forEach(ev => {
      const v = finalVal(m, ev.id)
      if (getPayEntry(ev.id, m.id).paid) received += v
      else toReceive += v
    })
    return { toReceive, received, total: toReceive + received }
  }, [memberEvents, m, finalVal, getPayEntry])

  const pct = summary.total > 0 ? Math.round((summary.received / summary.total) * 100) : 0

  return (
    <>
      {/* Header */}
      <div
        onClick={onToggle}
        className={cn(
          'flex items-center gap-3 px-4 py-3.5 cursor-pointer border-b border-slate-100 transition-colors duration-150',
          isOpen ? 'bg-orange-50/50' : 'hover:bg-slate-50'
        )}
      >
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2, ease: [0.4,0,0.2,1] }}>
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        </motion.div>

        <Avatar init={m.init} color={m.color} size="md" />

        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-900 truncate">{m.name}</div>
          <div className="text-xs text-slate-500">{m.role}</div>
        </div>

        <div className="hidden sm:flex flex-col items-end text-right shrink-0">
          <span className="text-xs font-semibold text-slate-700">{fmtCurrency(m.cache)} / show</span>
          <span className="text-[10px] text-slate-400">{memberEvents.length} show{memberEvents.length !== 1 ? 's' : ''} no total</span>
        </div>

        <div className="flex gap-1 shrink-0">
          <Button
            size="icon-sm" variant="ghost"
            onClick={(e) => { e.stopPropagation(); setModalOpen(true) }}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="icon-sm" variant="ghost"
            className="text-red-400 hover:text-red-600 hover:bg-red-50"
            onClick={handleDelete}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Accordion content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="bg-slate-50/50 border-b border-slate-100">
              {/* Financial summary */}
              <div className="grid grid-cols-3 gap-3 px-5 py-4 border-b border-slate-100">
                <div className="text-center">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Total a Receber</p>
                  <p className="text-base font-bold text-slate-900">{fmtCurrency(summary.total)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wide mb-1">Já Recebido</p>
                  <p className="text-base font-bold text-emerald-500">{fmtCurrency(summary.received)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wide mb-1">Falta Receber</p>
                  <p className="text-base font-bold text-amber-500">{fmtCurrency(summary.toReceive)}</p>
                </div>
              </div>

              {/* Progress bar */}
              {summary.total > 0 && (
                <div className="px-5 pt-3 pb-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-slate-400">Progresso de pagamento</span>
                    <span className="text-[10px] font-semibold text-orange-500">{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              )}

              {/* Events list */}
              {memberEvents.length === 0 ? (
                <div className="px-5 py-6 text-center">
                  <Clock className="w-7 h-7 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm text-slate-400">Nenhum evento neste mês</p>
                </div>
              ) : (
                <table className="w-full mt-1">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {['Evento', 'Data', 'Valor', 'Status'].map(h => (
                        <th key={h} className="py-2 px-4 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {memberEvents.map(ev => {
                      const entry  = getPayEntry(ev.id, m.id)
                      const v      = finalVal(m, ev.id)
                      return (
                        <tr key={ev.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <div className="text-sm font-medium text-slate-800 truncate max-w-[180px]">{ev.name}</div>
                            <div className="text-xs text-slate-400 truncate">{ev.local}</div>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">{fmtDate(ev.date)}</td>
                          <td className="py-3 px-4 text-sm font-semibold text-slate-900 whitespace-nowrap">{fmtCurrency(v)}</td>
                          <td className="py-3 px-4"><StatusBadge paid={entry.paid} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit modal */}
      <MemberModal key={m.id} open={modalOpen} onOpenChange={setModalOpen} editId={m.id} />
      <ConfirmDialog
        open={deleteConfirm}
        onOpenChange={setDeleteConfirm}
        title="Excluir este membro?"
        description="Ele será removido de todos os eventos. Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={doDelete}
      />
    </>
  )
}

// ── Main page ─────────────────────────────────────────
export default function Members({ isLoading }) {
  const { members, events } = useStore()
  const [addOpen, setAddOpen]   = useState(false)
  const [openRows, setOpenRows] = useState(new Set())

  const toggle = (id) => setOpenRows(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  if (isLoading) return <MembersSkeleton />

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Membros</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {members.length} membro{members.length !== 1 ? 's' : ''} cadastrado{members.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setAddOpen(true)} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Adicionar Membro</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </div>
      </div>

      {/* Accordion table */}
      <Card className="rounded-2xl overflow-hidden">
        {/* Table header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-50/80 border-b border-slate-100">
          <div className="w-4" />
          <div className="w-8" />
          <div className="flex-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Membro</span>
          </div>
          <div className="hidden sm:block min-w-[110px] text-right">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Cachê Base</span>
          </div>
          <div className="w-[72px]" />
        </div>

        {members.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum membro cadastrado</p>
            <p className="text-sm mt-1">Clique em "Adicionar Membro" para começar</p>
          </div>
        ) : (
          members.map(m => (
            <MemberRow
              key={m.id}
              m={m}
              isOpen={openRows.has(m.id)}
              onToggle={() => toggle(m.id)}
            />
          ))
        )}
      </Card>

      <MemberModal open={addOpen} onOpenChange={setAddOpen} editId={null} />
    </div>
  )
}

function MembersSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex justify-between"><Skeleton className="h-8 w-32" /><Skeleton className="h-9 w-40" /></div>
      <div className="rounded-2xl overflow-hidden border border-slate-100">
        {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-none border-b border-slate-100" />)}
      </div>
    </div>
  )
}
