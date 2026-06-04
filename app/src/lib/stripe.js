import { supabase } from '@/lib/supabase'

export const PRICE_PROFISSIONAL = 'price_1TdWuj4W1YK1eZ3Zq2xPtq5D'
export const PRICE_MULTI_BANDAS = 'price_1TdWvC4W1YK1eZ3Zf9mscavA'

// Chama a Edge Function create-checkout-session e redireciona para o Stripe Checkout.
// Mantém a assinatura (priceId, email) para compatibilidade com Upgrade.jsx e TrialExpired.jsx;
// userId e bandId são obtidos internamente.
export async function initiateCheckout(priceId, _email) {
  try {
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      console.error('[Stripe] Usuário não autenticado:', authErr)
      return
    }

    const bandId = localStorage.getItem('bm_active_band_id')
    if (!bandId) {
      console.error('[Stripe] bandId não encontrado no localStorage')
      return
    }

    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: { priceId, userId: user.id, bandId },
    })

    if (error) {
      console.error('[Stripe] Erro na Edge Function create-checkout-session:', error)
      return
    }

    if (!data?.url) {
      console.error('[Stripe] URL de checkout não retornada. Resposta:', data)
      return
    }

    window.location.href = data.url
  } catch (err) {
    console.error('[Stripe] Exceção em initiateCheckout:', err)
  }
}
