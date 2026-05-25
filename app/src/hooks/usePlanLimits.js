import { useBand } from '@/hooks/useBand.jsx'

const MULTI_LIMITS = {
  maxMembers: Infinity,
  maxCollaborators: Infinity,
  maxBands: 5,
  hasChecklist: true,
  hasOrcamentos: true,
  hasEquipamentos: true,
  hasEnsaios: true,
  hasAllReports: true,
  hasColaboradores: true,
}

const PLAN_LIMITS = {
  solo: {
    maxMembers: 8,
    maxCollaborators: 0,
    maxBands: 1,
    hasChecklist: false,
    hasOrcamentos: false,
    hasEquipamentos: false,
    hasEnsaios: false,
    hasAllReports: false,
    hasColaboradores: false,
  },
  profissional: {
    maxMembers: 25,
    maxCollaborators: Infinity,
    maxBands: 1,
    hasChecklist: true,
    hasOrcamentos: true,
    hasEquipamentos: true,
    hasEnsaios: true,
    hasAllReports: true,
    hasColaboradores: true,
  },
  multi_bandas:  MULTI_LIMITS,
  grande_banda:  MULTI_LIMITS, // legacy alias — bands created before the rename migration
}

const LOADING_LIMITS = {
  maxMembers: 0, maxCollaborators: 0, maxBands: 1,
  hasChecklist: false, hasOrcamentos: false, hasEquipamentos: false,
  hasEnsaios: false, hasAllReports: false, hasColaboradores: false,
}

export function usePlanLimits() {
  const { activeBand } = useBand()

  if (!activeBand) {
    return {
      limits: LOADING_LIMITS,
      plan: 'solo',
      canAddMember: () => false,
      canAddCollaborator: () => false,
      isFeatureAvailable: () => false,
    }
  }

  const plan = activeBand.plan || 'solo'
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.solo

  const canAddMember = (currentCount) => currentCount < limits.maxMembers
  const canAddCollaborator = (currentCount) => currentCount < limits.maxCollaborators
  const isFeatureAvailable = (feature) => !!limits[feature]

  return { limits, plan, canAddMember, canAddCollaborator, isFeatureAvailable }
}
