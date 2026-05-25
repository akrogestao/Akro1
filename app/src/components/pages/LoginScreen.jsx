import { useState } from 'react'
import { useStore } from '@/hooks/useStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react'

export default function LoginScreen() {
  const { login, companyProfile, collaborators } = useStore()
  const [email, setEmail]     = useState('')
  const [pin, setPin]         = useState('')
  const [step, setStep]       = useState('email') // 'email' | 'pin'
  const [error, setError]     = useState('')
  const [showPin, setShowPin] = useState(false)

  const noCredentials = !companyProfile.email && collaborators.length === 0

  const handleAdminBypass = () => login('', '')

  const handleEmailNext = () => {
    setError('')
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) { setError('Digite seu e-mail'); return }

    const chiefEmail = companyProfile.email?.trim().toLowerCase()
    if (chiefEmail && cleanEmail === chiefEmail) {
      login(cleanEmail, '')
      return
    }

    const collab = collaborators.find(c => c.email?.trim().toLowerCase() === cleanEmail)
    if (collab) {
      if (!collab.pin) { login(cleanEmail, ''); return }
      setStep('pin'); return
    }

    setError('E-mail não reconhecido. Contate o administrador.')
  }

  const handlePinSubmit = () => {
    setError('')
    if (!pin) { setError('Digite seu PIN'); return }
    const result = login(email.trim().toLowerCase(), pin)
    if (!result.ok) setError(result.message)
  }

  const goBack = () => { setStep('email'); setPin(''); setError('') }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 mb-4">
            <svg viewBox="0 0 36 33" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <polygon points="18,0.5 35.5,32.5 0.5,32.5" fill="#F97316"/>
              <polyline points="9,26 18,19 27,26" stroke="#1C1917" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="6,31.5 18,24 30,31.5" stroke="#1C1917" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Akro</h1>
          <p className="text-sm text-slate-500 mt-1">Gestão de Bandas</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          {noCredentials ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Bem-vindo ao Akro! Nenhuma senha configurada.
              </p>
              <Button className="w-full" onClick={handleAdminBypass}>
                Entrar como administrador
              </Button>
            </div>
          ) : step === 'email' ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Acessar o sistema</h2>
                <p className="text-xs text-slate-500 mt-0.5">Digite o e-mail cadastrado pelo administrador</p>
              </div>

              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <Input
                    type="email"
                    className="pl-9"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    onKeyDown={e => e.key === 'Enter' && handleEmailNext()}
                    autoFocus
                  />
                </div>
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <Button className="w-full gap-1.5" onClick={handleEmailNext}>
                Continuar <ArrowRight className="w-4 h-4" />
              </Button>

            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <button
                  onClick={goBack}
                  className="text-xs text-orange-500 hover:text-orange-600 font-medium mb-2 flex items-center gap-1"
                >
                  ← Trocar e-mail
                </button>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Digite seu PIN</h2>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{email}</p>
              </div>

              <div className="space-y-1.5">
                <Label>PIN de acesso</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <Input
                    type={showPin ? 'text' : 'password'}
                    className="pl-9 pr-9 tracking-widest"
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    placeholder="••••••"
                    maxLength={8}
                    onKeyDown={e => e.key === 'Enter' && handlePinSubmit()}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <Button className="w-full" onClick={handlePinSubmit}>
                Entrar
              </Button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">Akro — Gestão de Bandas</p>
      </div>
    </div>
  )
}
