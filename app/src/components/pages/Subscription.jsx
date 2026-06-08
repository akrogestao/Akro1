import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, Bell, Check, Zap, AlertTriangle, Loader2, LogOut } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useBand } from '@/hooks/useBand.jsx'
import { useAuth } from '@/hooks/useAuth.jsx'
import { useStore } from '@/hooks/useStore'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import NotificationsDropdown from '@/components/shared/NotificationsDropdown'
import { useNotifications } from '@/hooks/useNotifications'
import { useSubscription } from '@/hooks/useSubscription'
import { initiateCheckout, PRICE_PROFISSIONAL, PRICE_MULTI_BANDAS } from '@/lib/stripe.js'

const PLANS = [
  {
    id:       'profissional',
    name:     'Profissional',
    price:    'R$ 199,00',
    priceId:  PRICE_PROFISSIONAL,
    features: [
      'Até 23 membros',
      'Até 2 colaboradores',
      'Checklist completo',
      'Relatórios e inteligência',
      'Todas as funcionalidades',
    ],
  },
  {
    id:       'multi_bandas',
    name:     'Multi-bandas',
    price:    'R$ 299,00',
    priceId:  PRICE_MULTI_BANDAS,
    highlight: true,
    features: [
      'Membros ilimitados',
      'Até 5 colaboradores',
      'Gerencie até 5 bandas',
      'Orçamentos e propostas',
      'Suporte prioritário',
    ],
  },
]

function fmtDateBR(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('pt-BR')
}

export default function Subscription({ onNav }) {
  const { activeBand, updateBand } = useBand()
  const { signOut, session } = useAuth()
  const email = session?.user?.email || ''
  const { isExpired: isBlockedMode } = useSubscription()
  const { events, members, payments, contractors, checklistItems, rehearsals } = useStore()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications({
    events, members, payments, contractors, checklistItems, rehearsals,
  })

  const [bellOpen,        setBellOpen]        = useState(false)
  const [showUpgrade,     setShowUpgrade]      = useState(false)
  const [confirmOpen,     setConfirmOpen]      = useState(false)
  const [canceling,       setCanceling]        = useState(false)
  const [reactivating,    setReactivating]     = useState(false)
  const [reactivateFailed, setReactivateFailed] = useState(false)
  const [changingPlan,    setChangingPlan]     = useState(null)
  const bellRef = useRef(null)

  useEffect(() => {
    if (!bellOpen) return
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [bellOpen])

  const status      = activeBand?.subscription_status
  const isActive    = status === 'active'
  const isCanceling = status === 'canceling'
  const hasSubId    = !!activeBand?.stripe_subscription_id
  const currentPlan = PLANS.find(p => p.id === activeBand?.plan) ?? PLANS[0]
  const renewsAt    = fmtDateBR(activeBand?.subscription_renews_at)

  const badge =
    status === 'active'    ? { label: 'ATIVO',      cls: 'bg-green-500/20 text-green-400 border border-green-500/30' } :
    status === 'canceling' ? { label: 'CANCELANDO', cls: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' } :
                             { label: 'EXPIRADO',   cls: 'bg-red-500/20   text-red-400   border border-red-500/30'   }

  async function handleCancel() {
    setCanceling(true)
    try {
      const { error } = await supabase.functions.invoke('cancel-subscription', {
        body: { band_id: activeBand.id },
      })
      if (error) throw error
      await updateBand(activeBand.id, { subscription_status: 'canceling' })
      setConfirmOpen(false)
      toast.success('Assinatura cancelada. Você pode assinar novamente a qualquer momento.')
      await signOut()
    } catch (err) {
      console.error('[cancel-subscription]', err)
      toast.error('Erro ao encerrar assinatura. Tente novamente.')
    } finally {
      setCanceling(false)
    }
  }

  async function handleReactivate() {
    setReactivating(true)
    try {
      const { data, error } = await supabase.functions.invoke('reactivate-subscription', {
        body: { band_id: activeBand.id },
      })
      if (error) throw error
      await updateBand(activeBand.id, {
        subscription_status: 'active',
        ...(data?.renews_at ? { subscription_renews_at: data.renews_at } : {}),
      })
      toast.success('Assinatura reativada com sucesso!')
    } catch (err) {
      console.error('[reactivate-subscription]', err)
      toast.error('Erro ao reativar assinatura. Tente novamente.')
      setReactivateFailed(true)
    } finally {
      setReactivating(false)
    }
  }

  async function handleChangePlan(plan) {
    setChangingPlan(plan.id)
    try {
      const { data, error } = await supabase.functions.invoke('change-subscription', {
        body: { band_id: activeBand.id, price_id: plan.priceId, plan_id: plan.id },
      })
      if (error) throw error
      await updateBand(activeBand.id, {
        plan: plan.id,
        subscription_status: 'active',
        ...(data?.renews_at ? { subscription_renews_at: data.renews_at } : {}),
      })
      toast.success(`Migrado para o plano ${plan.name}!`)
      setShowUpgrade(false)
    } catch (err) {
      console.error('[change-subscription]', err)
      toast.error('Erro ao migrar plano. Tente novamente.')
    } finally {
      setChangingPlan(null)
    }
  }

  async function handleAssinar(plan) {
    setChangingPlan(plan.id)
    try {
      await initiateCheckout(plan.priceId, email)
    } catch (err) {
      console.error('[initiateCheckout]', err)
      toast.error('Erro ao iniciar checkout. Tente novamente.')
    } finally {
      setChangingPlan(null)
    }
  }

  // Botão correto nos cards de plano: muda plano se já tiver sub ativa, senão checkout
  function handlePlanAction(plan) {
    if (isActive || isCanceling) {
      handleChangePlan(plan)
    } else {
      handleAssinar(plan)
    }
  }

  return (
    <div className="min-h-screen px-4 pb-12" style={{ background: '#0a0a0a' }}>

      {/* Cabeçalho */}
      <div className="flex items-center gap-3 py-5 mb-2">
        <button
          onClick={() => onNav('dashboard')}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="flex-1 text-lg font-bold text-white">Assinatura</h1>
        <div ref={bellRef} className="relative">
          <button
            onClick={() => setBellOpen(v => !v)}
            className="relative w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          <AnimatePresence>
            {bellOpen && (
              <NotificationsDropdown
                notifications={notifications}
                unreadCount={unreadCount}
                markAsRead={markAsRead}
                markAllAsRead={markAllAsRead}
                onNav={onNav}
                onClose={() => setBellOpen(false)}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="max-w-lg mx-auto space-y-4">

        {/* Card do plano atual */}
        <div className="border border-slate-800 rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <span className="text-xs text-slate-400 uppercase tracking-wider">Plano atual</span>
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${badge.cls}`}>
              {badge.label}
            </span>
          </div>

          <p className="text-2xl font-bold text-white mb-1">{currentPlan.name}</p>
          <p className="mb-4">
            <span className="text-3xl font-bold text-white">{currentPlan.price}</span>
            <span className="text-slate-400 text-sm"> por mês</span>
          </p>

          {isActive && renewsAt && (
            <p className="text-sm text-slate-400 mb-5">
              Próxima cobrança: <span className="text-white font-medium">{renewsAt}</span>
            </p>
          )}
          {isCanceling && renewsAt && (
            <p className="text-sm text-amber-400 mb-5">
              Acesso mantido até <span className="font-medium">{renewsAt}</span>
            </p>
          )}

          {/* Modo bloqueado: reativar se tiver sub_id, senão escolher plano */}
          {isBlockedMode && hasSubId && !reactivateFailed && (
            <button
              onClick={handleReactivate}
              disabled={reactivating}
              className="h-10 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-medium transition-colors flex items-center gap-2"
            >
              {reactivating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {reactivating ? 'Reativando...' : 'Reativar assinatura'}
            </button>
          )}

          {/* Modo bloqueado sem sub_id ou após falha: mostrar seletor de planos */}
          {isBlockedMode && (!hasSubId || reactivateFailed) && (
            <button
              onClick={() => setShowUpgrade(v => !v)}
              className="h-10 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Zap className="w-3.5 h-3.5" />
              Escolher plano
            </button>
          )}

          {/* Trial / sem assinatura: upgrade normal */}
          {!isActive && !isCanceling && !isBlockedMode && (
            <button
              onClick={() => setShowUpgrade(v => !v)}
              className="h-10 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Zap className="w-3.5 h-3.5" />
              Fazer upgrade
            </button>
          )}
        </div>

        {/* Seletor de planos — para trial, blocked e upgrade */}
        <AnimatePresence initial={false}>
          {showUpgrade && !isActive && !isCanceling && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <div className="border border-slate-800 rounded-2xl p-6">
                <p className="text-sm font-semibold text-white mb-4">Selecione o plano</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {PLANS.map(plan => {
                    const isCurrent = plan.id === activeBand?.plan
                    return (
                      <div
                        key={plan.id}
                        className={`rounded-xl border p-4 flex flex-col gap-3 ${
                          plan.highlight
                            ? 'border-orange-500/40 bg-orange-500/5'
                            : 'border-slate-700 bg-white/5'
                        }`}
                      >
                        <div>
                          <p className="text-white font-bold">{plan.name}</p>
                          <p>
                            <span className="text-orange-400 font-bold">{plan.price}</span>
                            <span className="text-slate-500 text-xs">/mês</span>
                          </p>
                        </div>
                        <ul className="space-y-1.5 flex-1">
                          {plan.features.map(f => (
                            <li key={f} className="flex items-center gap-2 text-xs text-slate-400">
                              <Check className="w-3 h-3 text-orange-500 shrink-0" />
                              {f}
                            </li>
                          ))}
                        </ul>
                        <button
                          onClick={() => handlePlanAction(plan)}
                          disabled={changingPlan !== null}
                          className="w-full h-9 rounded-lg text-sm font-medium transition-colors bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-60"
                        >
                          {changingPlan === plan.id
                            ? (isBlockedMode ? 'Redirecionando...' : 'Migrando...')
                            : 'Assinar'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bloco cancelar / reativar — apenas quando ativo ou cancelando */}
        {(isActive || isCanceling) && (
          <div className="border border-slate-800 rounded-2xl p-6">
            <p className="text-base font-medium text-white mb-1">Cancelar assinatura</p>
            <p className="text-sm text-slate-400 mb-4">
              Ao cancelar, seu acesso será mantido até o fim do ciclo de faturamento atual.
            </p>

            {isActive && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setConfirmOpen(true)}
                    className="border border-red-500 text-red-400 hover:bg-red-500 hover:text-white rounded-lg px-4 py-2 text-sm transition-colors"
                  >
                    Encerrar assinatura
                  </button>
                  <button
                    onClick={() => setShowUpgrade(v => !v)}
                    className="border border-slate-700 text-slate-300 hover:border-orange-500 hover:text-orange-500 rounded-lg px-4 py-2 text-sm transition-colors"
                  >
                    Mudar plano
                  </button>
                </div>

                <AnimatePresence initial={false}>
                  {showUpgrade && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        {PLANS.map(plan => {
                          const isCurrent = plan.id === activeBand?.plan
                          return (
                            <div
                              key={plan.id}
                              className={`rounded-xl border p-4 flex flex-col gap-3 ${
                                plan.highlight
                                  ? 'border-orange-500/40 bg-orange-500/5'
                                  : 'border-slate-700 bg-white/5'
                              } ${isCurrent ? 'opacity-50' : ''}`}
                            >
                              <div className="flex items-start justify-between gap-2 flex-wrap">
                                <div>
                                  <p className="text-white font-bold">{plan.name}</p>
                                  <p>
                                    <span className="text-orange-400 font-bold">{plan.price}</span>
                                    <span className="text-slate-500 text-xs">/mês</span>
                                  </p>
                                </div>
                                {isCurrent && (
                                  <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full shrink-0">
                                    Plano atual
                                  </span>
                                )}
                              </div>
                              <ul className="space-y-1.5 flex-1">
                                {plan.features.map(f => (
                                  <li key={f} className="flex items-center gap-2 text-xs text-slate-400">
                                    <Check className="w-3 h-3 text-orange-500 shrink-0" />
                                    {f}
                                  </li>
                                ))}
                              </ul>
                              <button
                                onClick={() => { if (!isCurrent) handleChangePlan(plan) }}
                                disabled={isCurrent || changingPlan !== null}
                                className={`w-full h-9 rounded-lg text-sm font-medium transition-colors ${
                                  isCurrent
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    : 'bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-60'
                                }`}
                              >
                                {changingPlan === plan.id
                                  ? 'Migrando...'
                                  : isCurrent
                                  ? 'Plano atual'
                                  : 'Migrar para este plano'}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {isCanceling && (
              <div className="space-y-3">
                {renewsAt && (
                  <p className="text-sm text-amber-400">
                    Sua assinatura foi cancelada e será encerrada em{' '}
                    <span className="font-medium">{renewsAt}</span>.
                  </p>
                )}
                <button
                  onClick={handleReactivate}
                  disabled={reactivating}
                  className="border border-green-500 text-green-400 hover:bg-green-500 hover:text-white rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-60 flex items-center gap-2"
                >
                  {reactivating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {reactivating ? 'Reativando...' : 'Reativar assinatura'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Rodapé */}
        <div className="flex flex-col items-center gap-3 pt-2 pb-4">
          <p className="text-xs text-slate-500 text-center">
            Dúvidas sobre sua assinatura?{' '}
            <a href="mailto:contato@akrogestao.com" className="text-orange-500 hover:underline">
              Entre em contato com o suporte
            </a>
          </p>
          {isBlockedMode && (
            <button
              onClick={signOut}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sair da conta
            </button>
          )}
        </div>
      </div>

      {/* Dialog de confirmação de encerramento */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
              <DialogTitle>Encerrar assinatura</DialogTitle>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Você perderá acesso ao sistema ao fim do período atual já pago. Esta ação não pode ser desfeita.
            </p>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-4">
            <button
              onClick={() => setConfirmOpen(false)}
              className="flex-1 h-10 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Manter assinatura
            </button>
            <button
              onClick={handleCancel}
              disabled={canceling}
              className="flex-1 h-10 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-60"
            >
              {canceling ? 'Encerrando...' : 'Confirmar encerramento'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
