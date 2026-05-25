import { useState } from 'react'
import { Clock, MapPin, CalendarDays, Landmark, Building2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import MiniCalendar from '@/components/shared/MiniCalendar'
import { fmtDate, pad } from '@/lib/format'
import { useStore } from '@/hooks/useStore'

const TYPE_BADGE = { Show: 'default', Festival: 'blue', Casamento: 'success', Aniversário: 'warning', Corporativo: 'secondary', Outro: 'outline' }

export default function Shows({ isLoading }) {
  const { events } = useStore()
  const [selectedDay, setSelectedDay] = useState(null)

  const dayEvents = selectedDay
    ? events.filter((e) => {
        const d = new Date(e.date + 'T12:00:00')
        return d.getFullYear() === selectedDay.y && d.getMonth() === selectedDay.m && d.getDate() === selectedDay.d
      })
    : []

  const listEvents = [...events].sort((a, b) => a.date.localeCompare(b.date))

  if (isLoading) return <ShowsSkeleton />

  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Agenda</h1>
        <p className="text-sm text-slate-500 mt-0.5">Visualize os shows e compromissos da banda</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Calendar */}
        <Card className="lg:col-span-3 rounded-2xl">
          <CardContent className="p-4 md:p-5">
            <MiniCalendar events={events} onDaySelect={(y, m, d) => setSelectedDay({ y, m, d })} />
          </CardContent>

          {selectedDay && (
            <div className="border-t border-slate-100 px-4 md:px-5 pb-5 pt-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Eventos em {pad(selectedDay.d)}/{pad(selectedDay.m + 1)}/{selectedDay.y}
              </p>
              {dayEvents.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhum evento neste dia.</p>
              ) : (
                <div className="space-y-2">
                  {dayEvents.map((e) => (
                    <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-800">{e.name}</div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-400">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{e.time}–{e.end}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{e.local}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {e.visibility === 'publico' ? (
                          <Badge variant="blue" className="text-[10px] flex items-center gap-0.5">
                            <Landmark className="w-2.5 h-2.5" /> Pública
                          </Badge>
                        ) : e.visibility === 'privado' ? (
                          <Badge variant="secondary" className="text-[10px] flex items-center gap-0.5">
                            <Building2 className="w-2.5 h-2.5" /> Privada
                          </Badge>
                        ) : null}
                        <Badge variant={TYPE_BADGE[e.type] || 'outline'} className="text-[10px]">{e.type}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Events list — view only */}
        <Card className="lg:col-span-2 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle>Todos os Eventos</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-1 max-h-[60vh] lg:max-h-[calc(100vh-260px)] overflow-y-auto">
            {listEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <CalendarDays className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">Nenhum evento cadastrado</p>
                <p className="text-xs mt-0.5">Adicione eventos em Contratos</p>
              </div>
            ) : (
              listEvents.map((e) => {
                const d = new Date(e.date + 'T12:00:00')
                return (
                  <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors duration-150">
                    {/* Date block */}
                    <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex flex-col items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-orange-600 leading-none">{String(d.getDate()).padStart(2, '0')}</span>
                      <span className="text-[8px] text-orange-400 uppercase">
                        {d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800 truncate">{e.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />{e.time}
                        </span>
                        {e.visibility === 'publico' ? (
                          <Badge variant="blue" className="text-[10px] flex items-center gap-0.5">
                            <Landmark className="w-2.5 h-2.5" /> Pública
                          </Badge>
                        ) : e.visibility === 'privado' ? (
                          <Badge variant="secondary" className="text-[10px] flex items-center gap-0.5">
                            <Building2 className="w-2.5 h-2.5" /> Privada
                          </Badge>
                        ) : null}
                        <Badge variant={TYPE_BADGE[e.type] || 'outline'} className="text-[10px]">{e.type}</Badge>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ShowsSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-8 w-32" />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Skeleton className="lg:col-span-3 h-[460px] rounded-2xl" />
        <Skeleton className="lg:col-span-2 h-[460px] rounded-2xl" />
      </div>
    </div>
  )
}
