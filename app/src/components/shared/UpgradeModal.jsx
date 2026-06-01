import { Zap } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'

const PLANS = [
  { id: 'profissional', name: 'Profissional' },
  { id: 'multi_bandas', name: 'Multi-bandas' },
]

const PLAN_INDEX = { profissional: 0, multi_bandas: 1 }
const PLAN_NAMES = { profissional: 'Profissional', multi_bandas: 'Multi-bandas' }

const FEATURE_PLAN_INFO = {
  'Adicionar mais membros ao seu elenco':   ['Até 25 membros',           'Membros ilimitados'],
  'Adicionar colaboradores ao sistema':      ['Colaboradores ilimitados', 'Colaboradores ilimitados'],
  'Checklist de produção':                   ['Disponível',               'Disponível'],
  'Criar orçamentos e propostas comerciais': ['Disponível',               'Disponível'],
  'Controle de equipamentos':                ['Disponível',               'Disponível'],
  'Gestão de ensaios':                       ['Disponível',               'Disponível'],
  'Relatórios completos em PDF':             ['Todos os relatórios',      'Todos os relatórios'],
  'Gerenciar múltiplas bandas':              ['1 banda',                  'Até 5 bandas'],
}

const DEFAULT_PLAN_INFO = ['Disponível', 'Disponível']

export default function UpgradeModal({ isOpen, onClose, feature = '', currentPlan = 'profissional', onNav }) {
  const currentIdx = PLAN_INDEX[currentPlan] ?? 0
  const planInfo   = FEATURE_PLAN_INFO[feature] || DEFAULT_PLAN_INFO
  const planName   = PLAN_NAMES[currentPlan] || 'atual'

  const handleUpgrade = (planId) => {
    onClose()
    if (onNav) onNav('upgrade', { targetPlan: planId })
  }

  return (
    <Dialog open={isOpen} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-md border-slate-800" style={{ background: '#0f0f0f' }}>
        <div className="px-2 pt-4 pb-2">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center">
              <Zap className="w-8 h-8 text-orange-500" />
            </div>
            <h2 className="text-xl font-semibold text-white mt-3">Limite do plano atingido</h2>
            <p className="text-sm text-slate-400 text-center mt-2 max-w-sm">
              {feature
                ? `"${feature}" não está disponível no plano ${planName}. Faça upgrade para continuar.`
                : `Este recurso não está disponível no plano ${planName}. Faça upgrade para continuar.`}
            </p>
          </div>

          <div className="flex flex-col gap-3 mb-4">
            {PLANS.map((plan, idx) => {
              const isCurrent  = idx === currentIdx
              const isSuperior = idx > currentIdx
              const isInferior = idx < currentIdx

              return (
                <div
                  key={plan.id}
                  className={[
                    'rounded-xl border p-4 transition-all',
                    isCurrent  ? 'border-slate-600 bg-slate-800/60' : '',
                    isSuperior ? 'border-orange-500/40 bg-orange-500/5' : '',
                    isInferior ? 'border-slate-700 bg-slate-900/40 opacity-40' : '',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-white">{plan.name}</span>
                    {isCurrent && (
                      <span className="text-[10px] font-semibold bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                        Plano atual
                      </span>
                    )}
                    {isSuperior && (
                      <span className="text-[10px] font-semibold bg-orange-500 text-white px-2 py-0.5 rounded-full">
                        Recomendado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mb-3">{planInfo[idx]}</p>
                  {isSuperior && (
                    <button
                      onClick={() => handleUpgrade(plan.id)}
                      className="w-full h-10 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Fazer upgrade agora
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex justify-center">
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-300 text-sm transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
