import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { MONTHS, MONTHS_SHORT, pad, trunc } from '@/lib/format'
import { cn } from '@/lib/utils'

const DAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

export default function MiniCalendar({ events = [], onDaySelect }) {
  const today = new Date()
  const [cal, setCal] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState(null)

  const y = cal.getFullYear(), m = cal.getMonth()
  const firstDay = new Date(y, m, 1).getDay()
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const prevDays = new Date(y, m, 0).getDate()

  const evMap = {}
  events.forEach((e) => {
    const d = new Date(e.date + 'T12:00:00')
    if (d.getFullYear() === y && d.getMonth() === m) {
      const k = d.getDate();
      (evMap[k] = evMap[k] || []).push(e)
    }
  })

  const nav = (dir) => setCal(new Date(y, m + dir, 1))

  const selectDay = (day) => {
    const key = `${y}-${pad(m + 1)}-${pad(day)}`
    setSelected(key)
    onDaySelect?.(y, m, day)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button onClick={() => nav(-1)} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all duration-150">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-slate-900 min-w-[120px] text-center">
            {MONTHS[m]} {y}
          </span>
          <button onClick={() => nav(1)} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all duration-150">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wide py-1">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {Array.from({ length: firstDay }, (_, i) => (
          <div key={`p${i}`} className="h-16 flex flex-col p-1 rounded-lg">
            <span className="text-[11px] text-slate-300">{prevDays - firstDay + i + 1}</span>
          </div>
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const isToday = y === today.getFullYear() && m === today.getMonth() && day === today.getDate()
          const isSel = selected === `${y}-${pad(m + 1)}-${pad(day)}`
          const dayEvs = evMap[day] || []
          return (
            <div
              key={day}
              onClick={() => selectDay(day)}
              className={cn(
                'h-16 flex flex-col p-1 rounded-lg cursor-pointer transition-all duration-150 group',
                isSel ? 'bg-orange-50 ring-1 ring-orange-200' : 'hover:bg-slate-50',
              )}
            >
              <span className={cn(
                'text-[11px] font-medium w-5 h-5 flex items-center justify-center rounded-full leading-none',
                isToday ? 'bg-orange-500 text-white' : isSel ? 'text-orange-700' : 'text-slate-600',
              )}>
                {day}
              </span>
              <div className="mt-0.5 space-y-0.5 overflow-hidden">
                {dayEvs.slice(0, 1).map((e) => (
                  <div key={e.id} className="text-[9px] bg-orange-100 text-orange-700 rounded px-1 leading-4 truncate font-medium">
                    {trunc(e.local, 9)}
                  </div>
                ))}
                {dayEvs.length > 1 && (
                  <div className="text-[9px] text-slate-400 px-1 leading-4">+{dayEvs.length - 1}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
