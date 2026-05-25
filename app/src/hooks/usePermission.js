import { useStore } from './useStore'

export function usePermission(module) {
  const { activeCollaborator, collaborators } = useStore()
  if (!activeCollaborator) return { canView: true, canEdit: true }
  const collab = collaborators.find(c => String(c.id) === String(activeCollaborator))
  if (!collab) return { canView: true, canEdit: true }
  const perm = collab.permissions?.[module] ?? 'edit'
  return { canView: perm !== 'hidden', canEdit: perm === 'edit' }
}
