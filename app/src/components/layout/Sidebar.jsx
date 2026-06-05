import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, CalendarDays, Users, TrendingUp,
  FileText, Settings, X, Receipt, Building2, BarChart2, CheckSquare, Music, Music2, Package, Calculator, UserCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/hooks/useStore'
import { useBand } from '@/hooks/useBand.jsx'

const navItems = [
  { id: 'dashboard',   label: 'Dashboard',      icon: LayoutDashboard, group: 'Principal' },
  { id: 'shows',       label: 'Agenda',          icon: CalendarDays,    group: 'Principal' },
  { id: 'members',     label: 'Membros',         icon: Users,           group: 'Gestão' },
  { id: 'finance',     label: 'Financeiro',      icon: TrendingUp,      group: 'Gestão' },
  { id: 'contracts',   label: 'Contratos',       icon: FileText,        group: 'Gestão' },
  { id: 'contractors', label: 'Contratantes',    icon: Building2,       group: 'Gestão' },
  { id: 'logistics',   label: 'Despesas',         icon: Receipt,         group: 'Gestão' },
  { id: 'checklist',   label: 'Checklist',        icon: CheckSquare,     group: 'Gestão' },
  { id: 'repertoire', label: 'Repertório',        icon: Music,           group: 'Gestão' },
  { id: 'rehearsals', label: 'Ensaios',           icon: Music2,          group: 'Gestão' },
  { id: 'equipment',  label: 'Equipamentos',      icon: Package,         group: 'Gestão' },
  { id: 'budgets',     label: 'Orçamentos',        icon: Calculator,      group: 'Comercial' },
  { id: 'reports',     label: 'Inteligência',     icon: BarChart2,       group: 'Sistema' },
  { id: 'settings',    label: 'Configurações',   icon: Settings,        group: 'Sistema' },
]

const groups = ['Principal', 'Gestão', 'Comercial', 'Sistema']

const NAV_PERMISSION_MAP = {
  dashboard: 'dashboard', shows: 'shows', members: 'members',
  finance: 'financial', contracts: 'contracts', logistics: 'logistics',
  contractors: 'contractors', checklist: 'checklist', repertoire: 'repertoire',
  rehearsals: 'rehearsals', equipment: 'equipment', budgets: 'budgets',
  reports: 'reports', settings: null,
}

const PLAN_LABELS = {
  profissional: 'Plano Profissional',
  multi_bandas: 'Plano Multi-bandas',
}

function NavContent({ current, onNav, eventCount, onClose }) {
  const { activeCollaborator, collaborators, session, switchToChief, logout } = useStore()
  const { activeBand } = useBand()

  const bandName     = activeBand?.name || 'Minha Banda'
  const planLabel    = PLAN_LABELS[activeBand?.plan] || 'Plano Profissional'
  const bandInitials = bandName.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
  const activeCollab = activeCollaborator
    ? collaborators.find(c => String(c.id) === String(activeCollaborator))
    : null
  const handleBack = () => {
    if (session?.isSimulation) switchToChief()
    else logout()
    onClose?.()
  }

  const visibleItems = navItems.filter(item => {
    if (!activeCollab) return true
    const mod = NAV_PERMISSION_MAP[item.id]
    if (!mod) return true
    const perm = activeCollab.permissions?.[mod] ?? 'edit'
    return perm !== 'hidden'
  })

  return (
    <div className="flex flex-col h-full">
      {activeCollab && (
        <div className="bg-amber-500 px-3 py-2.5 flex items-center gap-2 shrink-0">
          <UserCheck className="w-3.5 h-3.5 text-white shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-white uppercase tracking-wide leading-none">
              {session?.isSimulation ? 'Simulando' : 'Colaborador'}
            </p>
            <p className="text-[11px] text-amber-100 truncate mt-0.5">{activeCollab.name}</p>
          </div>
          <button
            onClick={handleBack}
            className="text-[10px] font-semibold text-amber-900 bg-white/90 hover:bg-white px-2 py-1 rounded-full transition-colors shrink-0"
          >
            {session?.isSimulation ? 'Voltar' : 'Sair'}
          </button>
        </div>
      )}
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 shrink-0">
            <svg viewBox="0 0 36 33" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <polygon points="18,0.5 35.5,32.5 0.5,32.5" fill="#F97316"/>
              <polyline points="9,26 18,19 27,26" stroke="#1C1917" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="6,31.5 18,24 30,31.5" stroke="#1C1917" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 leading-none tracking-tight">Akro</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Gestão de Bandas</div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="md:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {groups.map((group) => {
          const items = visibleItems.filter((i) => i.group === group)
          if (items.length === 0) return null
          return (
            <div key={group}>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-2 mb-1.5">{group}</p>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon
                  const active = current === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => { onNav(item.id); onClose?.() }}
                      className={cn(
                        'relative w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 group',
                        active
                          ? 'bg-orange-50 text-orange-700'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-white'
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="nav-pill"
                          className="absolute inset-0 rounded-lg bg-orange-50"
                          transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
                        />
                      )}
                      <Icon className={cn('w-4 h-4 relative z-10 shrink-0', active ? 'text-orange-500' : 'text-slate-400 group-hover:text-slate-600')} />
                      <span className="relative z-10">{item.label}</span>
                      {item.id === 'shows' && eventCount > 0 && (
                        <span className="relative z-10 ml-auto text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-semibold leading-none">
                          {eventCount}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-slate-200">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white transition-colors cursor-pointer">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
            {bandInitials}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-800 truncate">{bandName}</div>
            <div className="text-[10px] text-slate-400">{planLabel}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Sidebar({ current, onNav, eventCount, mobileOpen, onMobileClose }) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-56 bg-slate-50 border-r border-slate-200 flex-col z-30">
        <NavContent current={current} onNav={onNav} eventCount={eventCount} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
              onClick={onMobileClose}
            />
            {/* Drawer */}
            <motion.aside
              key="drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.32 }}
              className="md:hidden fixed left-0 inset-y-0 h-full w-64 bg-slate-50 border-r border-slate-200 flex flex-col z-50"
            >
              <NavContent current={current} onNav={onNav} eventCount={eventCount} onClose={onMobileClose} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
