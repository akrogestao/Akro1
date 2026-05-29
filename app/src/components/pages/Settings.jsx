import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useUnsavedGuard } from '@/hooks/useUnsavedGuard'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, CalendarDays, Users, TrendingUp, FileText, Receipt, Building2,
  BarChart2, CheckSquare, Music, Music2, Package, Calculator, Moon, Sun, Bell,
  UserCheck, ShieldCheck, Pencil, Save, X, Plus, Eye, EyeOff, Trash2,
  Globe, CheckCircle2, ImageOff, Upload,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import PhoneInput from '@/components/shared/PhoneInput'
import { useStore } from '@/hooks/useStore'
import { usePlanLimits } from '@/hooks/usePlanLimits'
import { supabase } from '@/lib/supabase'
import UpgradeModal from '@/components/shared/UpgradeModal'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const MODULES = [
  { key: 'dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
  { key: 'shows',       label: 'Agenda',       icon: CalendarDays },
  { key: 'members',     label: 'Membros',      icon: Users },
  { key: 'financial',   label: 'Financeiro',   icon: TrendingUp },
  { key: 'contracts',   label: 'Contratos',    icon: FileText },
  { key: 'contractors', label: 'Contratantes', icon: Building2 },
  { key: 'logistics',   label: 'Despesas',     icon: Receipt },
  { key: 'checklist',   label: 'Checklist',    icon: CheckSquare },
  { key: 'repertoire',  label: 'Repertório',   icon: Music },
  { key: 'rehearsals',  label: 'Ensaios',      icon: Music2 },
  { key: 'equipment',   label: 'Equipamentos', icon: Package },
  { key: 'budgets',     label: 'Orçamentos',   icon: Calculator },
  { key: 'reports',     label: 'Relatórios',   icon: BarChart2 },
]

const NOTIFICATION_ITEMS = [
  { key: 'urgentChecklist',       label: 'Checklist urgente',      desc: 'Itens marcados como urgentes' },
  { key: 'latePayments',          label: 'Pagamentos atrasados',   desc: 'Cachês pendentes de shows passados' },
  { key: 'inactiveContractors',   label: 'Contratantes inativos',  desc: 'Sem shows há mais de 1 ano' },
  { key: 'pendingChecklist',      label: 'Checklist pendente',     desc: 'Shows com itens não concluídos' },
  { key: 'showsWithoutChecklist', label: 'Shows sem checklist',    desc: 'Eventos sem itens de checklist' },
]

const DEFAULT_PERMISSIONS = Object.fromEntries(MODULES.map(m => [m.key, 'edit']))

function formatCnpj(raw) {
  const d = raw.replace(/\D/g, '').slice(0, 14)
  if (d.length <= 2)  return d
  if (d.length <= 5)  return `${d.slice(0,2)}.${d.slice(2)}`
  if (d.length <= 8)  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
}

const fadeSlide = {
  initial: { opacity: 0, y: 5 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -5 },
  transition: { duration: 0.18 },
}

function Field({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
      <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">{label}</span>
      <span className="text-sm text-slate-900 dark:text-slate-100 text-right break-all">{value || '—'}</span>
    </div>
  )
}

function SectionCard({ title, subtitle, icon: Icon, action, children }) {
  return (
    <Card className="rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 p-4 border-b border-slate-100 dark:border-slate-700">
        <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/30 border border-orange-100 dark:border-orange-800/40 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-orange-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-4 sm:p-5">
        {children}
      </div>
    </Card>
  )
}

function SaveCancelBar({ onSave, onCancel, saving }) {
  return (
    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-700 mt-4">
      <Button variant="outline" size="sm" onClick={onCancel} className="gap-1.5">
        <X className="w-3.5 h-3.5" /> Cancelar
      </Button>
      <Button size="sm" onClick={onSave} disabled={saving} className="gap-1.5">
        <Save className="w-3.5 h-3.5" /> Salvar
      </Button>
    </div>
  )
}

function CollaboratorPermDialog({ open, onOpenChange, initial, onSave }) {
  const [form, setForm] = useState({ name: '', role: '', email: '', permissions: { ...DEFAULT_PERMISSIONS } })
  const initialRef = useRef({ name: '', role: '', email: '', permissions: { ...DEFAULT_PERMISSIONS } })
  const [collabPassword, setCollabPassword] = useState('')
  const [showCollabPwd, setShowCollabPwd] = useState(false)

  useEffect(() => {
    if (open) {
      const state = initial
        ? { name: initial.name || '', role: initial.role || '', email: initial.email || '', permissions: { ...DEFAULT_PERMISSIONS, ...(initial.permissions || {}) } }
        : { name: '', role: '', email: '', permissions: { ...DEFAULT_PERMISSIONS } }
      setForm(state)
      initialRef.current = state
      setCollabPassword('')
      setShowCollabPwd(false)
    }
  }, [open, initial])

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialRef.current),
    [form]
  )
  const { guard, UnsavedDialog } = useUnsavedGuard(isDirty)
  const handleClose = () => guard(() => onOpenChange(false))

  const setPerm = (key, val) => setForm(p => ({ ...p, permissions: { ...p.permissions, [key]: val } }))
  const liberateAll = () => setForm(p => ({ ...p, permissions: Object.fromEntries(MODULES.map(m => [m.key, 'edit'])) }))
  const hideAll = () => setForm(p => ({ ...p, permissions: Object.fromEntries(MODULES.map(m => [m.key, 'hidden'])) }))

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Nome obrigatório'); return }
    onSave(form, collabPassword)
    onOpenChange(false)
  }

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => { if (v) onOpenChange(v); else handleClose() }}>
      <DialogContent className="max-w-lg flex flex-col max-h-[90vh] overflow-hidden">
        <div className="space-y-4 px-6 pt-6 pb-4 overflow-y-auto flex-1 min-h-0">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {initial ? 'Editar colaborador' : 'Novo colaborador'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Configure o acesso deste colaborador ao sistema</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="pb-2 block">Nome *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome completo" />
            </div>
            <div className="space-y-1.5">
              <Label className="pb-2 block">Cargo</Label>
              <Input value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} placeholder="Ex: Músico, Roadie" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="pb-2 block">E-mail de acesso</Label>
              <Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="colaborador@email.com" type="email" />
              <p className="text-[11px] text-slate-400">Usado para fazer login no sistema</p>
            </div>
            <div className="space-y-1.5">
              <Label className="pb-2 block">{initial ? 'Nova senha de acesso' : 'Senha de acesso'}</Label>
              <div className="relative">
                <Input
                  value={collabPassword}
                  onChange={e => setCollabPassword(e.target.value)}
                  placeholder={initial ? 'Deixe em branco para manter' : 'Mínimo 6 caracteres'}
                  type={showCollabPwd ? 'text' : 'password'}
                  className="pr-9"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCollabPwd(p => !p)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showCollabPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400">{initial ? 'O campo fica vazio por segurança — preencha só para alterar' : 'Defina uma senha para login'}</p>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Permissões por módulo</p>
              <div className="flex gap-1.5">
                <button onClick={liberateAll} className="text-[11px] text-emerald-600 hover:text-emerald-700 font-medium">Liberar tudo</button>
                <span className="text-slate-300">·</span>
                <button onClick={hideAll} className="text-[11px] text-red-500 hover:text-red-600 font-medium">Ocultar tudo</button>
              </div>
            </div>
            <div className="max-h-[35vh] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
              {MODULES.map(({ key, label, icon: Icon }) => {
                const cur = form.permissions[key] ?? 'edit'
                return (
                  <div key={key} className="flex items-center gap-3 p-3">
                    <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{label}</span>
                    <div className="flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
                      {[
                        { val: 'hidden', Icon: EyeOff, title: 'Oculto' },
                        { val: 'view',   Icon: Eye,    title: 'Visualizar' },
                        { val: 'edit',   Icon: Pencil, title: 'Editar' },
                      ].map(({ val, Icon: BtnIcon, title }) => (
                        <button
                          key={val}
                          title={title}
                          onClick={() => setPerm(key, val)}
                          className={cn(
                            'px-2.5 py-1.5 transition-colors',
                            cur === val
                              ? val === 'hidden' ? 'bg-red-500 text-white' : val === 'view' ? 'bg-amber-500 text-white' : 'bg-orange-500 text-white'
                              : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                          )}
                        >
                          <BtnIcon className="w-3.5 h-3.5" />
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="shrink-0 flex justify-end gap-2 px-6 py-4 border-t border-slate-800 bg-white dark:bg-slate-900">
          <Button variant="outline" className="h-10 px-4" onClick={handleClose}>Cancelar</Button>
          <Button className="h-10 px-4" onClick={handleSave}>Salvar</Button>
        </div>
      </DialogContent>
    </Dialog>
    {UnsavedDialog}
    </>
  )
}

function ConfirmDialog({ open, onOpenChange, title, description, onConfirm }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <div className="space-y-4 px-6 pt-6 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h2>
            {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button variant="destructive" size="sm" onClick={() => { onConfirm(); onOpenChange(false) }}>Remover</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ColorInput({ value, onChange, defaultHex, placeholder }) {
  const [text, setText] = useState(value || '')
  useEffect(() => { setText(value || '') }, [value])
  const handleText = (v) => {
    setText(v)
    if (v === '') { onChange(null); return }
    const norm = /^#/.test(v) ? v : '#' + v
    if (/^#[0-9a-fA-F]{6}$/.test(norm)) onChange(norm.toLowerCase())
  }
  return (
    <div className="flex items-center gap-2.5">
      <input
        type="color"
        value={value || defaultHex}
        onChange={e => { onChange(e.target.value); setText(e.target.value) }}
        className="w-10 h-9 rounded-lg border border-slate-200 dark:border-slate-600 cursor-pointer p-0.5 bg-white dark:bg-slate-800 shrink-0"
      />
      <input
        type="text"
        value={text}
        onChange={e => handleText(e.target.value)}
        placeholder={placeholder}
        className="flex-1 rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 text-sm font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 bg-white dark:bg-slate-800 transition-all"
      />
      <div className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-600 shrink-0"
        style={{ background: value || defaultHex }} />
      {value && (
        <button onClick={() => { onChange(null); setText('') }}
          className="text-xs text-slate-400 hover:text-red-400 transition-colors shrink-0">
          Resetar
        </button>
      )}
    </div>
  )
}

function ProfileSection({ companyProfile, updateCompanyProfile }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ ...companyProfile })

  useEffect(() => { if (!editing) setForm({ ...companyProfile }) }, [companyProfile, editing])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const isDirty = useMemo(
    () => editing && JSON.stringify(form) !== JSON.stringify(companyProfile),
    [editing, form, companyProfile]
  )
  const { guard, UnsavedDialog } = useUnsavedGuard(isDirty)

  const handleSave = () => {
    updateCompanyProfile(form)
    toast.success('Perfil da empresa salvo!')
    setEditing(false)
  }

  return (
    <>
    <SectionCard
      title="Perfil da Empresa / Banda"
      subtitle="Dados que aparecem nos recibos e holerites gerados"
      icon={Building2}
      action={
        !editing && (
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => setEditing(true)}>
            <Pencil className="w-3.5 h-3.5" /> Editar
          </Button>
        )
      }
    >
      <AnimatePresence mode="wait">
        {editing ? (
          <motion.div key="edit" {...fadeSlide} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome da Empresa / Banda *</Label>
              <Input value={form.companyName || ''} onChange={e => set('companyName', e.target.value)} placeholder="Ex: Banda Horizonte" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>CNPJ</Label>
              <Input value={form.cnpj || ''} onChange={e => set('cnpj', formatCnpj(e.target.value))} placeholder="00.000.000/0000-00" maxLength={18} />
            </div>
            <div className="space-y-1.5">
              <Label>Endereço</Label>
              <Input value={form.address || ''} onChange={e => set('address', e.target.value)} placeholder="Rua, número, bairro" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Input value={form.city || ''} onChange={e => set('city', e.target.value)} placeholder="São Paulo" />
              </div>
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Input value={form.state || ''} onChange={e => set('state', e.target.value.toUpperCase().slice(0, 2))} placeholder="SP" maxLength={2} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <PhoneInput value={form.phone || ''} onChange={v => set('phone', v)} />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail do administrador</Label>
                <Input value={form.email || ''} onChange={e => set('email', e.target.value)} placeholder="contato@suabanda.com" />
                <p className="text-[11px] text-slate-400">E-mail usado para fazer login</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Validade padrão da proposta</Label>
              <div className="flex items-center w-40 rounded-lg border border-slate-200 overflow-hidden focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={form.proposalValidityDays ?? 30}
                  onChange={e => {
                    const v = e.target.value
                    if (v === '') { set('proposalValidityDays', ''); return }
                    const n = parseInt(v)
                    if (!isNaN(n)) set('proposalValidityDays', n)
                  }}
                  onBlur={e => {
                    const n = parseInt(e.target.value)
                    set('proposalValidityDays', isNaN(n) || n < 1 ? 1 : Math.min(365, n))
                  }}
                  className="flex-1 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none bg-white dark:bg-slate-800 min-w-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="px-3 py-2 text-sm text-slate-500 bg-slate-50 dark:bg-slate-700 border-l border-slate-200 dark:border-slate-600 shrink-0 select-none">dias</span>
              </div>
            </div>
            {/* Logo da banda */}
            <div className="space-y-1.5">
              <Label>Logo da banda</Label>
              <div className="space-y-2">
                {form.logoBase64 && (
                  <img src={form.logoBase64} alt="Logo" className="w-20 h-20 rounded-xl object-contain border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="cursor-pointer">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      {form.logoBase64 ? 'Alterar logo' : 'Adicionar logo'}
                    </span>
                    <input type="file" accept=".png,.jpg,.jpeg,.svg" className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const reader = new FileReader()
                        reader.onload = ev => set('logoBase64', ev.target.result)
                        reader.readAsDataURL(file)
                      }}
                    />
                  </label>
                  {form.logoBase64 && (
                    <button onClick={() => set('logoBase64', null)}
                      className="text-xs text-red-500 hover:text-red-600 font-medium transition-colors">
                      Remover logo
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">Recomendado: fundo transparente, mínimo 200×200px</p>
              </div>
            </div>

            {/* Cor base */}
            <div className="space-y-1.5">
              <Label>Cor de fundo dos PDFs</Label>
              <p className="text-[11px] text-slate-400 -mt-0.5">Usada no cabeçalho e rodapé</p>
              <ColorInput
                value={form.brandColorBase}
                onChange={v => set('brandColorBase', v)}
                defaultHex="#080909"
                placeholder="Padrão Akro (#080909)"
              />
            </div>

            {/* Cor de destaque */}
            <div className="space-y-1.5">
              <Label>Cor de títulos e destaques</Label>
              <p className="text-[11px] text-slate-400 -mt-0.5">Usada em títulos, seções e elementos de ênfase</p>
              <ColorInput
                value={form.brandColorAccent}
                onChange={v => set('brandColorAccent', v)}
                defaultHex="#f97316"
                placeholder="Padrão Akro (#f97316)"
              />
            </div>

            {/* Cor da fonte */}
            <div className="space-y-1.5">
              <Label>Cor da fonte dos PDFs</Label>
              <p className="text-[11px] text-slate-400 -mt-0.5">Usada no texto principal dos documentos</p>
              <ColorInput
                value={form.brandColorFont}
                onChange={v => set('brandColorFont', v)}
                defaultHex="#141414"
                placeholder="Padrão Akro (#141414)"
              />
            </div>

            {/* Preview ao vivo do cabeçalho */}
            <div className="space-y-1.5">
              <Label>Preview do cabeçalho do PDF</Label>
              <div className="rounded-xl overflow-hidden"
                style={{ backgroundColor: /^#[0-9a-fA-F]{6}$/.test(form.brandColorBase || '') ? form.brandColorBase : '#080909' }}>
                <div className="flex items-center gap-3 px-4 pt-3 pb-2">
                  {form.logoBase64 && (
                    <img src={form.logoBase64} alt="Logo" className="h-9 w-9 object-contain rounded shrink-0" />
                  )}
                  {!form.logoBase64 && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <svg viewBox="0 0 36 33" fill="none" className="w-7 h-7">
                        <polygon points="18,0.5 35.5,32.5 0.5,32.5"
                          fill={/^#[0-9a-fA-F]{6}$/.test(form.brandColorAccent || '') ? form.brandColorAccent : '#f97316'} />
                        <polyline points="9,26 18,19 27,26" stroke="#1C1917" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                        <polyline points="6,31.5 18,24 30,31.5" stroke="#1C1917" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="text-white font-bold text-sm tracking-tight">KRO</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm truncate">{form.companyName || 'Nome da Banda'}</p>
                    <p className="text-white/50 text-[10px] uppercase tracking-widest">Documento</p>
                  </div>
                </div>
                <div className="mx-4 mb-2.5 h-0.5 rounded-full"
                  style={{ backgroundColor: /^#[0-9a-fA-F]{6}$/.test(form.brandColorAccent || '') ? form.brandColorAccent : '#f97316' }} />
              </div>
            </div>

            <SaveCancelBar onSave={handleSave} onCancel={() => guard(() => setEditing(false))} />
          </motion.div>
        ) : (
          <motion.div key="view" {...fadeSlide}>
            <Field label="Nome" value={companyProfile.companyName} />
            <Field label="CNPJ" value={companyProfile.cnpj} />
            <Field label="Endereço" value={companyProfile.address} />
            <Field label="Cidade / Estado" value={[companyProfile.city, companyProfile.state].filter(Boolean).join(' — ')} />
            <Field label="Telefone" value={companyProfile.phone} />
            <Field label="E-mail do administrador" value={companyProfile.email} />
            <Field label="Validade da proposta" value={companyProfile.proposalValidityDays ? `${companyProfile.proposalValidityDays} dias` : '30 dias'} />
            <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-700">
              <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">Logo</span>
              {companyProfile.logoBase64
                ? <img src={companyProfile.logoBase64} alt="Logo" className="w-20 h-20 rounded-xl object-contain border border-slate-200 dark:border-slate-700 bg-slate-50" />
                : <div className="flex items-center gap-1.5 text-slate-400"><ImageOff className="w-3.5 h-3.5" /><span className="text-sm">Nenhuma logo cadastrada</span></div>
              }
            </div>
            <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-700">
              <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">Cor base</span>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded border border-slate-200 dark:border-slate-600 shrink-0"
                  style={{ background: companyProfile.brandColorBase || '#080909' }} />
                <span className="text-sm font-mono text-slate-900 dark:text-slate-100">
                  {companyProfile.brandColorBase || 'Padrão Akro'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-700">
              <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">Cor de destaque</span>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded border border-slate-200 dark:border-slate-600 shrink-0"
                  style={{ background: companyProfile.brandColorAccent || '#f97316' }} />
                <span className="text-sm font-mono text-slate-900 dark:text-slate-100">
                  {companyProfile.brandColorAccent || 'Padrão Akro'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 py-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">Cor da fonte</span>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded border border-slate-200 dark:border-slate-600 shrink-0"
                  style={{ background: companyProfile.brandColorFont || '#141414' }} />
                <span className="text-sm font-mono text-slate-900 dark:text-slate-100">
                  {companyProfile.brandColorFont || 'Padrão Akro'}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </SectionCard>
    {UnsavedDialog}
    </>
  )
}

function PreferencesSection({ theme, toggleTheme }) {
  return (
    <SectionCard title="Preferências" subtitle="Aparência e localização" icon={Globe}>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Tema</p>
            <p className="text-xs text-slate-500 mt-0.5">Aparência do sistema</p>
          </div>
          <div className="flex rounded-xl border border-slate-200 dark:border-slate-600 overflow-hidden">
            <button
              onClick={() => theme !== 'dark' && toggleTheme()}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors',
                theme === 'dark' ? 'bg-orange-500 text-white' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
              )}
            >
              <Moon className="w-3.5 h-3.5" /> Escuro
            </button>
            <button
              onClick={() => theme !== 'light' && toggleTheme()}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-l border-slate-200 dark:border-slate-600',
                theme === 'light' ? 'bg-orange-500 text-white' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
              )}
            >
              <Sun className="w-3.5 h-3.5" /> Claro
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Moeda</p>
            <p className="text-xs text-slate-500 mt-0.5">Formato dos valores monetários</p>
          </div>
          <span className="text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg">
            Real brasileiro (R$)
          </span>
        </div>
      </div>
    </SectionCard>
  )
}

function CollaboratorsSection({ collaborators, addCollaborator, updateCollaborator, deleteCollaborator, setActiveCollaborator, onNav }) {
  const planLimits = usePlanLimits()
  const { canAddCollaborator, isFeatureAvailable, plan } = planLimits
  console.log('[CollaboratorsSection] usePlanLimits:', planLimits, '| collaborators:', collaborators)
  const [collabDialogOpen, setCollabDialogOpen] = useState(false)
  const [editCollab, setEditCollab] = useState(null)
  const [deleteCollabId, setDeleteCollabId] = useState(null)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [upgradeFeature, setUpgradeFeature] = useState('')

  const handleSave = async (form, password) => {
    if (editCollab) {
      updateCollaborator(editCollab.id, form)
      if (password) {
        const { error: pwdErr } = await supabase.rpc('set_collaborator_password', { p_id: editCollab.id, p_password: password })
        if (pwdErr) console.error('Erro ao salvar senha do colaborador:', pwdErr)
      }
      toast.success('Colaborador atualizado!')
      setCollabDialogOpen(false)
      setEditCollab(null)
      return
    }
    if (!isFeatureAvailable('hasColaboradores')) {
      setCollabDialogOpen(false)
      setUpgradeFeature('Adicionar colaboradores ao sistema')
      setUpgradeOpen(true)
      return
    }
    if (!canAddCollaborator(collaborators.length)) {
      setCollabDialogOpen(false)
      setUpgradeFeature('Você atingiu o limite de colaboradores do seu plano')
      setUpgradeOpen(true)
      return
    }
    const newId = crypto.randomUUID()
    // Aguarda o INSERT completar antes de chamar set_collaborator_password
    const inserted = await addCollaborator({ ...form, id: newId })
    if (!inserted) {
      console.error('Insert de colaborador falhou — senha não será salva')
      return
    }
    if (password) {
      const { error: pwdErr } = await supabase.rpc('set_collaborator_password', { p_id: newId, p_password: password })
      if (pwdErr) console.error('Erro ao salvar senha do novo colaborador:', pwdErr)
    }
    toast.success('Colaborador adicionado!')
    setCollabDialogOpen(false)
    setEditCollab(null)
  }

  const handleEdit = (c) => {
    setEditCollab(c)
    setCollabDialogOpen(true)
  }

  const handleAdd = () => {
    setEditCollab(null)
    setCollabDialogOpen(true)
  }

  const handleEnterAs = (c) => {
    setActiveCollaborator(c.id)
    onNav('dashboard')
  }

  const toDelete = collaborators.find(c => c.id === deleteCollabId)

  return (
    <>
      <SectionCard
        title="Colaboradores"
        subtitle="Gerencie quem tem acesso ao sistema e com quais permissões"
        icon={UserCheck}
        action={
          <Button size="sm" className="gap-1.5 shrink-0" onClick={handleAdd}>
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </Button>
        }
      >
        {collaborators.length === 0 ? (
          <div className="text-center py-8">
            <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-medium">Nenhum colaborador ainda</p>
            <p className="text-xs text-slate-400 mt-1">Adicione colaboradores para controlar o acesso ao sistema</p>
          </div>
        ) : (
          <div className="space-y-2">
            {collaborators.map(c => {
              const liberated = MODULES.filter(m => (c.permissions?.[m.key] ?? 'edit') !== 'hidden').length
              return (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                    {c.avatar || c.name?.slice(0,2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{c.name}</p>
                    <p className="text-xs text-slate-400 truncate">{c.role || c.email || 'Sem cargo'}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{liberated}/{MODULES.length} módulos liberados</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => handleEnterAs(c)} className="text-[11px] gap-1 h-7 px-2">
                      <UserCheck className="w-3 h-3" /> Entrar como
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleEdit(c)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => setDeleteCollabId(c.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>

      <CollaboratorPermDialog
        open={collabDialogOpen}
        onOpenChange={setCollabDialogOpen}
        initial={editCollab}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={deleteCollabId !== null}
        onOpenChange={(v) => { if (!v) setDeleteCollabId(null) }}
        title="Remover colaborador?"
        description={toDelete ? `"${toDelete.name}" perderá o acesso ao sistema.` : ''}
        onConfirm={() => { deleteCollaborator(deleteCollabId); toast.success('Colaborador removido'); setDeleteCollabId(null) }}
      />

      <UpgradeModal
        isOpen={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        feature={upgradeFeature}
        currentPlan={plan}
        onNav={onNav}
      />
    </>
  )
}

function NotificationsSection({ notificationPrefs, updateNotificationPrefs }) {
  return (
    <SectionCard title="Notificações" subtitle="Escolha quais alertas deseja receber" icon={Bell}>
      <div className="space-y-1">
        {NOTIFICATION_ITEMS.map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between gap-4 py-2.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
            </div>
            <Switch
              checked={notificationPrefs[key] ?? true}
              onCheckedChange={(v) => updateNotificationPrefs({ [key]: v })}
            />
          </div>
        ))}
      </div>
    </SectionCard>
  )
}


export default function Settings({ isLoading, onNav }) {
  const store = useStore()
  console.log('[Settings] store.collaborators:', store.collaborators, '| notificationPrefs:', store.notificationPrefs)
  if (isLoading) return <SettingsSkeleton />

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Configurações</h1>
        <p className="text-sm text-slate-500 mt-0.5">Gerencie os dados da banda e preferências do sistema</p>
      </div>

      <ProfileSection companyProfile={store.companyProfile} updateCompanyProfile={store.updateCompanyProfile} />
      <PreferencesSection theme={store.theme} toggleTheme={store.toggleTheme} />
      <CollaboratorsSection
        collaborators={store.collaborators}
        addCollaborator={store.addCollaborator}
        updateCollaborator={store.updateCollaborator}
        deleteCollaborator={store.deleteCollaborator}
        setActiveCollaborator={store.setActiveCollaborator}
        onNav={onNav}
      />
      <NotificationsSection notificationPrefs={store.notificationPrefs} updateNotificationPrefs={store.updateNotificationPrefs} />
    </div>
  )
}

function SettingsSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-28 rounded-2xl" />
    </div>
  )
}
