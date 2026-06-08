import { supabase } from '@/lib/supabase'

export const PRICE_PROFISSIONAL = 'price_1Tg9ib4W1YK1eZ3ZzSGIcBIU'
export const PRICE_MULTI_BANDAS = 'price_1Tg9iv4W1YK1eZ3ZwM1RmA8T'

export async function initiateCheckout(priceId, _email) {
  try {
    // userId via getSession (mesmo padrão do restante do sistema)
    const { data: { session }, error: sessionErr } = await supabase.auth.getSession()
    if (sessionErr || !session?.user) {
      console.error('[Stripe] Sessão não encontrada:', sessionErr)
      return
    }
    const userId = session.user.id

    // bandId: tenta localStorage primeiro (setado ao trocar/adicionar banda).
    // Para usuários com apenas a primeira banda criada automaticamente,
    // localStorage pode estar vazio — nesse caso consulta o Supabase,
    // espelhando o fallback que useBand.jsx usa (firstBand = bandList[0]).
    let bandId = localStorage.getItem('bm_active_band_id')
    if (!bandId) {
      const { data: bands, error: bandsErr } = await supabase
        .from('bands')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(1)

      if (bandsErr) {
        console.error('[Stripe] Erro ao buscar banda:', bandsErr)
        return
      }
      bandId = bands?.[0]?.id ?? null
    }

    if (!bandId) {
      console.error('[Stripe] Nenhuma banda encontrada para o usuário', userId)
      return
    }

    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: { priceId, userId, bandId },
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
