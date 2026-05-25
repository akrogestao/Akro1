import { useState } from 'react'
import { Zap, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth.jsx'
import { useBand } from '@/hooks/useBand.jsx'
import { toast } from 'sonner'

const PLAN_NAMES = { solo: 'Solo', profissional: 'Profissional', multi_bandas: 'Multi-bandas' }

export default function Upgrade({ onNav, targetPlan }) {
  const { session } = useAuth()
  const { activeBand } = useBand()
  const [email, setEmail]     = useState(session?.user?.email || '')
  const [message, setMessage] = useState('')
  const [saving, setSaving]   = useState(false)

  const targetName = PLAN_NAMES[targetPlan] || 'Profissional'
  const currentPlan = activeBand?.plan || 'solo'

  const handleSubmit = async () => {
    if (!email.trim()) { toast.error('Informe seu e-mail'); return }
    setSaving(true)
    const { error } = await supabase.from('upgrade_interest').insert({
      email:        email.trim(),
      current_plan: currentPlan,
      target_plan:  targetPlan || null,
      message:      message.trim() || null,
    })
    setSaving(false)
    if (error) { toast.error('Erro ao enviar. Tente novamente.'); return }
    toast.success('Anotado! Te avisamos quando os pagamentos estiverem disponíveis.')
    onNav('dashboard')
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: '#0a0a0a' }}
    >
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-3xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center">
            <Zap className="w-12 h-12 text-orange-500" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white text-center mb-2">
          Upgrade para {targetName}
        </h1>
        <p className="text-sm text-slate-400 text-center mb-8">
          Os pagamentos ainda não estão disponíveis. Deixe seu e-mail e te avisamos assim que estiverem.
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 block">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full h-11 px-4 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 block">
              Mensagem <span className="text-slate-600 font-normal">(opcional)</span>
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Algo que gostaria de nos contar..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors resize-none"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full h-11 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {saving ? 'Enviando...' : 'Quero ser avisado'}
          </button>
        </div>

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
