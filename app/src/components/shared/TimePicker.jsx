import { useRef, useEffect, useCallback } from 'react'
import { pad } from '@/lib/format'
import { cn } from '@/lib/utils'

const ITEM_H = 36   // height of each number row (px)
const PAD    = 2    // rows above/below center → total visible = PAD*2+1 = 5

function DrumRoller({ value, count, onChange }) {
  const el        = useRef(null)
  const snapTimer = useRef(null)
  const isProg    = useRef(false)

  /* Scroll to value whenever it changes externally */
  useEffect(() => {
    if (!el.current) return
    isProg.current = true
    el.current.scrollTop = value * ITEM_H
    const t = setTimeout(() => { isProg.current = false }, 60)
    return () => clearTimeout(t)
  }, [value])

  /* After scroll settles, snap to nearest integer position */
  const onScroll = useCallback(() => {
    if (isProg.current) return
    clearTimeout(snapTimer.current)
    snapTimer.current = setTimeout(() => {
      if (!el.current) return
      const idx = Math.max(0, Math.min(count - 1, Math.round(el.current.scrollTop / ITEM_H)))
      isProg.current = true
      el.current.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' })
      setTimeout(() => { isProg.current = false }, 320)
      onChange(idx)
    }, 100)
  }, [count, onChange])

  const clickItem = (i) => {
    if (!el.current) return
    isProg.current = true
    el.current.scrollTo({ top: i * ITEM_H, behavior: 'smooth' })
    setTimeout(() => { isProg.current = false }, 320)
    onChange(i)
  }

  const containerH = ITEM_H * (PAD * 2 + 1)

  return (
    <div className="relative select-none overflow-hidden rounded-lg" style={{ height: containerH, width: 52 }}>
      {/* Centre highlight bar */}
      <div
        className="absolute inset-x-0 pointer-events-none z-10 border-y border-orange-500/30 bg-orange-500/[0.07]"
        style={{ top: ITEM_H * PAD, height: ITEM_H }}
      />
      {/* Top fade */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none z-10"
        style={{ height: ITEM_H * PAD, background: 'linear-gradient(to bottom, hsl(var(--card,var(--background))) 30%, transparent)' }}
      />
      {/* Bottom fade */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none z-10"
        style={{ height: ITEM_H * PAD, background: 'linear-gradient(to top, hsl(var(--card,var(--background))) 30%, transparent)' }}
      />

      <div
        ref={el}
        onScroll={onScroll}
        className="h-full overflow-y-auto scrollbar-hide"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Top spacer */}
        <div style={{ height: ITEM_H * PAD }} />

        {Array.from({ length: count }, (_, i) => {
          const dist   = Math.abs(i - value)
          const active = dist === 0
          return (
            <div
              key={i}
              onClick={() => clickItem(i)}
              className={cn(
                'flex items-center justify-center cursor-pointer transition-all duration-100',
                'font-mono tabular-nums',
                active
                  ? 'text-orange-500 font-bold text-[15px]'
                  : dist === 1
                    ? 'text-slate-400 text-[13px]'
                    : 'text-slate-300 text-[11px]',
              )}
              style={{ height: ITEM_H, opacity: active ? 1 : dist === 1 ? 0.6 : 0.3 }}
            >
              {pad(i)}
            </div>
          )
        })}

        {/* Bottom spacer */}
        <div style={{ height: ITEM_H * PAD }} />
      </div>
    </div>
  )
}

export default function TimePicker({ value = '20:00', onChange }) {
  const [h, m] = (value || '20:00').split(':').map(Number)

  return (
    <div className="flex items-center justify-center gap-1.5 w-full bg-card border border-slate-200 rounded-xl px-3 py-2">
      <DrumRoller value={h} count={24} onChange={(v) => onChange?.(`${pad(v)}:${pad(m)}`)} />
      <span className="text-slate-400 font-bold text-lg leading-none pb-0.5 select-none">:</span>
      <DrumRoller value={m} count={60} onChange={(v) => onChange?.(`${pad(h)}:${pad(v)}`)} />
    </div>
  )
}
