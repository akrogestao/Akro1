import React, { useState, useMemo, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster } from 'sonner'
import { UserCheck, Eye } from 'lucide-react'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import Dashboard from '@/components/pages/Dashboard'
import Shows from '@/components/pages/Shows'
import Members from '@/components/pages/Members'
import Finance from '@/components/pages/Finance'
import Contracts from '@/components/pages/Contracts'
import Settings from '@/components/pages/Settings'
import Logistics from '@/components/pages/Logistics'
import Contractors from '@/components/pages/Contractors'
import Reports from '@/components/pages/Reports'
import Checklist from '@/components/pages/Checklist'
import Repertoire from '@/components/pages/Repertoire'
import Equipment from '@/components/pages/Equipment'
import Budgets from '@/components/pages/Budgets'
import Rehearsals from '@/components/pages/Rehearsals'
import CollaboratorDashboard from '@/components/pages/CollaboratorDashboard'
import LoginScreen from '@/components/pages/LoginScreen'
import Auth from '@/components/pages/Auth'
import BandSelector from '@/components/pages/BandSelector'
import Upgrade from '@/components/pages/Upgrade'
import Subscription from '@/components/pages/Subscription'
import PaymentSuccess from '@/components/pages/PaymentSuccess'
import TrialExpired from '@/components/pages/TrialExpired'
import EmailConfirmed from '@/components/pages/EmailConfirmed'
import EmailConfirm from '@/components/pages/EmailConfirm'
import { StoreProvider, useStore } from '@/hooks/useStore'
import { AuthProvider, useAuth } from '@/hooks/useAuth.jsx'
import { BandProvider, useBand } from '@/hooks/useBand.jsx'
import { useSubscription } from '@/hooks/useSubscription.js'
import { cn } from '@/lib/utils'

const PAGE_PERMISSION_MAP = {
  dashboard: 'dashboard', shows: 'shows', members: 'members',
  finance: 'financial', contracts: 'contracts', logistics: 'logistics',
  contractors: 'contractors', checklist: 'checklist', repertoire: 'repertoire',
  equipment: 'equipment', budgets: 'budgets', rehearsals: 'rehearsals',
  reports: 'reports', settings: null, upgrade: null,
}

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] } },
  exit:    { opacity: 0, y: -6, transition: { duration: 0.15 } },
}

class SettingsErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false } }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error, info) { console.error('[SettingsErrorBoundary]', error, info?.componentStack) }
  render() {
    if (this.state.hasError)
      return (
        <div className="py-20 text-center space-y-3">
          <p className="text-sm text-slate-500">Ocorreu um erro ao carregar as configurações.</p>
          <button
            className="text-orange-500 text-sm underline"
            onClick={() => this.setState({ hasError: false })}
          >
            Tentar novamente
          </button>
        </div>
      )
    return this.props.children
  }
}

function SplashScreen() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4"
      style={{ background: '#0a0a0a', width: '100vw', height: '100vh' }}
    >
      <motion.div
        animate={{ scale: [0.95, 1.05] }}
        transition={{ repeat: Infinity, repeatType: 'mirror', duration: 1.5 }}
      >
        <svg viewBox="0 0 36 33" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-14 h-14">
          <polygon points="18,0.5 35.5,32.5 0.5,32.5" fill="#F97316" />
          <polyline points="9,26 18,19 27,26" stroke="#1C1917" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="6,31.5 18,24 30,31.5" stroke="#1C1917" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.div>
      <p className="text-sm text-slate-500">Carregando</p>
    </div>
  )
}

function PageWrapper({ page, activeCollab, children }) {
  const module = PAGE_PERMISSION_MAP[page]
  const isReadOnly = activeCollab && module && (activeCollab.permissions?.[module] ?? 'edit') === 'view'
  return (
    <div className={isReadOnly ? 'perm-readonly' : ''}>
      {isReadOnly && (
        <div className="mb-4 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          <Eye className="w-3.5 h-3.5 shrink-0" />
          <span>Você tem acesso somente de visualização neste módulo.</span>
        </div>
      )}
      {children}
    </div>
  )
}

function AppContent({ signOut }) {
  const { events, activeCollaborator, collaborators, switchToChief, session, logout } = useStore()
  const activeCollab = useMemo(
    () => activeCollaborator ? collaborators.find(c => String(c.id) === String(activeCollaborator)) : null,
    [activeCollaborator, collaborators]
  )

  if (!session) return <LoginScreen />

  const _initPage = (() => {
    const p = window.location.pathname.replace(/^\//, '')
    if (p === 'email-confirmed') return p
    if (p === 'payment-success' && (window.location.search.includes('session_id') || window.location.hash.includes('session_id'))) return p
    return 'dashboard'
  })()

  const [page, setPage] = useState(_initPage)
  const [isLoading, setIsLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [initialEventData, setInitialEventData] = useState(null)
  const [upgradeTarget, setUpgradeTarget] = useState(null)

  const { isTrialing, isActive, isExpired, daysLeftInTrial, isBetaUser } = useSubscription()
  const showTrialBanner = isTrialing && !isBetaUser

  // Internal navigation stack — source of truth for swipe-back
  const navStackRef = useRef([_initPage])

  // Seed browser history so the native back button has a state to pop to
  useEffect(() => {
    window.history.replaceState({ page: 'dashboard' }, '')
  }, [])

  // Native browser back button: read the page from history state, sync our stack
  useEffect(() => {
    const handlePopState = (e) => {
      const target = e.state?.page ?? 'dashboard'
      const stack = navStackRef.current
      const idx = stack.lastIndexOf(target)
      navStackRef.current = idx >= 0 ? stack.slice(0, idx + 1) : ['dashboard']
      setPage(target)
      setIsLoading(true)
      setTimeout(() => setIsLoading(false), 600)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Swipe from left edge (< 40px) rightward → pop our internal stack directly
  useEffect(() => {
    let startX = 0
    let startY = 0
    const onStart = (e) => { startX = e.touches[0].clientX; startY = e.touches[0].clientY }
    const onEnd = (e) => {
      const dx = e.changedTouches[0].clientX - startX
      const dy = Math.abs(e.changedTouches[0].clientY - startY)
      if (startX < 40 && dx > 80 && dy < 60) {
        const stack = navStackRef.current
        if (stack.length <= 1) return
        const newStack = stack.slice(0, -1)
        navStackRef.current = newStack
        const prev = newStack[newStack.length - 1]
        window.history.replaceState({ page: prev }, '')
        setPage(prev)
        setIsLoading(true)
        setTimeout(() => setIsLoading(false), 600)
      }
    }
    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchend', onEnd)
    }
  }, [])

  const navigate = (p, data = null) => {
    if (data !== null) {
      if (data?.targetPlan !== undefined) setUpgradeTarget(data.targetPlan)
      else setInitialEventData(data)
    }
    if (p === page) return
    navStackRef.current = [...navStackRef.current, p]
    window.history.pushState({ page: p }, '')
    setPage(p)
    setIsLoading(true)
    setTimeout(() => setIsLoading(false), 600)
  }

  const pageProps = { onNav: navigate, isLoading }
  const pages = {
    dashboard: session?.type === 'collaborator'
      ? <CollaboratorDashboard {...pageProps} collaborator={activeCollab} onNav={navigate} />
      : <Dashboard {...pageProps} />,
    shows:     <Shows     {...pageProps} />,
    members:   <Members   {...pageProps} />,
    finance:   <Finance   {...pageProps} />,
    contracts: <Contracts {...pageProps} initialEventData={initialEventData} onClearInitial={() => setInitialEventData(null)} />,
    logistics:   <Logistics    {...pageProps} />,
    contractors: <Contractors  {...pageProps} />,
    reports:     <Reports      {...pageProps} />,
    checklist:   <Checklist    {...pageProps} />,
    repertoire:  <Repertoire   {...pageProps} />,
    equipment:   <Equipment    {...pageProps} />,
    budgets:     <Budgets      {...pageProps} />,
    rehearsals:  <Rehearsals   {...pageProps} />,
    settings:         <SettingsErrorBoundary key="settings-eb"><Settings {...pageProps} /></SettingsErrorBoundary>,
    upgrade:          <Upgrade       {...pageProps} targetPlan={upgradeTarget} />,
    'payment-success':  <PaymentSuccess  {...pageProps} />,
    'subscription':     <Subscription    {...pageProps} />,
    'email-confirmed':  <EmailConfirmed  {...pageProps} />,
    'email-confirm':    <EmailConfirm    {...pageProps} />,
  }

  const EXEMPT_PAGES = ['upgrade', 'subscription', 'payment-success', 'email-confirmed', 'email-confirm']
  if (isExpired && !EXEMPT_PAGES.includes(page)) return <TrialExpired />

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        current={page}
        onNav={navigate}
        eventCount={events.length}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 md:ml-56 min-w-0">
        <Topbar current={page} onMenuOpen={() => setSidebarOpen(true)} onNav={navigate} />
        {activeCollab && (
          <div className="fixed top-14 left-0 right-0 md:left-56 z-20 bg-amber-500 text-white flex items-center justify-between px-4 sm:px-6 py-2 text-xs font-medium gap-2">
            <span className="flex items-center gap-1.5 min-w-0">
              <UserCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {session?.isSimulation ? 'Simulando' : 'Conectado como'} — <strong>{activeCollab.name}</strong>
              </span>
            </span>
            <button
              onClick={session?.isSimulation ? switchToChief : logout}
              className="shrink-0 bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors"
            >
              {session?.isSimulation ? 'Voltar ao painel' : 'Sair'}
            </button>
          </div>
        )}

        {showTrialBanner && (
          <div className={cn(
            'fixed left-0 right-0 md:left-56 z-20 h-10 flex items-center justify-between px-4 sm:px-6 gap-3',
            'bg-gradient-to-r from-orange-600 to-orange-500',
            activeCollab ? 'top-[5.5rem]' : 'top-14'
          )}>
            <span className="text-xs text-white font-medium truncate">
              Seu trial expira em {daysLeftInTrial} dia{daysLeftInTrial !== 1 ? 's' : ''} — Assine agora para não perder o acesso
            </span>
            <button
              onClick={() => navigate('upgrade')}
              className="shrink-0 bg-white text-orange-600 px-3 py-1 rounded-full text-xs font-bold hover:bg-orange-50 transition-colors"
            >
              Assinar
            </button>
          </div>
        )}

        <main className={cn(
          'min-h-screen',
          activeCollab && showTrialBanner ? 'pt-32'
          : activeCollab                  ? 'pt-22'
          : showTrialBanner               ? 'pt-24'
          :                                 'pt-14'
        )}>
          <div className="max-w-6xl mx-auto px-3 sm:px-5 md:px-6 py-5 md:py-7">
            <AnimatePresence mode="wait">
              <motion.div key={page} variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <PageWrapper page={page} activeCollab={activeCollab}>
                  {pages[page]}
                </PageWrapper>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: { fontFamily: 'Inter, sans-serif', fontSize: '13px', borderRadius: '10px' },
          classNames: { toast: 'shadow-modal border border-slate-100' },
        }}
        richColors
      />
    </div>
  )
}

function BandShell({ signOut }) {
  const { activeBand, isLoading: bandLoading } = useBand()
  if (bandLoading) return <SplashScreen />
  if (!activeBand) return <BandSelector />
  return (
    <StoreProvider key={activeBand.id}>
      <AppContent signOut={signOut} />
    </StoreProvider>
  )
}

function AppShell() {
  const { session: authSession, isLoading, signOut } = useAuth()

  // Hash-based route: #/email-confirm — accessible without auth (email confirmation link)
  if (window.location.hash.startsWith('#/email-confirm')) {
    if (isLoading) return <SplashScreen />
    return <EmailConfirm />
  }

  // Path-based route: /email-confirmed — legacy implicit-flow confirmation page
  if (window.location.pathname === '/email-confirmed') {
    if (isLoading) return <SplashScreen />
    if (!authSession) return <EmailConfirmed />
  }

  if (isLoading) return <SplashScreen />
  if (!authSession) return <Auth />

  return (
    <BandProvider key={authSession.user.id}>
      <BandShell signOut={signOut} />
    </BandProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}
