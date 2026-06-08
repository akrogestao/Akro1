import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, Music, CalendarCheck, DollarSign, CheckSquare, Loader2, MailCheck, Check, RefreshCw, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth.jsx'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

const PLANS = [
  {
    id: 'profissional',
    name: 'Profissional',
    price: 'R$ 199,00/mês',
    features: ['Até 25 membros', '1 banda', 'Todas as funcionalidades'],
  },
  {
    id: 'multi_bandas',
    name: 'Multi-bandas',
    price: 'R$ 299,00/mês',
    features: ['Até 5 bandas', 'Membros ilimitados', 'Colaboradores ilimitados'],
  },
]

const FEATURES = [
  { icon: CalendarCheck, text: 'Gestão completa de shows e contratos' },
  { icon: DollarSign,    text: 'Financeiro e cachês em tempo real' },
  { icon: CheckSquare,   text: 'Checklist e produção integrados' },
]

function LeftPanel() {
  return (
    <div
      className="hidden md:flex relative flex-col items-center justify-center h-full px-12 overflow-hidden"
      style={{ width: '45%', background: '#0a0a0a' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 70% at center, rgba(249,115,22,0.12) 0%, transparent 100%)' }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-xs">
        <div className="flex flex-col items-center gap-3">
          <img src="/png akro.png" alt="Akro" className="w-48 object-contain" />
          <p className="text-lg text-slate-400 text-center max-w-xs">
            O sistema nervoso central da sua banda
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          {FEATURES.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <Icon size={16} className="text-orange-500 shrink-0" />
              <span className="text-sm text-slate-300">{text}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="absolute bottom-8 text-xs text-slate-600">Akro © 2026</p>
    </div>
  )
}

function AuthInput({ type = 'text', placeholder, value, onChange, left, right, onKeyDown }) {
  return (
    <div className="relative">
      {left && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
          {left}
        </div>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full h-11 rounded-lg border border-slate-700 text-white placeholder:text-slate-600 text-sm focus:border-orange-500 focus:outline-none transition-colors duration-150"
        style={{ background: '#1a1a1a', paddingLeft: left ? 40 : 12, paddingRight: right ? 40 : 12 }}
      />
      {right && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {right}
        </div>
      )}
    </div>
  )
}

function SubmitButton({ label, isLoading, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className="w-full h-11 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-medium rounded-lg transition-colors duration-150 flex items-center justify-center gap-2"
    >
      {isLoading ? <Loader2 size={16} className="animate-spin" /> : label}
    </button>
  )
}

function CollaboratorLoginForm({ onBack }) {
  const [email,   setEmail]   = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handleSubmit = async () => {
    setError('')
    if (!email || !password) { setError('Preencha todos os campos'); return }
    setLoading(true)
    const { data: rows, error: rpcErr } = await supabase.rpc('authenticate_collaborator', { p_email: email.trim().toLowerCase(), p_password: password })
    if (rpcErr) {
      console.error('authenticate_collaborator RPC error:', rpcErr)
      setLoading(false)
      setError('Email ou senha incorretos')
      return
    }
    if (!rows || rows.length === 0) {
      setLoading(false)
      setError('Email ou senha incorretos')
      return
    }
    const collab = rows[0]
    console.log('Colaborador autenticado:', { id: collab.id, name: collab.name, band_id: collab.band_id })
    try {
      localStorage.setItem('bm_collab_session', JSON.stringify({ id: collab.id, name: collab.name, band_id: collab.band_id, permissions: collab.permissions }))
      localStorage.setItem('bm_active_band_id', collab.band_id)
      const { error: anonErr } = await supabase.auth.signInAnonymously({ options: { data: { collab_band_id: collab.band_id } } })
      if (anonErr) {
        console.error('signInAnonymously error:', anonErr)
        setError('Erro ao iniciar sessão. Tente novamente.')
        setLoading(false)
      }
    } catch (e) {
      console.error('Erro inesperado ao iniciar sessão de colaborador:', e)
      setError('Erro ao iniciar sessão. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <motion.div
      key="colaborador"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="w-full max-w-sm"
    >
      <div className="mb-6 flex justify-center">
        <span className="bg-amber-500/20 text-amber-400 text-xs font-semibold px-3 py-1 rounded-full">
          Acesso de colaborador
        </span>
      </div>

      <h1 className="text-2xl font-semibold text-white mb-2">Entrar como colaborador</h1>
      <p className="text-sm text-slate-400 mb-8">Use as credenciais fornecidas pelo administrador</p>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
          <AuthInput
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            left={<Mail size={16} />}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Senha</label>
          <AuthInput
            type={showPwd ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            left={<Lock size={16} />}
            right={
              <button type="button" onClick={() => setShowPwd(p => !p)} className="text-slate-400 hover:text-slate-300 transition-colors">
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full h-11 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-medium rounded-lg transition-colors duration-150 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : 'Entrar como colaborador'}
        </button>
        {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
      </div>

      <button
        onClick={onBack}
        className="block text-xs text-slate-500 hover:text-slate-400 text-center w-full mt-6 transition-colors"
      >
        Voltar ao login do chefe
      </button>
    </motion.div>
  )
}

function LoginForm({ onSwitch, onRecovery }) {
  const { signIn } = useAuth()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [collabMode, setCollabMode] = useState(false)

  const handleSubmit = async () => {
    setError('')
    if (!email || !password) { setError('Preencha todos os campos'); return }
    setLoading(true)
    const { error: err } = await signIn(email, password)
    setLoading(false)
    if (err) setError(err.message)
  }

  return (
    <AnimatePresence mode="wait">
      {collabMode ? (
        <CollaboratorLoginForm key="collab" onBack={() => setCollabMode(false)} />
      ) : (
        <motion.div
          key="login"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-sm"
        >
          <h1 className="text-2xl font-semibold text-white mb-2">Bem-vindo de volta</h1>
          <p className="text-sm text-slate-400 mb-8">Entre na sua conta Akro</p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
              <AuthInput
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                left={<Mail size={16} />}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Senha</label>
              <AuthInput
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                left={<Lock size={16} />}
                right={
                  <button type="button" onClick={() => setShowPwd(p => !p)} className="text-slate-400 hover:text-slate-300 transition-colors">
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
            </div>
          </div>

          <button
            onClick={onRecovery}
            className="block text-xs text-orange-500 hover:text-orange-400 text-right w-full mt-1 mb-6"
          >
            Esqueci minha senha
          </button>

          <SubmitButton label="Entrar" isLoading={loading} onClick={handleSubmit} />
          {error && <p className="text-sm text-red-400 mt-2">{error}</p>}

          <button
            onClick={() => setCollabMode(true)}
            className="block text-xs text-slate-500 hover:text-slate-400 text-center w-full mt-4 transition-colors"
          >
            Entrar como colaborador
          </button>

          <p className="text-sm text-slate-500 text-center mt-4">
            Ainda não tem uma conta?{' '}
            <button
              onClick={onSwitch}
              className="text-orange-500 hover:text-orange-400"
            >
              Criar conta grátis
            </button>
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function PlanCard({ plan, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(plan.id)}
      className={`w-full text-left rounded-xl border p-4 transition-all ${
        selected
          ? 'border-orange-500 bg-orange-500/10'
          : 'border-slate-700 bg-white/5 hover:border-slate-500'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-white">{plan.name}</span>
      </div>
      <p className="text-xs text-orange-400 font-medium mb-0.5">{plan.price}</p>
      <p className="text-xs text-green-400 mb-2">14 dias grátis sem cartão</p>
      <ul className="space-y-1">
        {plan.features.map(f => (
          <li key={f} className="flex items-center gap-2 text-xs text-slate-300">
            <Check size={11} className="text-orange-500 shrink-0" />
            {f}
          </li>
        ))}
      </ul>
    </button>
  )
}

function SignupForm({ onSwitch }) {
  const { signUp, signIn } = useAuth()
  const [step,       setStep]      = useState(1)
  const [bandName,   setBandName]  = useState('')
  const [email,      setEmail]     = useState('')
  const [password,   setPassword]  = useState('')
  const [confirm,    setConfirm]   = useState('')
  const [showPwd,    setShowPwd]   = useState(false)
  const [showConf,   setShowConf]  = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')
  const [success,       setSuccess]       = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [cooldown,      setCooldown]      = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const handleResend = async () => {
    setResendLoading(true)
    await supabase.auth.resend({ type: 'signup', email })
    setResendLoading(false)
    toast.success('Email reenviado! Verifique sua caixa de entrada.')
    setCooldown(60)
  }

  const pwdMismatch = confirm && password !== confirm

  const handleNext = () => {
    setError('')
    if (!bandName || !email || !password) { setError('Preencha todos os campos'); return }
    if (password !== confirm) { setError('As senhas não coincidem'); return }
    setStep(2)
  }

  const handleSubmit = async () => {
    if (!selectedPlan) return
    setLoading(true)
    const { error: err } = await signUp(email, password, { nomeDaBanda: bandName, plano: selectedPlan })
    if (err) { setError(err.message); setLoading(false); return }
    const { error: loginErr } = await signIn(email, password)
    setLoading(false)
    if (loginErr) setError(loginErr.message)
  }

  return (
    <motion.div
      key="cadastro"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="w-full max-w-sm"
    >
      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
            <h1 className="text-2xl font-semibold text-white mb-2">Criar sua conta</h1>
            <p className="text-sm text-slate-400 mb-6">Comece seu trial de 14 dias grátis</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Nome da banda</label>
                <AuthInput
                  placeholder="Nome da sua banda"
                  value={bandName}
                  onChange={e => setBandName(e.target.value)}
                  left={<Music size={16} />}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
                <AuthInput
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  left={<Mail size={16} />}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Senha</label>
                <AuthInput
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  left={<Lock size={16} />}
                  right={
                    <button type="button" onClick={() => setShowPwd(p => !p)} className="text-slate-400 hover:text-slate-300 transition-colors">
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Confirmar senha</label>
                <AuthInput
                  type={showConf ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  left={<Lock size={16} />}
                  right={
                    <button type="button" onClick={() => setShowConf(p => !p)} className="text-slate-400 hover:text-slate-300 transition-colors">
                      {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                  onKeyDown={e => e.key === 'Enter' && handleNext()}
                />
                {pwdMismatch && <p className="text-xs text-red-400 mt-1">As senhas não coincidem</p>}
              </div>
            </div>

            <div className="mt-6">
              <SubmitButton label="Próximo →" isLoading={false} onClick={handleNext} />
              {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
            </div>

            <p className="text-sm text-slate-500 text-center mt-6">
              Já tem uma conta?{' '}
              <button onClick={onSwitch} className="text-orange-500 hover:text-orange-400">Entrar</button>
            </p>
          </motion.div>
        ) : (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
            <button
              type="button"
              onClick={() => { setStep(1); setError('') }}
              className="text-xs text-slate-500 hover:text-slate-400 mb-4 flex items-center gap-1"
            >
              ← Voltar
            </button>
            <h1 className="text-2xl font-semibold text-white mb-1">Escolha seu plano</h1>
            <p className="text-sm text-slate-400 mb-5">14 dias grátis · Sem cobrança agora</p>

            <div className="space-y-3">
              {PLANS.map(plan => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  selected={selectedPlan === plan.id}
                  onSelect={setSelectedPlan}
                />
              ))}
            </div>

            <div className="mt-6">
              <button
                onClick={handleSubmit}
                disabled={!selectedPlan || loading}
                className="w-full h-11 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors duration-150 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Criar conta gratuita'}
              </button>
              {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
            </div>

            <p className="text-xs text-slate-600 text-center mt-4">
              Ao criar sua conta você concorda com os{' '}
              <a href="/termos" className="text-slate-500 hover:text-slate-400">Termos de uso</a>
              {' '}e{' '}
              <a href="/privacidade" className="text-slate-500 hover:text-slate-400">Política de privacidade</a>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function RecoveryForm({ onSwitch }) {
  const { resetPassword } = useAuth()
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  const handleSubmit = async () => {
    setError('')
    if (!email) { setError('Digite seu email'); return }
    setLoading(true)
    const { error: err } = await resetPassword(email)
    setLoading(false)
    if (err) setError(err.message)
    else setSent(true)
  }

  return (
    <motion.div
      key="recuperacao"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="w-full max-w-sm"
    >
      <h1 className="text-2xl font-semibold text-white mb-2">Recuperar senha</h1>
      <p className="text-sm text-slate-400 mb-8">
        Digite seu email e enviaremos um link para redefinir sua senha
      </p>

      {sent ? (
        <div className="flex flex-col items-center text-center">
          <MailCheck size={36} className="text-orange-500" />
          <h2 className="text-lg font-semibold text-white mt-3">Link enviado!</h2>
          <p className="text-sm text-slate-400 mt-2">
            Verifique sua caixa de entrada e clique no link para redefinir sua senha.
          </p>
          <button onClick={onSwitch} className="text-sm text-orange-500 mt-6 hover:text-orange-400">
            Voltar ao login
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
              <AuthInput
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                left={<Mail size={16} />}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
            </div>
          </div>

          <SubmitButton label="Enviar link de recuperação" isLoading={loading} onClick={handleSubmit} />
          {error && <p className="text-sm text-red-400 mt-2">{error}</p>}

          <button onClick={onSwitch} className="block text-sm text-orange-500 hover:text-orange-400 text-center w-full mt-6">
            Voltar ao login
          </button>
        </>
      )}
    </motion.div>
  )
}

export default function Auth() {
  const _params = new URLSearchParams(window.location.search)
  const plan = _params.get('plan')
  const [mode, setMode] = useState((plan || _params.get('cadastro') === 'true') ? 'cadastro' : 'login')

  return (
    <div className="flex overflow-hidden" style={{ width: '100vw', height: '100vh' }}>
      <LeftPanel />

      <div
        className="flex flex-col items-center justify-center h-full px-8 md:px-16 flex-1"
        style={{ background: '#111111' }}
      >
        <div className="md:hidden flex flex-col items-center mb-8">
          <img src="/png akro.png" alt="Akro" className="h-16 object-contain" />
        </div>

        <AnimatePresence mode="wait">
          {mode === 'login' && (
            <LoginForm
              key="login"
              onSwitch={() => setMode('cadastro')}
              onRecovery={() => setMode('recuperacao')}
            />
          )}
          {mode === 'cadastro' && (
            <SignupForm
              key="cadastro"
              onSwitch={() => setMode('login')}
            />
          )}
          {mode === 'recuperacao' && (
            <RecoveryForm
              key="recuperacao"
              onSwitch={() => setMode('login')}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
