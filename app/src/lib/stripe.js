import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

export const PRICE_PROFISSIONAL = 'price_1TdWuj4W1YK1eZ3Zq2xPtq5D'
export const PRICE_MULTI_BANDAS = 'price_1TdWvC4W1YK1eZ3Zf9mscavA'

const BASE_URL = 'https://akro1.vercel.app'

export async function initiateCheckout(priceId, email) {
  let stripe
  try {
    stripe = await stripePromise
  } catch (err) {
    console.error('[Stripe] Falha ao carregar o SDK:', err)
    return
  }

  if (!stripe) {
    console.error(
      '[Stripe] Inicialização falhou. Verifique se VITE_STRIPE_PUBLISHABLE_KEY está definida corretamente no ambiente.',
      { key: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ? 'presente' : 'AUSENTE/UNDEFINED' }
    )
    return
  }

  try {
    const { error } = await stripe.redirectToCheckout({
      lineItems:     [{ price: priceId, quantity: 1 }],
      mode:          'subscription',
      successUrl:    `${BASE_URL}/payment-success`,
      cancelUrl:     `${BASE_URL}/upgrade`,
      customerEmail: email || undefined,
    })

    if (error) {
      console.error('[Stripe] redirectToCheckout retornou erro:', error)
    }
  } catch (err) {
    console.error('[Stripe] Exceção inesperada em redirectToCheckout:', err)
  }
}
