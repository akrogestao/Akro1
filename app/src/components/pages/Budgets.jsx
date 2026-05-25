import { useState, useMemo, useCallback, useRef } from 'react'
import { useUnsavedGuard } from '@/hooks/useUnsavedGuard'
import { AnimatePresence, motion } from 'framer-motion'
import {
  FileText, Send, CheckCircle2, Clock, Plus, Pencil, Trash2, X, Info,
  Search, Landmark, Building2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import CurrencyInput from '@/components/shared/CurrencyInput'
import DatePicker from '@/components/shared/DatePicker'
import CitySelect from '@/components/shared/CitySelect'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { useStore } from '@/hooks/useStore'
import { usePlanLimits } from '@/hooks/usePlanLimits'
import UpgradeModal from '@/components/shared/UpgradeModal'
import { fmtCurrency, fmtDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { generateBudgetPdf } from '@/lib/pdfGenerator'

// ── Constants ─────────────────────────────────────────────
const SHOW_TYPES = [
  { value: 'show',     label: 'Show solo' },
  { value: 'festival', label: 'Festival'  },
]

const STATUS_FILTERS = ['Todos', 'Rascunho', 'Enviado', 'Aprovado']

const STATUS_BADGE = {
  Rascunho: 'secondary',
  Enviado:  'blue',
  Aprovado: 'success',
}

const BLANK_BUDGET = {
  name:           '',
  state:          '',
  city:           '',
  eventDate:      '',
  event_type:     'show',
  visibility:     'publico',
  organizer_name: '',
  costs: {
    cachet:        0,
    transport:     0,
    fuel:          0,
    food:          0,
    accommodation: 0,
    others:        [],
  },
  taxRate:      0,
  profitMode:   'percentage',
  profitValue:  0,
  finalValue:   0,
  status:       'Rascunho',
  validUntil:   '',
  notes:        '',
}

// ── Helpers ───────────────────────────────────────────────
function calcTotalCosts(costs) {
  return (
    (costs.cachet        || 0) +
    (costs.transport     || 0) +
    (costs.fuel          || 0) +
    (costs.food          || 0) +
    (costs.accommodation || 0) +
    (costs.others        || []).reduce((s, o) => s + (o.value || 0), 0)
  )
}

function calcDerivedValues(form) {
  const totalCosts  = calcTotalCosts(form.costs)
  const taxRate     = form.taxRate || 0
  const profitValue = form.profitValue || 0

  let finalValue
  if (form.profitMode === 'percentage') {
    const divisor = 1 - profitValue / 100 - taxRate / 100
    finalValue = divisor > 0.001 ? totalCosts / divisor : 0
  } else {
    const divisor = 1 - taxRate / 100
    finalValue = divisor > 0.001 ? (totalCosts + profitValue) / divisor : totalCosts + profitValue
  }

  const taxAmount    = finalValue * (taxRate / 100)
  const netProfit    = finalValue - totalCosts - taxAmount
  const netMarginPct = finalValue > 0 ? (netProfit / finalValue) * 100 : 0
  const minViable    = taxRate >= 100 ? Infinity : totalCosts === 0 ? 0 : totalCosts / (1 - taxRate / 100)

  const invalid   = form.profitMode === 'percentage' ? (profitValue + taxRate >= 100) : (taxRate >= 100)
  const semaphore = invalid ? 'red' : totalCosts === 0 && profitValue === 0 ? 'yellow' : 'green'

  return { totalCosts, taxAmount, netProfit, netMarginPct, minViable, semaphore, finalValue }
}

// ── BudgetsSkeleton ───────────────────────────────────────
function BudgetsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2].map(i => <Skeleton key={i} className="h-52 rounded-2xl" />)}
      </div>
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, barColor, highlight }) {
  return (
    <div className={cn(
      'bg-white rounded-2xl border p-4 space-y-2 transition-colors',
      highlight ? 'border-orange-300 bg-orange-50/40' : 'border-slate-200',
    )}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</span>
        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', barColor + '/15')}>
          <Icon className={cn('w-4 h-4', barColor.replace('bg-', 'text-'))} />
        </div>
      </div>
      <p className={cn('text-2xl font-bold', highlight ? 'text-orange-500' : 'text-slate-900')}>{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
      <div className={cn('h-1 rounded-full', barColor, 'opacity-30')} />
    </div>
  )
}

// ── BudgetCard ────────────────────────────────────────────
function BudgetCard({ budget, onEdit, onDelete, onApprove, onPdf, onSend }) {
  const totalCosts  = calcTotalCosts(budget.costs)
  const taxAmount   = budget.finalValue * (budget.taxRate / 100)
  const estProfit   = budget.finalValue - totalCosts - taxAmount

  const isExpired = budget.validUntil
    ? new Date(budget.validUntil + 'T12:00:00') < new Date()
    : false

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 hover:shadow-sm transition-shadow">
      {/* Top row */}
      <div className="flex items-start gap-2">
        <span className="text-sm font-semibold text-slate-900 truncate flex-1 leading-snug">{budget.name || '—'}</span>
        <Badge variant={STATUS_BADGE[budget.status] || 'secondary'} className="shrink-0 text-[10px]">
          {budget.status}
        </Badge>
      </div>

      {/* City + date */}
      <p className="text-xs text-slate-500">
        {budget.city || '—'}{budget.eventDate ? ` · ${fmtDate(budget.eventDate)}` : ''}
      </p>

      {/* Final value */}
      <p className="text-2xl font-bold text-slate-900">{fmtCurrency(budget.finalValue)}</p>

      {/* Validity (only when Enviado) */}
      {budget.status === 'Enviado' && budget.validUntil && (
        <p className={cn('text-xs', isExpired ? 'text-red-500 font-semibold' : 'text-slate-500')}>
          Válido até {fmtDate(budget.validUntil)}{isExpired ? ' — Expirado' : ''}
        </p>
      )}

      {/* Cost summary */}
      <p className="text-xs text-slate-400 leading-relaxed">
        Custos: {fmtCurrency(totalCosts)} · Imposto: {fmtCurrency(taxAmount)} · Lucro est.: {fmtCurrency(estProfit)}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-1 justify-end pt-1 border-t border-slate-100">
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors text-[11px] font-medium flex items-center gap-1"
          title="Editar"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onPdf}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors text-[11px] font-medium flex items-center gap-1"
          title="Gerar PDF"
        >
          <FileText className="w-3.5 h-3.5" />
        </button>

        {budget.status === 'Rascunho' && (
          <button
            onClick={onSend}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors text-[11px] font-medium flex items-center gap-1"
            title="Marcar como enviado"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        )}

        {budget.status !== 'Aprovado' && (
          <button
            onClick={onApprove}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors text-[11px] font-medium flex items-center gap-1"
            title="Aprovar"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors text-[11px] font-medium flex items-center gap-1"
          title="Excluir"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── CostField ─────────────────────────────────────────────
function CostField({ label, sublabel, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-600">
        {label}
        {sublabel && <span className="text-slate-400 font-normal ml-1">({sublabel})</span>}
      </label>
      <CurrencyInput value={value} onChange={onChange} />
    </div>
  )
}

// ── BudgetDialog ──────────────────────────────────────────
function BudgetDialog({ open, onOpenChange, initial, onSave }) {
  const { members, companyProfile } = useStore()

  const initialJsonRef = useRef(null)
  const [form, setForm] = useState(() => {
    if (initial) {
      initialJsonRef.current = JSON.stringify(initial)
      return initial
    }
    const cachet = members.reduce((s, m) => s + (m.cache || 0), 0)
    const days = companyProfile.proposalValidityDays ?? 30
    const d = new Date()
    d.setDate(d.getDate() + days)
    const validUntil = d.toISOString().split('T')[0]
    const initState = { ...BLANK_BUDGET, costs: { ...BLANK_BUDGET.costs, cachet }, validUntil }
    initialJsonRef.current = JSON.stringify(initState)
    return initState
  })

  const isDirty = useMemo(
    () => JSON.stringify(form) !== initialJsonRef.current,
    [form]
  )
  const { guard, UnsavedDialog } = useUnsavedGuard(isDirty)
  const handleClose = () => guard(() => onOpenChange(false))

  const set = useCallback((key, val) => setForm(prev => ({ ...prev, [key]: val })), [])
  const setCosts = useCallback((key, val) => setForm(prev => ({
    ...prev,
    costs: { ...prev.costs, [key]: val },
  })), [])

  const derived = useMemo(() => calcDerivedValues(form), [form])

  const addOther = () => {
    setForm(prev => ({
      ...prev,
      costs: {
        ...prev.costs,
        others: [...(prev.costs.others || []), { id: Date.now(), description: '', value: 0 }],
      },
    }))
  }

  const updateOther = (id, key, val) => {
    setForm(prev => ({
      ...prev,
      costs: {
        ...prev.costs,
        others: prev.costs.others.map(o => o.id === id ? { ...o, [key]: val } : o),
      },
    }))
  }

  const removeOther = (id) => {
    setForm(prev => ({
      ...prev,
      costs: {
        ...prev.costs,
        others: prev.costs.others.filter(o => o.id !== id),
      },
    }))
  }

  const handleSave = (targetStatus) => {
    if (!form.name.trim()) { toast.error('Nome interno obrigatório.'); return }
    if (!form.state)       { toast.error('Selecione o estado.'); return }
    if (!form.city.trim()) { toast.error('Selecione a cidade.'); return }
    const payload = { ...form, finalValue: derived.finalValue }
    if (targetStatus) payload.status = targetStatus
    onSave(payload)
    onOpenChange(false)
  }

  const semColors = { red: 'bg-red-500', yellow: 'bg-amber-400', green: 'bg-emerald-500' }
  const semLabels = { red: 'Configuração inválida', yellow: 'Nenhum custo definido', green: 'Configuração válida' }

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => { if (v) onOpenChange(v); else handleClose() }}>
      <DialogContent className="max-w-2xl overflow-y-visible p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-lg font-bold text-slate-900">
            {initial ? 'Editar orçamento' : 'Novo orçamento'}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto overflow-x-hidden max-h-[calc(90vh-8rem)] px-6 pb-2">
          {/* ── Section 1: Informações do Show ── */}
          <div className="pt-5">
            <p className="text-sm font-semibold text-orange-500 uppercase tracking-wider mb-6">
              Informações do Show
            </p>

            {/* Nome (full width) */}
            <div className="space-y-1.5 mb-5">
              <Label htmlFor="b-name">Nome interno <span className="text-red-400">*</span></Label>
              <Input
                id="b-name"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="São João — Caruaru"
              />
            </div>

            {/* Estado + Cidade */}
            <div className="space-y-1.5 mb-5">
              <Label>Cidade do show <span className="text-red-400">*</span></Label>
              <CitySelect
                city={form.city}
                state={form.state}
                onChange={({ city, state, lat, lng }) => setForm(p => ({ ...p, city, state, lat: lat ?? p.lat, lng: lng ?? p.lng }))}
              />
            </div>

            {/* Date + Tipo de show */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div className="space-y-1.5">
                <Label htmlFor="b-date">Data prevista</Label>
                <DatePicker
                  value={form.eventDate}
                  onChange={(v) => set('eventDate', v)}
                  placeholder="Selecione a data..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de show</Label>
                <div className="flex gap-2">
                  {SHOW_TYPES.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => set('event_type', t.value)}
                      className={cn(
                        'flex-1 py-2 text-xs font-semibold rounded-lg border transition-all duration-150',
                        form.event_type === t.value
                          ? 'bg-orange-500 border-orange-500 text-white'
                          : 'border-slate-200 text-slate-600 hover:border-orange-300 hover:text-orange-600'
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Iniciativa */}
            <div className="space-y-1.5 mb-5">
              <Label>Iniciativa</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => set('visibility', 'publico')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg border transition-all duration-150',
                    form.visibility === 'publico'
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : 'border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'
                  )}
                >
                  <Landmark className="w-3.5 h-3.5" /> Pública
                </button>
                <button
                  type="button"
                  onClick={() => set('visibility', 'privado')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg border transition-all duration-150',
                    form.visibility === 'privado'
                      ? 'bg-slate-700 border-slate-700 text-white'
                      : 'border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-700'
                  )}
                >
                  <Building2 className="w-3.5 h-3.5" /> Privada
                </button>
              </div>
            </div>

            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={form.visibility}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                style={{ overflow: 'hidden' }}
                className="space-y-1.5 mb-5"
              >
                <Label>
                  {form.visibility === 'publico' ? 'Órgão contratante' : 'Empresa ou produtor contratante'}
                </Label>
                <Input
                  value={form.organizer_name || ''}
                  onChange={e => set('organizer_name', e.target.value)}
                  placeholder={form.visibility === 'publico' ? 'Órgão contratante' : 'Empresa ou produtor contratante'}
                />
              </motion.div>
            </AnimatePresence>

            {/* Válida por */}
            <div className="space-y-1.5 mb-5">
              <Label>Válida por</Label>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 leading-tight">
                {form.validUntil ? fmtDate(form.validUntil) : '—'}
                <span className="block text-[11px] text-slate-400 mt-0.5">
                  {companyProfile.proposalValidityDays ?? 30} dias · ajuste em Configurações
                </span>
              </div>
            </div>

            {/* Notes (full width) */}
            <div className="space-y-1.5">
              <Label htmlFor="b-notes">Notas internas</Label>
              <textarea
                id="b-notes"
                rows={2}
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Observações internas..."
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 transition-all resize-none"
              />
            </div>
          </div>

          <div className="my-8 flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* ── Section 2: Composição de Custos ── */}
          <div>
            <p className="text-sm font-semibold text-orange-500 uppercase tracking-wider mb-6">
              Composição de Custos
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5 mb-5">
              <CostField
                label="Cachê dos músicos"
                value={form.costs.cachet}
                onChange={v => setCosts('cachet', v)}
              />
              <CostField
                label="Transporte"
                sublabel="km × R$/km"
                value={form.costs.transport}
                onChange={v => setCosts('transport', v)}
              />
              <CostField
                label="Combustível"
                value={form.costs.fuel}
                onChange={v => setCosts('fuel', v)}
              />
              <CostField
                label="Alimentação"
                value={form.costs.food}
                onChange={v => setCosts('food', v)}
              />
              <CostField
                label="Hospedagem"
                value={form.costs.accommodation}
                onChange={v => setCosts('accommodation', v)}
              />
            </div>

            {/* Outros custos */}
            <div className="space-y-2.5 mb-5">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Outros custos</p>
              {(form.costs.others || []).map(o => (
                <div key={o.id} className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <input
                    type="text"
                    value={o.description}
                    onChange={e => updateOther(o.id, 'description', e.target.value)}
                    placeholder="Descrição"
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 transition-all min-w-0"
                  />
                  <div className="flex items-center gap-2 sm:gap-2">
                    <div className="flex-1 sm:flex-none sm:w-32">
                      <CurrencyInput
                        value={o.value}
                        onChange={v => updateOther(o.id, 'value', v)}
                      />
                    </div>
                    <button
                      onClick={() => removeOther(o.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={addOther} className="text-slate-500">
                <Plus className="w-3.5 h-3.5 mr-1" />
                Adicionar item
              </Button>
            </div>

            {/* Total costs box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-slate-600">Total de custos</span>
              <span className="text-sm font-bold text-slate-900">{fmtCurrency(derived.totalCosts)}</span>
            </div>
          </div>

          <div className="my-8 flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* ── Section 3: Definição do Valor Final ── */}
          <div>
            <p className="text-sm font-semibold text-orange-500 uppercase tracking-wider mb-6">
              Definição do Valor Final
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
              {/* Block 1 — Imposto */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-600">Imposto</p>
                <p className="text-2xl font-bold text-orange-500">{form.taxRate.toFixed(1)}%</p>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.5"
                  value={form.taxRate}
                  onChange={e => set('taxRate', parseFloat(e.target.value))}
                  className="w-full accent-orange-500 cursor-pointer h-2"
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={form.taxRate}
                  onChange={e => set('taxRate', Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-900 outline-none focus:border-orange-400 transition-all"
                />
                <p className="text-[11px] text-slate-400">
                  Imposto: {fmtCurrency(form.finalValue * form.taxRate / 100)}
                </p>
              </div>

              {/* Block 2 — Lucro */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-600">Lucro desejado</p>

                {/* Segmented toggle */}
                <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
                  {['percentage', 'fixed'].map(mode => (
                    <button
                      key={mode}
                      onClick={() => set('profitMode', mode)}
                      className={cn(
                        'flex-1 rounded-md text-[11px] font-medium py-1 transition-all',
                        form.profitMode === mode
                          ? 'bg-white shadow text-slate-900'
                          : 'text-slate-500 hover:text-slate-700',
                      )}
                    >
                      {mode === 'percentage' ? 'Percentual' : 'Valor fixo'}
                    </button>
                  ))}
                </div>

                {form.profitMode === 'percentage' ? (
                  <div className="space-y-1">
                    <p className="text-xl font-bold text-orange-500">{(form.profitValue || 0).toFixed(1)}%</p>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="0.5"
                      value={form.profitValue || 0}
                      onChange={e => set('profitValue', parseFloat(e.target.value))}
                      className="w-full accent-orange-500 cursor-pointer h-2"
                    />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={form.profitValue || 0}
                      onChange={e => set('profitValue', Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-900 outline-none focus:border-orange-400 transition-all"
                    />
                  </div>
                ) : (
                  <CurrencyInput
                    value={form.profitValue}
                    onChange={v => set('profitValue', v)}
                  />
                )}

                <p className="text-[11px] text-slate-400">
                  {form.profitMode === 'percentage'
                    ? `= ${fmtCurrency(form.finalValue * form.profitValue / 100)}`
                    : `= ${form.finalValue > 0
                        ? ((form.profitValue / form.finalValue) * 100).toFixed(1).replace('.', ',')
                        : '0,0'}% do valor final`
                  }
                </p>
              </div>

              {/* Block 3 — Mínimo viável */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-1">
                  <p className="text-xs font-semibold text-slate-600">Mínimo viável</p>
                  <Info
                    className="w-3 h-3 text-slate-400 cursor-help"
                    title="Valor mínimo para cobrir todos os custos e impostos sem lucro"
                  />
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <p className="text-lg font-bold text-slate-700">
                    {derived.minViable === Infinity ? '∞' : fmtCurrency(derived.minViable)}
                  </p>
                </div>
                <p className="text-[11px] text-slate-400">
                  Cobre custos + impostos sem margem de lucro.
                </p>
              </div>
            </div>

            {/* Final value (auto-computed) */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-800">Valor a cobrar do contratante</p>
              <div className="bg-orange-50 border-2 border-orange-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-orange-500 uppercase tracking-wide">Calculado automaticamente</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Custos + lucro + impostos</p>
                </div>
                <p className="text-xl font-bold text-orange-600 shrink-0">{fmtCurrency(derived.finalValue)}</p>
              </div>

              {/* Indicator chips */}
              <div className="flex flex-wrap gap-2">
                <span className={cn(
                  'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border',
                  derived.netProfit >= 0
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-red-50 text-red-600 border-red-200',
                )}>
                  Lucro líquido: {fmtCurrency(derived.netProfit)}
                </span>
                <span className={cn(
                  'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border',
                  derived.netMarginPct >= 0
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-red-50 text-red-600 border-red-200',
                )}>
                  Margem: {derived.netMarginPct.toFixed(1).replace('.', ',')}%
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-200 bg-white">
                  <span className={cn('w-2 h-2 rounded-full', semColors[derived.semaphore])} />
                  {semLabels[derived.semaphore]}
                </span>
              </div>
            </div>
          </div>

          <div className="pb-4" />
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-slate-800 bg-white rounded-b-2xl">
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
            <Badge variant={STATUS_BADGE[form.status] || 'secondary'} className="text-[11px] self-start">
              {form.status}
            </Badge>
            <div className="flex flex-wrap justify-end items-center gap-2">
              <Button variant="outline" className="h-10 px-4" onClick={handleClose}>
                Cancelar
              </Button>
              <Button variant="outline" className="h-10 px-4" onClick={() => handleSave(null)}>
                Salvar rascunho
              </Button>
              {form.status !== 'Aprovado' && (
                <Button className="h-10 px-4 bg-orange-500 hover:bg-orange-600 text-white" onClick={() => handleSave('Enviado')}>
                  Marcar como enviado
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {UnsavedDialog}
    </>
  )
}

// ── Main Component ────────────────────────────────────────
export default function Budgets({ isLoading, onNav }) {
  const { budgets, addBudget, updateBudget, deleteBudget, approveBudget, companyProfile } = useStore()
  const { isFeatureAvailable, plan } = usePlanLimits()

  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [dialogOpen, setDialogOpen]   = useState(false)
  const [editBudget, setEditBudget]   = useState(null)
  const [deleteId, setDeleteId]       = useState(null)
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  // ── KPIs ──────────────────────────────────────────────
  const kpis = useMemo(() => {
    const today = new Date()
    const in7   = new Date(today); in7.setDate(today.getDate() + 7)

    const totalCount    = budgets.length
    const sentValue     = budgets.filter(b => b.status === 'Enviado').reduce((s, b) => s + (b.finalValue || 0), 0)
    const sentCount     = budgets.filter(b => b.status === 'Enviado').length
    const approvedValue = budgets.filter(b => b.status === 'Aprovado').reduce((s, b) => s + (b.finalValue || 0), 0)
    const approvedCount = budgets.filter(b => b.status === 'Aprovado').length
    const expiringSoon  = budgets.filter(b => {
      if (b.status !== 'Enviado' || !b.validUntil) return false
      const d = new Date(b.validUntil + 'T12:00:00')
      return d >= today && d <= in7
    }).length

    return { totalCount, sentValue, sentCount, approvedValue, approvedCount, expiringSoon }
  }, [budgets])

  // ── Filtered list ──────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return budgets.filter(b => {
      const matchSearch = !q || b.name.toLowerCase().includes(q) || b.city.toLowerCase().includes(q)
      const matchStatus = statusFilter === 'Todos' || b.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [budgets, search, statusFilter])

  // ── Handlers ──────────────────────────────────────────
  const openCreate = () => {
    if (!isFeatureAvailable('hasOrcamentos')) { setUpgradeOpen(true); return }
    setEditBudget(null)
    setDialogOpen(true)
  }
  const openEdit   = (b) => { setEditBudget(b); setDialogOpen(true) }

  const handleSave = (payload) => {
    if (editBudget) {
      updateBudget(editBudget.id, payload)
    } else {
      addBudget(payload)
    }
    toast.success('Orçamento salvo!')
  }

  const handleDelete = () => {
    deleteBudget(deleteId)
    setDeleteId(null)
    toast.success('Orçamento excluído.')
  }

  const handleApprove = (budget) => {
    const approved = approveBudget(budget.id)
    toast.success('Orçamento aprovado!')
    setTimeout(() => onNav('contracts', approved), 600)
  }

  const handleSend = (budget) => {
    updateBudget(budget.id, { status: 'Enviado' })
    toast.success('Orçamento marcado como enviado.')
  }

  const handlePdf = async (budget) => {
    try {
      await generateBudgetPdf({ budget, companyProfile })
      toast.success('PDF gerado!')
    } catch {
      toast.error('Erro ao gerar PDF.')
    }
  }

  if (isLoading) return <BudgetsSkeleton />

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Orçamentos</h1>
          <p className="text-sm text-slate-500">Propostas e precificação de shows</p>
        </div>
        <Button onClick={openCreate} className="bg-orange-500 hover:bg-orange-600 text-white shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Novo orçamento
        </Button>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={FileText}
          label="Total Orçamentos"
          value={kpis.totalCount}
          sub={`${kpis.totalCount === 1 ? 'proposta' : 'propostas'} criadas`}
          barColor="bg-orange-500"
        />
        <KpiCard
          icon={Send}
          label="Propostas Enviadas"
          value={fmtCurrency(kpis.sentValue)}
          sub={`${kpis.sentCount} enviadas`}
          barColor="bg-blue-500"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Total Aprovado"
          value={fmtCurrency(kpis.approvedValue)}
          sub={`${kpis.approvedCount} aprovados`}
          barColor="bg-emerald-500"
        />
        <KpiCard
          icon={Clock}
          label="Próximos do Vencimento"
          value={kpis.expiringSoon}
          sub="nos próximos 7 dias"
          barColor="bg-orange-500"
          highlight={kpis.expiringSoon > 0}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou cidade..."
            className="pl-9"
          />
        </div>

        {/* Status pills */}
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
                statusFilter === s
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Budget grid or empty state */}
      <AnimatePresence mode="popLayout">
        {filtered.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <FileText className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-slate-700 font-semibold mb-1">Nenhum orçamento encontrado</p>
            <p className="text-sm text-slate-400 mb-5">
              {search || statusFilter !== 'Todos'
                ? 'Tente ajustar os filtros de busca.'
                : 'Crie sua primeira proposta comercial.'}
            </p>
            {!search && statusFilter === 'Todos' && (
              <Button onClick={openCreate} className="bg-orange-500 hover:bg-orange-600 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Novo orçamento
              </Button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            <AnimatePresence>
              {filtered.map(b => (
                <motion.div
                  key={b.id}
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <BudgetCard
                    budget={b}
                    onEdit={() => openEdit(b)}
                    onDelete={() => setDeleteId(b.id)}
                    onApprove={() => handleApprove(b)}
                    onPdf={() => handlePdf(b)}
                    onSend={() => handleSend(b)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Budget create/edit dialog */}
      {dialogOpen && (
        <BudgetDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          initial={editBudget}
          onSave={handleSave}
        />
      )}

      <UpgradeModal
        isOpen={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        feature="Criar orçamentos e propostas comerciais"
        currentPlan={plan}
      />

      {/* Confirm delete */}
      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={open => { if (!open) setDeleteId(null) }}
        title="Excluir orçamento?"
        description="Esta ação não pode ser desfeita. O orçamento será removido permanentemente."
        onConfirm={handleDelete}
        confirmLabel="Excluir"
        confirmVariant="destructive"
      />
    </div>
  )
}
