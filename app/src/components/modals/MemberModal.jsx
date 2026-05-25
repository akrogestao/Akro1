import { useState, useEffect, useRef, useMemo } from 'react'
import { useUnsavedGuard } from '@/hooks/useUnsavedGuard'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import UpgradeModal from '@/components/shared/UpgradeModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import CurrencyInput from '@/components/shared/CurrencyInput'
import { useStore } from '@/hooks/useStore'
import { usePlanLimits } from '@/hooks/usePlanLimits'

const BLANK = { name: '', role: '', cache: 0, cpf: '' }

export default function MemberModal({ open, onOpenChange, editId }) {
  const { members, addMember, updateMember, deleteMember } = useStore()
  const { canAddMember, plan } = usePlanLimits()
  const [form, setForm] = useState(BLANK)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const initialRef = useRef(BLANK)

  useEffect(() => {
    if (!open) return
    if (editId) {
      const m = members.find((x) => x.id === editId)
      const state = m ? { name: m.name, role: m.role, cache: m.cache, cpf: m.cpf || '' } : BLANK
      setForm(state)
      initialRef.current = state
    } else {
      setForm(BLANK)
      initialRef.current = BLANK
    }
  }, [open, editId, members])

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialRef.current),
    [form]
  )
  const { guard, UnsavedDialog } = useUnsavedGuard(isDirty)
  const handleClose = () => guard(() => onOpenChange(false))

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const handleSave = () => {
    if (!form.name.trim() || !form.role.trim()) {
      toast.error('Preencha nome e cargo (*)'); return
    }
    if (!editId && !canAddMember(members.length)) {
      onOpenChange(false)
      setUpgradeOpen(true)
      return
    }
    if (editId) { updateMember(editId, form); toast.success('Membro atualizado!') }
    else        { addMember(form);            toast.success('Membro adicionado!') }
    onOpenChange(false)
  }

  const handleDelete = () => setDeleteConfirm(true)

  const doDelete = () => {
    deleteMember(editId)
    toast.success('Membro excluído.')
    onOpenChange(false)
  }

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => { if (v) onOpenChange(v); else handleClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{editId ? 'Editar Membro' : 'Adicionar Membro'}</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-2 space-y-4">
          <div className="space-y-1.5">
            <Label className="pb-2 block">Nome *</Label>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Nome completo" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label className="pb-2 block">Cargo / Instrumento *</Label>
            <Input value={form.role} onChange={(e) => set('role', e.target.value)} placeholder="Ex: Vocalista, Guitarrista" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="pb-2 block">Cachê Base</Label>
              <CurrencyInput value={form.cache} onChange={(v) => set('cache', v)} />
            </div>
            <div className="space-y-1.5">
              <Label className="pb-2 block">CPF</Label>
              <Input
                value={form.cpf}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '').slice(0, 11)
                  const fmt = raw.length <= 3 ? raw
                    : raw.length <= 6 ? `${raw.slice(0,3)}.${raw.slice(3)}`
                    : raw.length <= 9 ? `${raw.slice(0,3)}.${raw.slice(3,6)}.${raw.slice(6)}`
                    : `${raw.slice(0,3)}.${raw.slice(3,6)}.${raw.slice(6,9)}-${raw.slice(9)}`
                  set('cpf', fmt)
                }}
                placeholder="000.000.000-00"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          {editId && (
            <Button variant="destructive" onClick={handleDelete} className="mr-auto gap-1.5 h-10 px-4">
              <Trash2 className="w-3.5 h-3.5" /> Excluir
            </Button>
          )}
          <Button variant="outline" className="h-10 px-4" onClick={handleClose}>Cancelar</Button>
          <Button className="h-10 px-4" onClick={handleSave}>Salvar Membro</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <ConfirmDialog
      open={deleteConfirm}
      onOpenChange={setDeleteConfirm}
      title="Excluir este membro?"
      description="Ele será removido de todos os eventos. Esta ação não pode ser desfeita."
      confirmLabel="Excluir"
      onConfirm={doDelete}
    />
    <UpgradeModal
      isOpen={upgradeOpen}
      onClose={() => setUpgradeOpen(false)}
      feature="Adicionar mais membros ao seu elenco"
      currentPlan={plan}
    />
    {UnsavedDialog}
    </>
  )
}
