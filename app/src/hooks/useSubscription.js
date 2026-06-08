import { useBand } from '@/hooks/useBand.jsx'

export function useSubscription() {
  const { activeBand } = useBand()
  const now = new Date()

  const trialEndsAt        = activeBand?.trial_ends_at ? new Date(activeBand.trial_ends_at) : null
  const subscriptionStatus = activeBand?.subscription_status ?? null
  const isLifetime         = activeBand?.is_lifetime ?? false

  // canceling = acesso mantido até fim do período pago → tratado como ativo
  const isActive   = subscriptionStatus === 'active' || subscriptionStatus === 'canceling' || isLifetime
  const isTrialing = !isActive && trialEndsAt !== null && trialEndsAt > now

  // Bloqueio apenas quando status === 'canceled' explicitamente,
  // OU quando trial expirou e status não é 'active' nem 'canceling'
  const isExpired =
    subscriptionStatus === 'canceled' ||
    (!isLifetime &&
     subscriptionStatus !== 'active' &&
     subscriptionStatus !== 'canceling' &&
     trialEndsAt !== null &&
     trialEndsAt <= now)

  const daysLeftInTrial = isTrialing
    ? Math.max(0, Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24)))
    : 0
  const isBetaUser = isLifetime

  return { isTrialing, isActive, isExpired, daysLeftInTrial, isBetaUser }
}
