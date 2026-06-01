import { useBand } from '@/hooks/useBand.jsx'

export function useSubscription() {
  const { activeBand } = useBand()
  const now = new Date()

  const trialEndsAt     = activeBand?.trial_ends_at ? new Date(activeBand.trial_ends_at) : null
  const subscriptionStatus = activeBand?.subscription_status ?? null
  const isLifetime      = activeBand?.is_lifetime ?? false

  const isActive   = subscriptionStatus === 'active' || isLifetime
  const isTrialing = !isActive && trialEndsAt !== null && trialEndsAt > now
  const isExpired  = !isActive && !isTrialing && (trialEndsAt !== null && trialEndsAt <= now)
  const daysLeftInTrial = isTrialing
    ? Math.max(0, Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24)))
    : 0
  const isBetaUser = isLifetime

  return { isTrialing, isActive, isExpired, daysLeftInTrial, isBetaUser }
}
