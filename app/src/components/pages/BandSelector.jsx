import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Music2, Plus, Check, Loader2 } from 'lucide-react'
import { useBand } from '@/hooks/useBand.jsx'
import { usePlanLimits } from '@/hooks/usePlanLimits'
import UpgradeModal from '@/components/shared/UpgradeModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function BandSelector() {
  const { bands, activeBand, switchBand, addBand, canAddBand } = useBand()
  const { limits, plan } = usePlanLimits()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  async function handleCreate(e) {
    e.preventDefault()
    if (!name.trim()) return
    if (bands.length >= limits.maxBands) {
      setUpgradeOpen(true)
      return
    }
    setSaving(true)
    await addBand(name.trim())
    setSaving(false)
    setName('')
    setShowForm(false)
  }

  const showAddCard = activeBand?.plan === 'multi_bandas' && bands.length < 5

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-4"
      style={{ background: '#0a0a0a' }}>

      <div className="text-center">
        <svg viewBox="0 0 36 33" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 mx-auto mb-4">
          <polygon points="18,0.5 35.5,32.5 0.5,32.5" fill="#F97316" />
          <polyline points="9,26 18,19 27,26" stroke="#1C1917" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="6,31.5 18,24 30,31.5" stroke="#1C1917" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h1 className="text-xl font-bold text-white">Selecione uma banda</h1>
        <p className="text-sm text-slate-500 mt-1">Escolha qual banda deseja gerenciar</p>
      </div>

      <div className="w-full max-w-md grid grid-cols-1 gap-3">
        {bands.map(band => (
          <motion.button
            key={band.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => switchBand(band.id)}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border text-left transition-all ${
              activeBand?.id === band.id
                ? 'bg-orange-500/10 border-orange-500/40 text-white'
                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/8 hover:border-white/20'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
              <Music2 className="w-5 h-5 text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{band.name}</p>
              <p className="text-xs text-slate-500 capitalize mt-0.5">{band.plan === 'multi_bandas' ? 'Multi-bandas' : 'Profissional'}</p>
            </div>
            {activeBand?.id === band.id && <Check className="w-4 h-4 text-orange-400 shrink-0" />}
          </motion.button>
        ))}

        {showAddCard && !showForm && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setShowForm(true)}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border border-dashed border-white/15 text-slate-500 hover:border-white/25 hover:text-slate-400 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">Adicionar banda</span>
          </motion.button>
        )}

        <AnimatePresence>
          {showForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden' }}
              onSubmit={handleCreate}
              className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-4"
            >
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Nome da banda</Label>
                <Input
                  autoFocus
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Os Infernais"
                  className="bg-white/5 border-white/15 text-white placeholder:text-slate-600 focus:border-orange-500/50"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={!name.trim() || saving} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar banda'}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setName('') }}
                  className="border-white/15 text-slate-400 hover:text-white hover:bg-white/5">
                  Cancelar
                </Button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
      <UpgradeModal
        isOpen={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        feature="Gerenciar múltiplas bandas"
        currentPlan={plan}
      />
    </div>
  )
}
