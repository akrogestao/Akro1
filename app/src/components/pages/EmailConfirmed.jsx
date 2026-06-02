import { useEffect, useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function EmailConfirmed({ onNav }) {
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function verify() {
      // When using the implicit flow, Supabase processes the hash automatically.
      // A brief delay ensures the client has exchanged the token before we call getSession.
      if (window.location.hash.includes('access_token')) {
        await new Promise(r => setTimeout(r, 600))
      }
      await supabase.auth.getSession()
      setChecking(false)
    }
    verify()
  }, [])

  const handleLogin = () => {
    if (onNav) {
      onNav('dashboard')
    } else {
      window.location.href = '/'
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <CheckCircle size={48} className="text-green-500" />
      <h2 className="text-2xl font-semibold text-white mt-4">Email confirmado!</h2>
      <p className="text-sm text-slate-400 text-center mt-2 max-w-sm">
        Sua conta foi ativada com sucesso. Agora você pode fazer login.
      </p>
      <button
        onClick={handleLogin}
        className="bg-orange-500 hover:bg-orange-600 text-white h-11 px-8 rounded-lg mt-6 text-sm font-medium transition-colors"
      >
        Fazer login
      </button>
    </div>
  )
}
