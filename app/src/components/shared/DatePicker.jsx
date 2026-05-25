import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const WEEKDAYS    = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function pad(n) { return String(n).padStart(2, '0') }
function toStr(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}` }
function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate() }
function getFirstWeekDay(y, m) { return new Date(y, m, 1).getDay() }

export default function DatePicker({ value, onChange, placeholder = 'Selecione a data...', disabled = false, light = false }) {
  const ref   = useRef(null)
  const today = new Date()
  const todayStr = toStr(today.getFullYear(), today.getMonth(), today.getDate())

  const parseValue = () => {
    if (!value) return { year: today.getFullYear(), month: today.getMonth() }
    const [y, m] = value.split('-').map(Number)
    return { year: y, month: m - 1 }
  }

  const [open,      setOpen]      = useState(false)
  const [viewYear,  setViewYear]  = useState(() => parseValue().year)
  const [viewMonth, setViewMonth] = useState(() => parseValue().month)

  useEffect(() => {
    if (value) {
      const [y, m] = value.split('-').map(Number)
      setViewYear(y); setViewMonth(m - 1)
    }
  }, [value])

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const prevMonthYear  = viewMonth === 0 ? viewYear - 1 : viewYear
  const prevMonthIndex = viewMonth === 0 ? 11 : viewMonth - 1
  const nextMonthYear  = viewMonth === 11 ? viewYear + 1 : viewYear
  const nextMonthIndex = viewMonth === 11 ? 0 : viewMonth + 1

  const daysInCur  = getDaysInMonth(viewYear, viewMonth)
  const daysInPrev = getDaysInMonth(prevMonthYear, prevMonthIndex)
  const firstDay   = getFirstWeekDay(viewYear, viewMonth)

  const cells = []
  for (let i = firstDay - 1; i >= 0; i--)
    cells.push({ day: daysInPrev - i, month: prevMonthIndex, year: prevMonthYear, other: true })
  for (let d = 1; d <= daysInCur; d++)
    cells.push({ day: d, month: viewMonth, year: viewYear, other: false })
  while (cells.length < 42)
    cells.push({ day: cells.length - firstDay - daysInCur + 1, month: nextMonthIndex, year: nextMonthYear, other: true })

  const prevMonth = () => { setViewMonth(prevMonthIndex); setViewYear(prevMonthYear) }
  const nextMonth = () => { setViewMonth(nextMonthIndex); setViewYear(nextMonthYear) }
  const select    = (cell) => { onChange(toStr(cell.year, cell.month, cell.day)); setOpen(false) }

  const displayValue = value
    ? new Date(value + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) setOpen(o => !o) }}
        className={cn(
          'w-full h-11 flex items-center justify-between gap-2 px-3 rounded-lg border text-sm transition-all duration-150 select-none',
          light ? 'bg-white border-slate-200 text-slate-700' : 'bg-[#1a1a1a] border-slate-700 text-white',
          open     && 'border-orange-500 ring-2 ring-orange-500/20',
          disabled && 'opacity-40 cursor-not-allowed'
        )}
      >
        <span className={displayValue ? (light ? 'text-slate-700' : 'text-white') : (light ? 'text-slate-400' : 'text-slate-500')}>
          {displayValue ?? placeholder}
        </span>
        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
      </button>

      {/* Dropdown — absolute positioned, overlays content below */}
      {open && (
        <div className={cn(
          'absolute top-full left-0 mt-1 z-50 w-full min-w-[240px] rounded-xl shadow-xl p-3 select-none border',
          light ? 'bg-white border-slate-200' : 'bg-[#1a1a1a] border-slate-800'
        )}>
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth}
              className={cn('p-1.5 rounded-lg text-slate-400 transition-colors', light ? 'hover:text-slate-700 hover:bg-slate-100' : 'hover:text-white hover:bg-slate-800')}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className={cn('font-medium text-sm', light ? 'text-slate-800' : 'text-white')}>{MONTH_NAMES[viewMonth]} {viewYear}</span>
            <button type="button" onClick={nextMonth}
              className={cn('p-1.5 rounded-lg text-slate-400 transition-colors', light ? 'hover:text-slate-700 hover:bg-slate-100' : 'hover:text-white hover:bg-slate-800')}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map(w => (
              <div key={w} className="text-center text-[10px] font-semibold text-slate-500 py-1">{w}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((cell, i) => {
              const str        = toStr(cell.year, cell.month, cell.day)
              const isSelected = str === value
              const isToday    = str === todayStr
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => select(cell)}
                  className={cn(
                    'h-7 w-full flex items-center justify-center rounded-lg text-xs font-medium transition-colors duration-100',
                    cell.other && !isSelected && (light ? 'text-slate-300' : 'text-slate-600'),
                    !cell.other && !isSelected && !isToday && (light ? 'text-slate-700 hover:bg-slate-100' : 'text-white hover:bg-slate-800'),
                    isSelected && 'bg-orange-500 text-white',
                    isToday && !isSelected && (light ? 'border border-orange-500 text-orange-500 hover:bg-orange-50' : 'border border-orange-500 text-orange-500 hover:bg-slate-800'),
                  )}
                >
                  {cell.day}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
