import { useEffect, useState } from 'react'
import { CheckCircle, Loader2 } from 'lucide-react'
import { useBand } from '@/hooks/useBand.jsx'

export default function PaymentSuccess({ onNav }) {
  const { activeBand, updateBand } = useBand()
  const [countdown, setCountdown] = useState(2)

  // Lê o session_id retornado pelo Stripe na success_url
  const sessionId = new URLSearchParams(window.location.search).get('session_id')

  // Limpa session_id da URL imediatamente ao montar — garante que ocorre antes do redirect
  useEffect(() => {
    window.history.replaceState(null, '', window.location.pathname)
  }, [])

  // Atualiza o status da assinatura na banda ativa
  useEffect(() => {
    if (!activeBand?.id) return
    updateBand(activeBand.id, {
      subscription_status: 'active',
      trial_ends_at:       null,
    })
  }, [activeBand?.id])

  // Auto-navega para o dashboard após 2 segundos
  useEffect(() => {
    if (countdown <= 0) {
      onNav('dashboard')
      return
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

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
        {sessionId && (
          <p className="text-xs text-slate-600 font-mono mt-1">
            Sessão: {sessionId.slice(0, 24)}…
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 text-slate-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Redirecionando em {countdown}s…
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
