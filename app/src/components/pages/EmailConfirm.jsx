import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function EmailConfirm({ onNav }) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    setError(false)
    try {
      // Case 1: implicit flow — Supabase may have already processed the hash and created a session
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        onNav ? onNav('dashboard') : (window.location.href = '/')
        return
      }

      // Case 2: PKCE flow — exchange the code found in query string or hash fragment
      const searchCode = new URLSearchParams(window.location.search).get('code')
      const hashAfterRoute = window.location.hash.split('?')[1] || ''
      const hashCode = new URLSearchParams(hashAfterRoute).get('code')
      const code = searchCode || hashCode

      if (code) {
        const { error: exchErr } = await supabase.auth.exchangeCodeForSession(code)
        if (exchErr) throw exchErr
        onNav ? onNav('dashboard') : (window.location.href = '/')
        return
      }

      throw new Error('no_token')
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const handleBackToLogin = () => {
    window.location.href = '/'
  }

  return (
    <div
      className="flex items-center justify-center relative"
      style={{ width: '100vw', height: '100vh', background: '#0a0a0a' }}
    >
      <div className="px-6 text-center w-full" style={{ maxWidth: 480 }}>

        {/* Logo mark */}
        <div
          className="border border-slate-800 rounded-2xl inline-flex items-center justify-center mb-8"
          style={{ width: 56, height: 56, background: '#1a1a1a' }}
        >
          <span className="text-2xl font-bold text-orange-500">A</span>
        </div>

        <h1 className="text-2xl font-semibold text-white mb-3">Confirmar conta</h1>
        <p className="text-sm text-slate-400 leading-relaxed mb-10">
          Clique no botão abaixo para confirmar seu email e acessar o Akro.
        </p>

        <button
          onClick={handleConfirm}
          disabled={loading}
          className="w-full h-14 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-base rounded-xl transition-colors duration-150 disabled:opacity-70 flex items-center justify-center gap-2"
        >
          {loading
            ? <><Loader2 className="w-5 h-5 animate-spin" />Confirmando...</>
            : 'Confirmar conta'}
        </button>

        {error && (
          <div className="flex flex-col items-center">
            <p className="text-sm text-red-400 mt-4">
              O link expirou ou é inválido. Solicite um novo email de confirmação.
            </p>
            <button
              onClick={handleBackToLogin}
              className="text-sm text-slate-400 hover:text-white mt-3 transition-colors"
            >
              Voltar ao login
            </button>
          </div>
        )}
      </div>

      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-xs text-slate-600">
          Se tiver algum problema entre em contato pelo{' '}
          <a href="mailto:contato@akrogestao.com" className="text-orange-500">
            contato@akrogestao.com
          </a>
        </p>
      </div>
    </div>
  )
}
