import { useState, useEffect, useRef, useMemo } from 'react'
import { ChevronDown, Search, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATES = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' },
]

async function fetchCoords(city, state) {
  try {
    const q = encodeURIComponent(`${city}, ${state}, Brazil`)
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'pt-BR' } }
    )
    const data = await res.json()
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {}
  return { lat: null, lng: null }
}

/* ── State dropdown ── */
function StateSelect({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const selected = STATES.find(s => s.sigla === value)

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-sm transition-all duration-150',
          'border-slate-200 bg-white text-slate-900 hover:border-orange-400',
          open && 'border-orange-400 ring-2 ring-orange-500/20'
        )}
      >
        <span className={selected ? 'text-slate-900' : 'text-slate-400'}>
          {selected ? `${selected.sigla} — ${selected.nome}` : 'Selecione o estado...'}
        </span>
        <ChevronDown className={cn('w-4 h-4 text-slate-400 shrink-0 transition-transform duration-150', open && 'rotate-180')} />
      </button>

      {open && (
        <ul className="absolute z-50 top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-y-auto max-h-52">
          {STATES.map(s => (
            <li
              key={s.sigla}
              onMouseDown={() => { onChange(s.sigla); setOpen(false) }}
              className={cn(
                'flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-orange-50 transition-colors text-sm',
                value === s.sigla && 'bg-orange-50 font-semibold text-orange-700'
              )}
            >
              <span className="font-mono text-xs font-bold text-slate-400 w-6 shrink-0">{s.sigla}</span>
              <span>{s.nome}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ── City dropdown ── */
function CityDropdown({ stateCode, value, onChange, disabled }) {
  const [cities, setCities] = useState([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    if (!stateCode) { setCities([]); return }
    let cancelled = false
    setLoading(true)
    setCities([])
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateCode}/municipios?orderBy=nome`)
      .then(r => r.json())
      .then(data => { if (cancelled) return; setCities(data.map(m => ({ id: m.id, name: m.nome }))) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [stateCode])

  useEffect(() => { setQuery('') }, [stateCode])

  const filtered = useMemo(() => {
    if (!query.trim()) return cities
    const q = query.toLowerCase()
    return cities.filter(c => c.name.toLowerCase().includes(q))
  }, [cities, query])

  const openDropdown = () => {
    if (!disabled && cities.length > 0) {
      setOpen(true)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={openDropdown}
        disabled={disabled || (stateCode && loading)}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-sm transition-all duration-150',
          'border-slate-200 bg-white text-slate-900 hover:border-orange-400',
          open && 'border-orange-400 ring-2 ring-orange-500/20',
          disabled && 'opacity-40 cursor-not-allowed hover:border-slate-200'
        )}
      >
        <span className={value ? 'text-slate-900' : 'text-slate-400'}>
          {loading ? 'Carregando cidades...' : value || 'Selecione a cidade...'}
        </span>
        {loading
          ? <Loader2 className="w-4 h-4 text-slate-400 shrink-0 animate-spin" />
          : <ChevronDown className={cn('w-4 h-4 text-slate-400 shrink-0 transition-transform duration-150', open && 'rotate-180')} />
        }
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 w-full overflow-hidden bg-white border border-slate-200 rounded-lg shadow-lg flex flex-col max-h-60">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Filtrar cidade..."
              className="flex-1 min-w-0 w-full max-w-full box-border text-sm outline-none text-slate-900 placeholder:text-slate-400 bg-transparent"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="text-slate-300 hover:text-slate-500">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <ul className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-sm text-slate-400 text-center">Nenhuma cidade encontrada</li>
            ) : filtered.map(c => (
              <li
                key={c.id}
                onMouseDown={() => { onChange(c.name); setOpen(false); setQuery('') }}
                className={cn(
                  'px-3 py-2 text-sm cursor-pointer hover:bg-orange-50 transition-colors',
                  value === c.name && 'bg-orange-50 font-semibold text-orange-700'
                )}
              >
                {c.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/* ── Main export ── */
export default function CitySelect({ city, state, onChange }) {
  const handleStateChange = (sigla) => {
    onChange?.({ city: '', state: sigla, lat: null, lng: null })
  }

  const handleCityChange = async (cityName) => {
    const coords = await fetchCoords(cityName, state)
    onChange?.({ city: cityName, state, ...coords })
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <StateSelect value={state} onChange={handleStateChange} />
      <CityDropdown
        stateCode={state}
        value={city}
        onChange={handleCityChange}
        disabled={!state}
      />
    </div>
  )
}
