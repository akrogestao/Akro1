import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

export const PRICE_PROFISSIONAL = 'price_1TdWuj4W1YK1eZ3Zq2xPtq5D'
export const PRICE_MULTI_BANDAS = 'price_1TdWvC4W1YK1eZ3Zf9mscavA'

export async function initiateCheckout(priceId, email) {
  const stripe = await stripePromise
  if (!stripe) return

  const { error } = await stripe.redirectToCheckout({
    lineItems:     [{ price: priceId, quantity: 1 }],
    mode:          'subscription',
    successUrl:    `${window.location.origin}/payment-success`,
    cancelUrl:     `${window.location.origin}/upgrade`,
    customerEmail: email || undefined,
  })

  if (error) console.error('[Stripe] redirectToCheckout error:', error)
}
