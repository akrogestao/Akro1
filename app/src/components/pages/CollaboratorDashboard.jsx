import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, CalendarDays, Users, TrendingUp, FileText, Receipt, Building2,
  BarChart2, CheckSquare, Music, Music2, Package, Calculator, ChevronRight,
} from 'lucide-react'
import { useStore } from '@/hooks/useStore'
import { Skeleton } from '@/components/ui/skeleton'
import { fmtCurrencyShort } from '@/lib/format'
import { cn } from '@/lib/utils'

const MODULE_META = [
  { key: 'dashboard',   label: 'Dashboard',    icon: LayoutDashboard, page: 'dashboard' },
  { key: 'shows',       label: 'Agenda',       icon: CalendarDays,    page: 'shows' },
  { key: 'members',     label: 'Membros',      icon: Users,           page: 'members' },
  { key: 'financial',   label: 'Financeiro',   icon: TrendingUp,      page: 'finance' },
  { key: 'contracts',   label: 'Contratos',    icon: FileText,        page: 'contracts' },
  { key: 'contractors', label: 'Contratantes', icon: Building2,       page: 'contractors' },
  { key: 'logistics',   label: 'Despesas',     icon: Receipt,         page: 'logistics' },
  { key: 'checklist',   label: 'Checklist',    icon: CheckSquare,     page: 'checklist' },
  { key: 'repertoire',  label: 'Repertório',   icon: Music,           page: 'repertoire' },
  { key: 'rehearsals',  label: 'Ensaios',      icon: Music2,          page: 'rehearsals' },
  { key: 'equipment',   label: 'Equipamentos', icon: Package,         page: 'equipment' },
  { key: 'budgets',     label: 'Orçamentos',   icon: Calculator,      page: 'budgets' },
  { key: 'reports',     label: 'Relatórios',   icon: BarChart2,       page: 'reports' },
]

function useModuleMetrics() {
  const { events, members, expenses, contractors, checklistItems, songs, rehearsals, equipment, budgets } = useStore()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcomingEvents = useMemo(
    () => events.filter(e => new Date(e.date + 'T12:00:00') >= today),
    [events]
  )

  const now = new Date()
  const thisMonth = now.getMonth()
  const thisYear = now.getFullYear()
  const monthRevenue = useMemo(
    () => events
      .filter(e => { const d = new Date(e.date + 'T12:00:00'); return d.getMonth() === thisMonth && d.getFullYear() === thisYear })
      .reduce((s, e) => s + (e.value || 0), 0),
    [events]
  )

  const pendingChecklistCount = useMemo(
    () => checklistItems.filter(i => !i.done).length,
    [checklistItems]
  )

  const upcomingRehearsals = useMemo(
    () => rehearsals.filter(r => r.status !== 'Realizado' && new Date(r.date + 'T12:00:00') >= today).length,
    [rehearsals]
  )

  const pendingBudgets = useMemo(
    () => budgets.filter(b => b.status === 'Pendente' || b.status === 'Enviado').length,
    [budgets]
  )

  return {
    shows:       { value: upcomingEvents.length, label: upcomingEvents.length === 1 ? 'show agendado' : 'shows agendados' },
    members:     { value: members.length, label: members.length === 1 ? 'membro' : 'membros' },
    financial:   { value: fmtCurrencyShort(monthRevenue), label: 'receita este mês', raw: true },
    contracts:   { value: events.length, label: events.length === 1 ? 'contrato' : 'contratos' },
    contractors: { value: contractors.length, label: contractors.length === 1 ? 'contratante' : 'contratantes' },
    logistics:   { value: expenses.length, label: expenses.length === 1 ? 'despesa registrada' : 'despesas registradas' },
    checklist:   { value: pendingChecklistCount, label: pendingChecklistCount === 1 ? 'item pendente' : 'itens pendentes' },
    repertoire:  { value: songs.length, label: songs.length === 1 ? 'música' : 'músicas' },
    rehearsals:  { value: upcomingRehearsals, label: upcomingRehearsals === 1 ? 'ensaio agendado' : 'ensaios agendados' },
    equipment:   { value: equipment.length, label: equipment.length === 1 ? 'equipamento' : 'equipamentos' },
    budgets:     { value: pendingBudgets, label: pendingBudgets === 1 ? 'orçamento pendente' : 'orçamentos pendentes' },
    reports:     { value: members.length, label: 'relatórios disponíveis' },
    dashboard:   { value: null, label: 'visão geral' },
  }
}

function ModuleCard({ meta, metric, onNav }) {
  const Icon = meta.icon
  return (
    <motion.button
      onClick={() => onNav(meta.page)}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="w-full text-left bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 hover:border-orange-200 dark:hover:border-orange-700 hover:shadow-sm transition-all duration-150 group"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-900/30 border border-orange-100 dark:border-orange-800/40 flex items-center justify-center shrink-0">
          <Icon className="w-4.5 h-4.5 text-orange-500" />
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-orange-400 transition-colors mt-0.5 shrink-0" />
      </div>
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">{meta.label}</p>
      {metric.value !== null ? (
        <p className={cn('font-bold text-slate-900 dark:text-slate-100', metric.raw ? 'text-lg' : 'text-2xl')}>
          {metric.value}
        </p>
      ) : (
        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">—</p>
      )}
      <p className="text-[11px] text-slate-400 mt-0.5">{metric.label}</p>
    </motion.button>
  )
}

function CollaboratorDashboardSkeleton() {
  return (
    <div className="animate-slide-up space-y-6">
      <Skeleton className="h-20 rounded-2xl" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
      </div>
    </div>
  )
}

export default function CollaboratorDashboard({ collaborator, onNav, isLoading }) {
  const { session } = useStore()
  const metrics = useModuleMetrics()

  if (isLoading) return <CollaboratorDashboardSkeleton />

  const permissions = collaborator?.permissions ?? {}

  const visibleModules = MODULE_META.filter(m => {
    if (m.key === 'dashboard') return false
    const perm = permissions[m.key] ?? 'edit'
    return perm !== 'hidden'
  })

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Bom dia'
    if (h < 18) return 'Boa tarde'
    return 'Boa noite'
  })()

  return (
    <div className="animate-slide-up space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl px-5 py-4 text-white">
        <p className="text-sm font-medium text-orange-100">{greeting},</p>
        <p className="text-xl font-bold mt-0.5">{collaborator?.name || 'Colaborador'}</p>
        {collaborator?.role && (
          <p className="text-sm text-orange-200 mt-0.5">{collaborator.role}</p>
        )}
        <p className="text-xs text-orange-200 mt-2">
          {session?.isSimulation ? 'Modo de simulação ativo' : `Você tem acesso a ${visibleModules.length} módulo${visibleModules.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Module cards */}
      {visibleModules.length === 0 ? (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nenhum módulo disponível.</p>
          <p className="text-xs mt-1">Solicite acesso ao administrador.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {visibleModules.map(meta => (
            <ModuleCard
              key={meta.key}
              meta={meta}
              metric={metrics[meta.key] ?? { value: null, label: '' }}
              onNav={onNav}
            />
          ))}
        </div>
      )}
    </div>
  )
}
