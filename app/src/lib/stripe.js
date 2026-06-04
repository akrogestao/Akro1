import { loadStripe } from '@stripe/stripe-js'

export const PRICE_PROFISSIONAL = 'price_1TdWuj4W1YK1eZ3Zq2xPtq5D'
export const PRICE_MULTI_BANDAS = 'price_1TdWvC4W1YK1eZ3Zf9mscavA'

const BASE_URL = 'https://akro1.vercel.app'

let _stripePromise = null

export async function initiateCheckout(priceId, email) {
  try {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY

    // typeof é mais robusto que !key: pega undefined, null, number, etc.
    if (typeof key !== 'string' || !key.startsWith('pk_')) {
      console.error(
        '[Stripe] Chave inválida ou ausente.',
        '| tipo:', typeof key,
        '| valor:', key ?? '(undefined/null)'
      )
      console.error('[Stripe] Adicione VITE_STRIPE_PUBLISHABLE_KEY nas variáveis de ambiente da Vercel e faça um novo deploy.')
      return
    }

    if (!_stripePromise) _stripePromise = loadStripe(key)
    const stripe = await _stripePromise

    if (!stripe) {
      console.error('[Stripe] Instância null após loadStripe.')
      return
    }

    const { error } = await stripe.redirectToCheckout({
      lineItems:     [{ price: priceId, quantity: 1 }],
      mode:          'subscription',
      successUrl:    `${BASE_URL}/payment-success`,
      cancelUrl:     `${BASE_URL}/upgrade`,
      customerEmail: email || undefined,
    })

    if (error) console.error('[Stripe] redirectToCheckout retornou erro:', error)
  } catch (err) {
    console.error('[Stripe] Exceção capturada no checkout:', err)
  }
}
