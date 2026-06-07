import { useState } from 'react'
import { Check, ArrowLeft, Zap, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth.jsx'
import { useBand } from '@/hooks/useBand.jsx'
import { supabase } from '@/lib/supabase'
import { initiateCheckout, PRICE_PROFISSIONAL, PRICE_MULTI_BANDAS } from '@/lib/stripe.js'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

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

export default function Upgrade({ onNav }) {
  const { session } = useAuth()
  const { activeBand, updateBand } = useBand()
  const email = session?.user?.email || ''
  const [loading, setLoading] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [canceling, setCanceling] = useState(false)

  const isActive = activeBand?.subscription_status === 'active'
  const currentPlan = PLANS.find(p => p.id === activeBand?.plan)

  const handleCheckout = async (priceId, planId) => {
    setLoading(planId)
    await initiateCheckout(priceId, email)
    setLoading(null)
  }

  const handleCancel = async () => {
    setCanceling(true)
    try {
      const { error } = await supabase.functions.invoke('cancel-subscription', {
        body: { band_id: activeBand.id },
      })
      if (error) throw error
      await updateBand(activeBand.id, { subscription_status: 'canceling' })
      toast.success('Assinatura cancelada. Acesso mantido até o fim do período atual.')
      setConfirmOpen(false)
    } catch (err) {
      console.error('[cancel-subscription]', err)
      toast.error('Erro ao cancelar assinatura. Tente novamente.')
    } finally {
      setCanceling(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: '#0a0a0a' }}
    >
      <div className="w-full max-w-2xl">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center">
            <Zap className="w-9 h-9 text-orange-500" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white text-center mb-2">
          Escolha seu plano
        </h1>
        <p className="text-sm text-slate-400 text-center mb-8">
          Sem contratos. Cancele quando quiser.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PLANS.map(plan => (
            <div
              key={plan.id}
              className={`rounded-2xl border p-6 flex flex-col gap-5 ${
                plan.highlight
                  ? 'border-orange-500 bg-orange-500/10'
                  : 'border-slate-700 bg-white/5'
              }`}
            >
              {plan.highlight && (
                <span className="self-start text-[10px] font-bold uppercase tracking-widest bg-orange-500 text-white px-2.5 py-1 rounded-full">
                  Mais popular
                </span>
              )}
              <div>
                <p className="text-white font-bold text-xl">{plan.name}</p>
                <p className="mt-1">
                  <span className="text-orange-400 font-bold text-2xl">{plan.price}</span>
                  <span className="text-slate-500 text-sm">/mês</span>
                </p>
              </div>
              <ul className="space-y-2 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                    <Check className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleCheckout(plan.priceId, plan.id)}
                disabled={loading === plan.id}
                className={`w-full h-11 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 ${
                  plan.highlight
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : 'bg-white/10 hover:bg-white/20 text-white border border-slate-600'
                }`}
              >
                {loading === plan.id ? 'Redirecionando...' : 'Assinar agora'}
              </button>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-500 text-center mt-6">
          Pagamento seguro via Stripe. Cancele quando quiser.
        </p>

        {isActive && currentPlan && (
          <div className="mt-6 border border-slate-700 rounded-2xl p-6 bg-white/5">
            <h2 className="text-white font-semibold text-sm mb-4">Minha assinatura</h2>
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Plano atual</span>
              <span className="text-white text-sm font-medium">{currentPlan.name}</span>
            </div>
            <div className="flex items-center justify-between mb-5">
              <span className="text-slate-400 text-sm">Valor mensal</span>
              <span className="text-white text-sm font-medium">{currentPlan.price}/mês</span>
            </div>
            <button
              onClick={() => setConfirmOpen(true)}
              className="text-sm text-red-400 border border-red-400 hover:bg-red-400 hover:text-white rounded-lg px-4 py-2 transition-colors"
            >
              Cancelar assinatura
            </button>
          </div>
        )}

        <div className="flex justify-center mt-6">
          <button
            onClick={() => onNav('dashboard')}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao sistema
          </button>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
              <DialogTitle>Cancelar assinatura</DialogTitle>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Ao cancelar você perderá acesso ao sistema ao fim do período atual já pago. Tem certeza?
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
              {canceling ? 'Cancelando...' : 'Confirmar cancelamento'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
