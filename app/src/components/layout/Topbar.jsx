import { useState, useEffect, useRef } from 'react'
import { Search, Bell, Menu, Music2, Check, Plus, ChevronDown, LogOut, Trash2, UserCheck } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/hooks/useStore'
import { useBand } from '@/hooks/useBand.jsx'
import { useAuth } from '@/hooks/useAuth.jsx'
import { usePlanLimits } from '@/hooks/usePlanLimits'
import { useNotifications } from '@/hooks/useNotifications'
import NotificationsDropdown from '@/components/shared/NotificationsDropdown'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import UpgradeModal from '@/components/shared/UpgradeModal'

const PAGE_TITLES = {
  dashboard:   'Dashboard',
  shows:       'Shows & Eventos',
  members:     'Membros',
  finance:     'Financeiro',
  contracts:   'Contratos',
  checklist:   'Checklist',
  logistics:   'Logística',
  contractors: 'Contratantes',
  reports:     'Inteligência e Relatórios',
  settings:    'Configurações',
}

export default function Topbar({ current, onMenuOpen, onNav = () => {} }) {
  const { events, members, payments, contractors, checklistItems, rehearsals, session, collaborators, activeCollaborator } = useStore()
  const { bands, activeBand, switchBand, addBand, deleteBand } = useBand()
  const { limits } = usePlanLimits()
  const canAddBand = bands.length < limits.maxBands
  const { signOut } = useAuth()

  const isDirectCollab = session?.type === 'collaborator' && !session?.isSimulation
  const collabName = isDirectCollab && activeCollaborator
    ? (collaborators.find(c => String(c.id) === String(activeCollaborator))?.name ?? '')
    : ''

  const handleSignOut = async () => {
    localStorage.removeItem('bm_active_band_id')
    localStorage.removeItem('bm_collab_session')
    await signOut()
  }
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications({
    events, members, payments, contractors, checklistItems, rehearsals,
  })

  const [isOpen, setIsOpen] = useState(false)
  const [bandOpen, setBandOpen] = useState(false)
  const [newBandName, setNewBandName] = useState('')
  const [addBandLoading,    setAddBandLoading]    = useState(false)
  const [addDialogOpen,    setAddDialogOpen]    = useState(false)
  const [upgradeOpen,      setUpgradeOpen]      = useState(false)
  const [deleteTarget,     setDeleteTarget]     = useState(null)
  const [deleteLoading,    setDeleteLoading]    = useState(false)
  const bellRef = useRef(null)
  const bandRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  useEffect(() => {
    if (!bandOpen) return
    const handler = (e) => {
      if (bandRef.current && !bandRef.current.contains(e.target)) { setBandOpen(false); setNewBandName('') }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [bandOpen])

  function getBandInitials(name) {
    if (!name) return '?'
    return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
  }

  async function handleDeleteBand() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    await deleteBand(deleteTarget.id)
    setDeleteLoading(false)
    setDeleteTarget(null)
  }

  async function handleAddBand(e) {
    e.preventDefault()
    if (!newBandName.trim() || addBandLoading) return
    setAddBandLoading(true)
    const result = await addBand(newBandName.trim())
    setAddBandLoading(false)
    if (result) {
      setNewBandName('')
      setAddDialogOpen(false)
    }
  }

  const isGrandeBanda = bands.some(b => b.plan === 'multi_bandas')

  return (
    <header className="fixed top-0 left-0 right-0 md:left-56 h-14 bg-white border-b border-slate-200 flex items-center px-4 md:px-6 gap-3 z-20">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuOpen}
        className="md:hidden p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-all duration-150 shrink-0"
        aria-label="Abrir menu"
      >
        <Menu className="w-4 h-4" />
      </button>

      <h1 className="text-sm font-semibold text-slate-900 flex-1 truncate">{PAGE_TITLES[current]}</h1>

      {isDirectCollab ? (
        <div className="hidden sm:flex items-center gap-1.5 shrink-0 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
          <UserCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="text-xs font-medium text-amber-700 truncate max-w-[140px]">
            {collabName || 'Colaborador'}
          </span>
        </div>
      ) : (
        <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Buscar eventos, membros..."
            className="bg-transparent text-xs text-slate-700 placeholder:text-slate-400 outline-none w-36"
          />
        </div>
      )}

      {/* Band indicator / switcher — hidden for direct collaborator sessions */}
      {!isDirectCollab && isGrandeBanda ? (
        <div ref={bandRef} className="relative shrink-0">
          <button
            onClick={() => setBandOpen(v => !v)}
            className="flex items-center gap-2 h-8 px-2 rounded-lg hover:bg-slate-100 transition-all duration-150"
          >
            <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
              {getBandInitials(activeBand?.name)}
            </div>
            <span className="hidden sm:block text-sm font-medium text-slate-800 truncate max-w-[100px]">{activeBand?.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          <AnimatePresence>
            {bandOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-10 rounded-2xl shadow-xl z-50 border border-slate-800 overflow-hidden"
                style={{ width: 220, background: '#1a1a1a' }}
              >
                <p className="px-4 pt-3 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Suas bandas
                </p>
                <div className="px-1 pb-1">
                  {bands.map(band => (
                    <div key={band.id} className="group flex items-center gap-1 rounded-xl hover:bg-slate-800 transition-colors">
                      <button
                        onClick={() => { switchBand(band.id); setBandOpen(false) }}
                        className="flex-1 flex items-center gap-3 px-3 py-2 text-left min-w-0"
                      >
                        <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {getBandInitials(band.name)}
                        </div>
                        <span className="flex-1 text-sm font-medium text-white truncate">{band.name}</span>
                        {activeBand?.id === band.id && <Check className="w-4 h-4 text-orange-500 shrink-0" />}
                      </button>
                      {bands.length > 1 && (
                        <button
                          onClick={() => { setBandOpen(false); setDeleteTarget(band) }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 mr-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {canAddBand && (
                  <>
                    <div className="border-t border-slate-800 mx-3" />
                    <div className="px-1 py-1">
                      <button
                        onClick={() => { setBandOpen(false); setAddDialogOpen(true) }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-800 cursor-pointer transition-colors"
                      >
                        <div className="w-6 h-6 rounded-full border border-slate-600 flex items-center justify-center shrink-0">
                          <Plus className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <span className="text-sm text-slate-400">Adicionar banda</span>
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <Dialog open={addDialogOpen} onOpenChange={v => { setAddDialogOpen(v); if (!v) setNewBandName('') }}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-base">Nova banda</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddBand} className="space-y-4 pt-2">
                <div className="px-4">
                  <input
                    autoFocus
                    value={newBandName}
                    onChange={e => setNewBandName(e.target.value)}
                    placeholder="Nome da banda"
                    className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-orange-400 text-slate-700 placeholder:text-slate-400"
                  />
                </div>
                <DialogFooter>
                  <button
                    type="button"
                    onClick={() => { setAddDialogOpen(false); setNewBandName('') }}
                    className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!newBandName.trim() || addBandLoading}
                    className="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
                  >
                    {addBandLoading ? 'Criando...' : 'Criar'}
                  </button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null) }}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-base">Excluir banda</DialogTitle>
              </DialogHeader>
              <div className="px-4 py-2">
                <p className="text-sm text-slate-500">
                  Tem certeza que deseja excluir <span className="font-medium text-slate-800">"{deleteTarget?.name}"</span>? Esta ação não pode ser desfeita.
                </p>
              </div>
              <DialogFooter>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleteLoading}
                  className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteBand}
                  disabled={deleteLoading}
                  className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                  {deleteLoading ? 'Excluindo...' : 'Excluir'}
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <UpgradeModal
            isOpen={upgradeOpen}
            onClose={() => setUpgradeOpen(false)}
            feature="Gerenciar múltiplas bandas"
            currentPlan={activeBand?.plan || 'profissional'}
            onNav={onNav}
          />
        </div>
      ) : (
        !isDirectCollab && activeBand && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 shrink-0 max-w-[140px]">
            <Music2 className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span className="truncate">{activeBand.name}</span>
          </div>
        )
      )}

      {/* Bell — hidden for direct collaborator sessions */}
      {!isDirectCollab && <div ref={bellRef} className="relative shrink-0">
        <button
          onClick={() => setIsOpen(v => !v)}
          className="relative w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-all duration-150"
          aria-label="Notificações"
        >
          <Bell className="w-3.5 h-3.5" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                key="badge"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white leading-none"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        <AnimatePresence>
          {isOpen && (
            <NotificationsDropdown
              notifications={notifications}
              unreadCount={unreadCount}
              markAsRead={markAsRead}
              markAllAsRead={markAllAsRead}
              onNav={onNav}
              onClose={() => setIsOpen(false)}
            />
          )}
        </AnimatePresence>
      </div>}

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        title="Sair da conta"
        className="shrink-0 w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all duration-150"
        aria-label="Sair da conta"
      >
        <LogOut className="w-3.5 h-3.5" />
      </button>
    </header>
  )
}
