import { useState, useRef, useCallback } from 'react'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

export function useUnsavedGuard(isDirty) {
  const [open, setOpen] = useState(false)
  const pendingRef = useRef(null)

  const guard = useCallback((onClose) => {
    if (isDirty) {
      pendingRef.current = onClose
      setOpen(true)
    } else {
      onClose()
    }
  }, [isDirty])

  const handleDiscard = useCallback(() => {
    setOpen(false)
    pendingRef.current?.()
    pendingRef.current = null
  }, [])

  const UnsavedDialog = (
    <ConfirmDialog
      open={open}
      onOpenChange={(v) => { if (!v) setOpen(false) }}
      title="Alterações não salvas"
      description="Existem alterações que ainda não foram salvas. Se você sair agora, todo o progresso desta edição será perdido."
      confirmLabel="Descartar e sair"
      cancelLabel="Continuar editando"
      onConfirm={handleDiscard}
    />
  )

  return { guard, UnsavedDialog }
}
