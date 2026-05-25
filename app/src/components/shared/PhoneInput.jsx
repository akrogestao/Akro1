import { cn } from '@/lib/utils'

function maskPhone(raw) {
  const d = raw.replace(/\D/g, '').slice(0, 11)
  if (!d) return ''
  if (d.length <= 2)  return `(${d}`
  if (d.length <= 6)  return `(${d.slice(0,2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
}

export default function PhoneInput({ value, onChange, placeholder = '(99) 99999-9999', className, id }) {
  const handleChange = (e) => {
    const masked = maskPhone(e.target.value)
    onChange?.(masked)
  }

  return (
    <input
      id={id}
      type="tel"
      inputMode="numeric"
      value={value || ''}
      onChange={handleChange}
      placeholder={placeholder}
      maxLength={16}
      className={cn(
        'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all duration-150',
        className
      )}
    />
  )
}

export { maskPhone }
