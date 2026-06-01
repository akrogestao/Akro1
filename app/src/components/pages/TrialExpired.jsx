import { Clock, Check } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth.jsx'
import { initiateCheckout, PRICE_PROFISSIONAL, PRICE_MULTI_BANDAS } from '@/lib/stripe.js'

const PLANS = [
  {
    id:       'profissional',
    name:     'Profissional',
    price:    'R$ 94,99',
    priceId:  PRICE_PROFISSIONAL,
    features: ['Até 23 membros', 'Até 2 colaboradores', 'Checklist completo', 'Todas as funcionalidades'],
  },
  {
    id:       'multi_bandas',
    name:     'Multi-bandas',
    price:    'R$ 164,99',
    priceId:  PRICE_MULTI_BANDAS,
    features: ['Membros ilimitados', 'Até 5 colaboradores', 'Gerencie até 5 bandas', 'Suporte prioritário'],
  },
]

export default function TrialExpired() {
  const { session } = useAuth()
  const email = session?.user?.email || ''

  const handleCheckout = async (priceId) => {
    await initiateCheckout(priceId, email)
  }

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center px-4 py-12 z-50"
      style={{ background: '#0a0a0a', width: '100vw', height: '100vh' }}
    >
      <div className="w-full max-w-2xl flex flex-col items-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center">
          <Clock className="w-9 h-9 text-orange-500" />
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white">Seu período de teste encerrou</h1>
          <p className="text-slate-400 text-sm">
            Assine um plano para continuar usando o Akro
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mt-2">
          {PLANS.map(plan => (
            <div
              key={plan.id}
              className="rounded-2xl border border-slate-700 bg-white/5 p-5 flex flex-col gap-4"
            >
              <div>
                <p className="text-white font-bold text-lg">{plan.name}</p>
                <p className="text-orange-400 font-semibold text-sm mt-0.5">{plan.price}<span className="text-slate-500 font-normal">/mês</span></p>
              </div>
              <ul className="space-y-1.5 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-slate-300">
                    <Check className="w-3 h-3 text-orange-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleCheckout(plan.priceId)}
                className="w-full h-10 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors"
              >
                Assinar agora
              </button>
            </div>
          ))}
        </div>

        <a
          href="mailto:contato@akro.com.br"
          className="text-xs text-slate-500 hover:text-slate-400 transition-colors mt-2"
        >
          Falar com suporte
        </a>
      </div>
    </div>
  )
}
