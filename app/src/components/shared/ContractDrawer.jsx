import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Landmark, Building2, MapPin, Clock, Calendar, Music, Package } from 'lucide-react'
import { useStore } from '@/hooks/useStore'
import { fmtCurrency, fmtDate } from '@/lib/format'
import { cn } from '@/lib/utils'

function Section({ title, children }) {
  return (
    <div className="p-6 border-b border-slate-800 space-y-3">
      <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  )
}

function InfoRow({ icon, children }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="shrink-0 mt-0.5">{icon}</span>
      <span className="text-sm text-slate-200">{children}</span>
    </div>
  )
}

export default function ContractDrawer({ isOpen, onClose, event, onEdit }) {
  const {
    members, contractors, events,
    checklistItems, setlists, songs, equipment, showEquipment,
    getContractReceipt, getPayEntry,
  } = useStore()

  const receipt = event
    ? getContractReceipt(event.id)
    : { paid: false, partial: false, paidAmount: null, paidAt: null, partialPayments: [] }
  const { paid, partial, paidAt, partialPayments = [] } = receipt

  const eventDate = event?.date ? new Date(event.date + 'T12:00:00') : null
  const longDate  = eventDate
    ? eventDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '—'

  const eventContractors = event
    ? contractors.filter(c => (event.contractorIds || []).includes(c.id))
    : []

  const eventMembers = event
    ? members.filter(m => (event.members || []).includes(m.id))
    : []

  const eventChecklist = event ? checklistItems.filter(i => i.eventId === event.id) : []
  const doneCount  = eventChecklist.filter(i => i.done).length
  const totalCount = eventChecklist.length
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  const eventSetlist  = event ? setlists.find(sl => sl.eventId === event.id) : null
  const setlistSongs  = eventSetlist
    ? eventSetlist.songs.map(sid => songs.find(s => s.id === sid)).filter(Boolean)
    : []

  const eventShowEq  = event ? showEquipment.find(se => se.eventId === event.id) : null
  const eventEquip   = eventShowEq
    ? eventShowEq.equipmentIds.map(id => equipment.find(e => e.id === id)).filter(Boolean)
    : []
  const equipByCategory = eventEquip.reduce((acc, e) => {
    const cat = e.category || 'Outros'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(e)
    return acc
  }, {})

  const statusLabel = paid ? 'Pago' : partial ? 'Parcial' : 'Pendente'
  const statusColor = paid
    ? 'bg-emerald-500/20 text-emerald-400'
    : partial
    ? 'bg-amber-500/20 text-amber-400'
    : 'bg-slate-700 text-slate-400'

  return createPortal(
    <AnimatePresence>
      {isOpen && event && (
        <>
          {/* Overlay */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed right-0 inset-y-0 h-full w-full sm:w-96 bg-[#111111] border-l border-slate-800 z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-800 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-semibold text-white leading-tight">{event.name}</h2>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded-full">
                      {event.event_type === 'festival' ? 'Festival' : 'Show solo'}
                    </span>
                    {event.visibility === 'publico' && (
                      <span className="flex items-center gap-1 bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-full">
                        <Landmark className="w-3 h-3" /> Pública
                      </span>
                    )}
                    {event.visibility === 'privado' && (
                      <span className="flex items-center gap-1 bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded-full">
                        <Building2 className="w-3 h-3" /> Privada
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">

              {/* 1 — Show info */}
              <Section title="Informações do show">
                <div className="space-y-2.5">
                  <InfoRow icon={<Calendar className="w-4 h-4 text-slate-500" />}>
                    <span className="capitalize">{longDate}</span>
                  </InfoRow>
                  {(event.time || event.end) && (
                    <InfoRow icon={<Clock className="w-4 h-4 text-slate-500" />}>
                      {event.time}{event.end ? ` – ${event.end}` : ''}
                    </InfoRow>
                  )}
                  {event.local && (
                    <InfoRow icon={<MapPin className="w-4 h-4 text-slate-500" />}>
                      {event.local}
                    </InfoRow>
                  )}
                  {(event.city || event.state) && (
                    <InfoRow icon={<MapPin className="w-4 h-4 text-slate-500" />}>
                      {[event.city, event.state].filter(Boolean).join(', ')}
                    </InfoRow>
                  )}
                  {event.organizer_name && (
                    <InfoRow icon={
                      event.visibility === 'privado'
                        ? <Building2 className="w-4 h-4 text-slate-500" />
                        : <Landmark className="w-4 h-4 text-slate-500" />
                    }>
                      {event.organizer_name}
                    </InfoRow>
                  )}
                  {event.notes && (
                    <p className="text-xs text-slate-400 bg-slate-800/60 rounded-lg px-3 py-2 leading-relaxed mt-1">
                      {event.notes}
                    </p>
                  )}
                </div>
              </Section>

              {/* 2 — Contractors */}
              {eventContractors.length > 0 && (
                <Section title="Contratante">
                  <div className="space-y-2.5">
                    {eventContractors.map(c => {
                      const ltv = events
                        .filter(ev => (ev.contractorIds || []).includes(c.id))
                        .reduce((s, ev) => s + (ev.value || 0), 0)
                      return (
                        <div key={c.id}>
                          <p className="text-sm font-medium text-slate-200">{c.name}</p>
                          {(c.company || c.role) && (
                            <p className="text-xs text-slate-500">{c.company || c.role}</p>
                          )}
                          {ltv > 0 && (
                            <p className="text-xs text-slate-400 mt-0.5">LTV {fmtCurrency(ltv)}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </Section>
              )}

              {/* 3 — Financial */}
              <Section title="Financeiro">
                <div className="flex items-end justify-between gap-3">
                  <span className="text-2xl font-bold text-white">{fmtCurrency(event.value)}</span>
                  <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', statusColor)}>
                    {statusLabel}
                  </span>
                </div>
                {partialPayments.length > 0 && (
                  <div className="space-y-1.5 mt-3">
                    {partialPayments.map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-slate-800/60 px-3 py-2 rounded-lg">
                        <span className="text-slate-400">Parcela {i + 1}</span>
                        <div className="flex items-center gap-3">
                          {p.date && <span className="text-slate-500">{fmtDate(p.date)}</span>}
                          <span className="text-amber-400 font-medium">{fmtCurrency(p.amount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {paidAt && (
                  <p className="text-xs text-emerald-400 flex items-center gap-1.5 mt-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    Quitado em {new Date(paidAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </p>
                )}
              </Section>

              {/* 4 — Checklist */}
              {totalCount > 0 && (
                <Section title="Checklist">
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                      <span>{doneCount} de {totalCount} tarefas concluídas</span>
                      <span className="font-semibold text-slate-300">{progressPct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-full transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {eventChecklist.map(item => (
                      <div key={item.id} className="flex items-center gap-2.5">
                        <div className={cn(
                          'w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center',
                          item.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'
                        )}>
                          {item.done && (
                            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                              <path d="M1.5 5L3.5 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        <span className={cn('text-xs', item.done ? 'line-through text-slate-500' : 'text-slate-300')}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* 5 — Members */}
              {eventMembers.length > 0 && (
                <Section title="Membros escalados">
                  <div className="space-y-2.5">
                    {eventMembers.map(m => {
                      const entry = getPayEntry(event.id, m.id)
                      const base  = m.cache ?? 0
                      const valor = entry.customValue != null ? entry.customValue : (entry.doubled ? base * 2 : base)
                      const isPaid    = entry.paid
                      const isPartial = entry.partial && !entry.paid
                      return (
                        <div key={m.id} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              style={{ backgroundColor: m.color }}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                            >
                              {m.init}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm text-slate-200 font-medium truncate">{m.name}</p>
                              <p className="text-xs text-slate-500 truncate">{m.role}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-semibold text-slate-300">{fmtCurrency(valor)}</span>
                            <span className={cn(
                              'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                              isPaid    ? 'bg-emerald-500/20 text-emerald-400'
                              : isPartial ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-slate-700 text-slate-400'
                            )}>
                              {isPaid ? 'Pago' : isPartial ? 'Parcial' : 'Pend.'}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Section>
              )}

              {/* 6 — Equipment */}
              {Object.keys(equipByCategory).length > 0 && (
                <Section title="Equipamentos">
                  <div className="space-y-3">
                    {Object.entries(equipByCategory).map(([cat, items]) => (
                      <div key={cat}>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{cat}</p>
                        <div className="space-y-1.5">
                          {items.map(eq => (
                            <div key={eq.id} className="flex items-center gap-2">
                              <Package className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                              <span className="text-sm text-slate-300 truncate flex-1">{eq.name}</span>
                              {eq.brand && <span className="text-xs text-slate-500 shrink-0">{eq.brand}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* 7 — Setlist */}
              {setlistSongs.length > 0 && (
                <Section title={`Setlist${eventSetlist?.name ? ` — ${eventSetlist.name}` : ''}`}>
                  <div className="space-y-2">
                    {setlistSongs.map((song, i) => (
                      <div key={song.id} className="flex items-center gap-3">
                        <span className="text-xs font-mono text-slate-600 w-5 text-right shrink-0">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-slate-200 font-medium truncate">{song.title}</p>
                          {song.artist && <p className="text-xs text-slate-500 truncate">{song.artist}</p>}
                        </div>
                        <Music className="w-3 h-3 text-slate-700 shrink-0" />
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
