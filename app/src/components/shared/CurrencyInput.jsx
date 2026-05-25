import { useState, useEffect, useRef } from 'react'
import { parseBRL } from '@/lib/format'
import { cn } from '@/lib/utils'

function toDisplay(cents) {
  if (!cents && cents !== 0) return ''
  const reais = cents / 100
  return 'R$ ' + reais.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function centsFromDisplay(str) {
  const digits = str.replace(/\D/g, '')
  return digits ? parseInt(digits, 10) : 0
}

export default function CurrencyInput({ value, onChange, className, placeholder = 'R$ 0,00', id }) {
  const [display, setDisplay] = useState(() => value > 0 ? toDisplay(Math.round(value * 100)) : '')
  const skipEffect = useRef(false)

  useEffect(() => {
    if (skipEffect.current) { skipEffect.current = false; return }
    setDisplay(value > 0 ? toDisplay(Math.round(value * 100)) : '')
  }, [value])

  const handleChange = (e) => {
    const raw   = e.target.value
    const cents = centsFromDisplay(raw)
    const next  = cents > 0 ? toDisplay(cents) : ''
    setDisplay(next)
    skipEffect.current = true
    onChange?.(cents / 100)
  }

  const handleBlur = () => {
    const cents = centsFromDisplay(display)
    const next  = cents > 0 ? toDisplay(cents) : ''
    setDisplay(next)
    onChange?.(cents / 100)
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={cn(
        'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all duration-150 tabular-nums',
        className
      )}
    />
  )
}
