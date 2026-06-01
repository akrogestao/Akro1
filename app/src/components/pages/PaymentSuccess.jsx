import { useEffect } from 'react'
import { CheckCircle } from 'lucide-react'
import { useBand } from '@/hooks/useBand.jsx'

export default function PaymentSuccess({ onNav }) {
  const { activeBand, updateBand } = useBand()

  useEffect(() => {
    if (activeBand?.id) {
      updateBand(activeBand.id, {
        subscription_status: 'active',
        trial_ends_at:       null,
      })
    }
  }, [activeBand?.id])

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-5 px-4"
      style={{ background: '#0a0a0a' }}
    >
      <CheckCircle className="w-16 h-16 text-green-500" />

      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-white">Pagamento confirmado!</h1>
        <p className="text-slate-400 text-sm">
          Sua assinatura foi ativada com sucesso. Bem-vindo ao Akro!
        </p>
      </div>

      <button
        onClick={() => onNav('dashboard')}
        className="h-11 px-8 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition-colors"
      >
        Ir para o dashboard
      </button>
    </div>
  )
}
