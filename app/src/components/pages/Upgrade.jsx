import { useState } from 'react'
import { Check, ArrowLeft, Zap } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth.jsx'
import { initiateCheckout, PRICE_PROFISSIONAL, PRICE_MULTI_BANDAS } from '@/lib/stripe.js'

const PLANS = [
  {
    id:       'profissional',
    name:     'Profissional',
    price:    'R$ 94,99',
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
    price:    'R$ 164,99',
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
  const email = session?.user?.email || ''
  const [loading, setLoading] = useState(null)

  const handleCheckout = async (priceId, planId) => {
    setLoading(planId)
    await initiateCheckout(priceId, email)
    setLoading(null)
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
    </div>
  )
}
