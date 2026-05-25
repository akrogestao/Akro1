import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, Calendar, Clock, MapPin, Music,
  Check, X, ChevronDown, ChevronUp, Edit2, UserCheck,
  Trophy, Activity, Users, Lock, FileDown,
} from 'lucide-react'
import DatePicker from '@/components/shared/DatePicker'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useStore } from '@/hooks/useStore'
import { usePlanLimits } from '@/hooks/usePlanLimits'
import UpgradeModal from '@/components/shared/UpgradeModal'
import { generateRehearsalPdf } from '@/lib/pdfGenerator'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ── Helpers ───────────────────────────────────────────────────────────

function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.toLocaleDateString('pt-BR', { weekday: 'long' })
  return {
    day: day.charAt(0).toUpperCase() + day.slice(1),
    date: d.toLocaleDateString('pt-BR'),
    dayNum: d.getDate(),
    mon: d.toLocaleDateString('pt-BR', { month: 'short' }),
  }
}

function isPastRehearsal(r) {
  if (!r.date) return false
  return new Date(r.date + 'T' + (r.time || '23:59') + ':00') < new Date()
}

function joinPortuguese(arr) {
  if (arr.length === 0) return ''
  if (arr.length === 1) return arr[0]
  return arr.slice(0, -1).join(', ') + ' e ' + arr[arr.length - 1]
}

// ── Small shared components ───────────────────────────────────────────

function MemberStack({ memberObjects, limit = 3 }) {
  const shown = memberObjects.slice(0, limit)
  const rest = memberObjects.length - limit
  return (
    <div className="flex -space-x-1.5 items-center">
      {shown.map(m => (
        <div
          key={m.id}
          title={m.name}
          style={{ backgroundColor: m.color }}
          className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center text-[9px] font-bold text-white shrink-0"
        >
          {m.init}
        </div>
      ))}
      {rest > 0 && (
        <div className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-[9px] font-semibold text-slate-600 dark:text-slate-300">
          +{rest}
        </div>
      )}
    </div>
  )
}

function KpiCard({ label, value, sub, icon: Icon, valueClass }) {
  return (
    <Card className="rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
          <p className={cn('text-2xl font-bold mt-0.5 truncate', valueClass || 'text-slate-900 dark:text-slate-100')}>{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>}
        </div>
        <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-900/30 border border-orange-100 dark:border-orange-800/40 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-orange-500" />
        </div>
      </div>
    </Card>
  )
}

// ── Rehearsal create/edit dialog ──────────────────────────────────────

function RehearsalDialog({ open, onOpenChange, initial, members, songs }) {
  const { addRehearsal, updateRehearsal } = useStore()
  const [songSearch, setSongSearch] = useState('')
  const [form, setForm] = useState({
    date: '', time: '', address: '', expectedMembers: [], songs: [], notes: '',
  })

  useEffect(() => {
    if (!open) return
    setSongSearch('')
    setForm(initial
      ? {
          date: initial.date || '',
          time: initial.time || '',
          address: initial.address || initial.location || '',
          expectedMembers: initial.expectedMembers || [],
          songs: initial.songs || [],
          notes: initial.notes || '',
        }
      : { date: '', time: '', address: '', expectedMembers: [], songs: [], notes: '' }
    )
  }, [open, initial])

  const toggleMember = (id) => setForm(p => ({
    ...p,
    expectedMembers: p.expectedMembers.includes(id)
      ? p.expectedMembers.filter(x => x !== id)
      : [...p.expectedMembers, id],
  }))

  const toggleSong = (id) => setForm(p => ({
    ...p,
    songs: p.songs.includes(id) ? p.songs.filter(x => x !== id) : [...p.songs, id],
  }))

  const filteredSongs = useMemo(() =>
    songs.filter(s =>
      !songSearch ||
      s.title?.toLowerCase().includes(songSearch.toLowerCase()) ||
      s.artist?.toLowerCase().includes(songSearch.toLowerCase())
    ), [songs, songSearch])

  const handleSave = () => {
    if (!form.date)          { toast.error('Selecione uma data'); return }
    if (!form.time)          { toast.error('Informe o horário'); return }
    if (!form.address.trim()) { toast.error('Informe o endereço'); return }
    if (initial) {
      updateRehearsal(initial.id, form)
      toast.success('Ensaio atualizado!')
    } else {
      addRehearsal({ ...form })
      toast.success('Ensaio criado!')
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <div className="flex flex-col max-h-[88vh]">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 shrink-0 pr-14">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {initial ? 'Editar ensaio' : 'Novo ensaio'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Preencha os dados do ensaio</p>
          </div>

          {/* Date + Time — outside the scroll container so the calendar dropdown overlays freely */}
          <div className="px-6 pb-2 shrink-0">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data *</Label>
                <DatePicker
                  value={form.date}
                  onChange={(v) => setForm(p => ({ ...p, date: v }))}
                  placeholder="Selecione a data..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Horário *</Label>
                <Input
                  type="text"
                  placeholder="19:00"
                  maxLength={5}
                  value={form.time}
                  onChange={e => {
                    let v = e.target.value.replace(/\D/g, '').slice(0, 4)
                    if (v.length > 2) v = v.slice(0, 2) + ':' + v.slice(2)
                    setForm(p => ({ ...p, time: v }))
                  }}
                />
              </div>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="px-6 flex-1 overflow-y-auto overflow-x-hidden space-y-5 pb-2">
            {/* Address */}
            <div className="space-y-1.5">
              <Label>Endereço *</Label>
              <Input
                placeholder="Rua, número, bairro, cidade"
                value={form.address}
                onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
              />
            </div>

            {/* Members */}
            <div className="space-y-2">
              <Label>Membros convocados</Label>
              {members.length === 0 ? (
                <p className="text-xs text-slate-400 p-3">Nenhum membro cadastrado</p>
              ) : (
                <div className="max-h-[22vh] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                  {members.map(m => {
                    const checked = form.expectedMembers.includes(m.id)
                    return (
                      <label
                        key={m.id}
                        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleMember(m.id)}
                          className="w-4 h-4 rounded accent-orange-500 shrink-0"
                        />
                        <div
                          style={{ backgroundColor: m.color }}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                        >
                          {m.init}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{m.name}</p>
                          <p className="text-xs text-slate-400 truncate">{m.role}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Songs */}
            <div className="space-y-2">
              <Label>Músicas a preparar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="Buscar música..."
                  value={songSearch}
                  onChange={e => setSongSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
              {songs.length === 0 ? (
                <p className="text-xs text-slate-400 p-3">Nenhuma música no repertório</p>
              ) : (
                <div className="max-h-[18vh] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                  {filteredSongs.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">Nenhuma música encontrada</p>
                  ) : filteredSongs.map(s => {
                    const checked = form.songs.includes(s.id)
                    return (
                      <label
                        key={s.id}
                        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSong(s.id)}
                          className="w-4 h-4 rounded accent-orange-500 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{s.title}</p>
                          <p className="text-xs text-slate-400 truncate">{s.artist || '—'}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <textarea
                rows={2}
                placeholder="Informações adicionais..."
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 resize-none outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 transition-all"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSave}>Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Attendance registration dialog ────────────────────────────────────

function AttendanceDialog({ open, onOpenChange, rehearsal, members }) {
  const { registerAttendance } = useStore()
  const [present, setPresent] = useState([])

  useEffect(() => {
    if (open && rehearsal) setPresent([...(rehearsal.expectedMembers || [])])
  }, [open, rehearsal])

  const convocated = useMemo(() =>
    members.filter(m => (rehearsal?.expectedMembers || []).includes(m.id)),
    [members, rehearsal]
  )

  const toggle = (id) => setPresent(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  const handleConfirm = () => {
    registerAttendance(rehearsal.id, present)
    toast.success(`Presença registrada — ${present.length} de ${convocated.length} presentes`)
    onOpenChange(false)
  }

  if (!rehearsal) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <div className="px-6 pt-6 pb-4 space-y-5 pr-14">
          {/* Header */}
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Registrar presença</h2>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {rehearsal.address || rehearsal.location} — {rehearsal.date}
            </p>
          </div>

          {/* Member toggles */}
          <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
            {convocated.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Nenhum membro convocado</p>
            ) : convocated.map(m => {
              const isPresent = present.includes(m.id)
              return (
                <div
                  key={m.id}
                  onClick={() => toggle(m.id)}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors select-none',
                    isPresent
                      ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20'
                      : 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20'
                  )}
                >
                  <div
                    style={{ backgroundColor: m.color }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  >
                    {m.init}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{m.name}</p>
                    <p className="text-xs text-slate-500 truncate">{m.role}</p>
                  </div>
                  <div className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
                    isPresent ? 'bg-emerald-500' : 'bg-red-500'
                  )}>
                    {isPresent
                      ? <Check className="w-3.5 h-3.5 text-white" />
                      : <X className="w-3.5 h-3.5 text-white" />
                    }
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-bold text-emerald-600">{present.length}</span>
              <span className="text-slate-400"> / {convocated.length} presentes</span>
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleConfirm}>Confirmar presença</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Rehearsal card ────────────────────────────────────────────────────

function RehearsalCard({ rehearsal, members, onEdit, onAttendance, onExport }) {
  const convocated = members.filter(m => rehearsal.expectedMembers?.includes(m.id))
  const songCount  = rehearsal.songs?.length || 0
  const isRealizado = rehearsal.status === 'Realizado'
  const pct = isRealizado && convocated.length > 0
    ? Math.round((rehearsal.attendedMembers?.length || 0) / convocated.length * 100)
    : null
  const { day, date, dayNum, mon } = fmtDate(rehearsal.date)

  return (
    <Card className="rounded-2xl p-4">
      <div className="flex gap-3 sm:gap-4">
        {/* Date tile */}
        <div className="flex flex-col items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/30 shrink-0">
          <span className="text-base sm:text-lg font-bold text-orange-600 leading-none">{dayNum}</span>
          <span className="text-[9px] sm:text-[10px] text-orange-500 uppercase tracking-wide">{mon}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{day}</p>
              <p className="text-xs text-slate-500">{date}</p>
            </div>
            {isRealizado && pct !== null && (
              <Badge variant="success" className="shrink-0 text-[11px]">{pct}% presença</Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1 shrink-0">
              <Clock className="w-3 h-3" />
              {rehearsal.time}
            </span>
            <span className="flex items-center gap-1 min-w-0">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{rehearsal.address || rehearsal.location}</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
            <div className="flex items-center gap-3">
              {convocated.length > 0
                ? <MemberStack memberObjects={convocated} />
                : <span className="text-xs text-slate-400 flex items-center gap-1"><Users className="w-3 h-3" /> Sem membros</span>
              }
              {songCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Music className="w-3 h-3" />
                  {songCount} {songCount === 1 ? 'música' : 'músicas'}
                </span>
              )}
            </div>
            <div className="flex gap-1.5 shrink-0">
              {!isRealizado && (
                <Button size="sm" onClick={onAttendance} className="text-xs h-7 px-2.5 gap-1">
                  <UserCheck className="w-3.5 h-3.5" /> Registrar presença
                </Button>
              )}
              <Button variant="outline" size="icon-sm" onClick={onExport} title="Exportar PDF">
                <FileDown className="w-3.5 h-3.5" />
              </Button>
              <Button variant="outline" size="icon-sm" onClick={onEdit} title="Editar registro">
                <Edit2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────

function RehearsalsSkeleton() {
  return (
    <div className="space-y-6">
      <div><Skeleton className="h-7 w-40 mb-2" /><Skeleton className="h-4 w-64" /></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="flex gap-2"><Skeleton className="h-9 flex-1" /><Skeleton className="h-9 w-24" /><Skeleton className="h-9 w-28" /></div>
      <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────

export default function Rehearsals({ isLoading, onNav }) {
  const { rehearsals, members, songs, companyProfile } = useStore()
  const { isFeatureAvailable, plan } = usePlanLimits()
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  const [searchTerm,     setSearchTerm]     = useState('')
  const [statusFilter,   setStatusFilter]   = useState('Todos')
  const [dialogOpen,     setDialogOpen]     = useState(false)
  const [editRehearsal,  setEditRehearsal]  = useState(null)
  const [attendanceDlg,  setAttendanceDlg]  = useState(null)
  const [realizadosOpen, setRealizadosOpen] = useState(false)

  // ── Derived data ──────────────────────────────────────────

  const completedAll = useMemo(() => rehearsals.filter(r => r.status === 'Realizado'), [rehearsals])

  const filtered = useMemo(() =>
    rehearsals
      .filter(r => statusFilter === 'Todos' || r.status === statusFilter)
      .filter(r => !searchTerm || (r.address || r.location || '').toLowerCase().includes(searchTerm.toLowerCase())),
    [rehearsals, statusFilter, searchTerm]
  )

  // Upcoming: scheduled AND not yet past
  const upcoming = useMemo(() =>
    filtered
      .filter(r => r.status === 'Agendado' && !isPastRehearsal(r))
      .sort((a, b) => a.date.localeCompare(b.date)),
    [filtered]
  )

  // Completed: registered as Realizado OR scheduled but datetime already passed
  const completed = useMemo(() =>
    filtered
      .filter(r => r.status === 'Realizado' || (r.status === 'Agendado' && isPastRehearsal(r)))
      .sort((a, b) => {
        const aD = a.date + 'T' + (a.time || '00:00')
        const bD = b.date + 'T' + (b.time || '00:00')
        return bD.localeCompare(aD)
      }),
    [filtered]
  )

  // ── KPIs ──────────────────────────────────────────────────

  const avgPresence = useMemo(() => {
    if (!completedAll.length) return 0
    const sum = completedAll.reduce((s, r) => {
      const exp = r.expectedMembers?.length || 0
      const att = r.attendedMembers?.length || 0
      return s + (exp > 0 ? att / exp : 0)
    }, 0)
    return Math.round(sum / completedAll.length * 100)
  }, [completedAll])

  const topSongByCount = useMemo(() =>
    [...songs].filter(s => (s.rehearsalCount ?? 0) > 0)
      .sort((a, b) => (b.rehearsalCount ?? 0) - (a.rehearsalCount ?? 0))[0],
    [songs]
  )

  const memberAttendanceStats = useMemo(() => {
    if (!completedAll.length) return []
    const attended = {}
    completedAll.forEach(r => {
      ;(r.attendedMembers || []).forEach(id => {
        const key = String(id)
        attended[key] = (attended[key] || 0) + 1
      })
    })
    return Object.entries(attended)
      .map(([id, count]) => ({
        member: members.find(m => String(m.id) === id),
        expected: completedAll.length,
        attended: count,
        pct: Math.round((count / completedAll.length) * 100),
      }))
      .filter(s => s.member)
      .sort((a, b) => b.pct - a.pct)
  }, [completedAll, members])

  // Top members — collect all tied at the highest pct
  const topPct     = memberAttendanceStats[0]?.pct ?? 0
  const topMembers = topPct > 0 ? memberAttendanceStats.filter(s => s.pct === topPct) : []
  const topMemberName = joinPortuguese(topMembers.map(s => s.member.name))

  // ── Handlers ──────────────────────────────────────────────

  const openCreate = () => { setEditRehearsal(null); setDialogOpen(true) }
  const openEdit   = (r) => { setEditRehearsal(r);  setDialogOpen(true) }

  const handleExportPdf = async (r) => {
    try {
      await generateRehearsalPdf({ rehearsal: r, members, songs, companyProfile })
    } catch {
      toast.error('Erro ao gerar PDF')
    }
  }

  if (isLoading) return <RehearsalsSkeleton />

  if (!isFeatureAvailable('hasEnsaios')) {
    return (
      <div className="space-y-5 animate-slide-up">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Ensaios</h1>
          <p className="text-sm text-slate-500 mt-0.5">Organize e acompanhe a frequência nos ensaios</p>
        </div>
        <div className="flex flex-col items-center justify-center py-32 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
          <Lock className="w-12 h-12 text-slate-300 mb-4" />
          <p className="text-sm font-medium text-slate-500">Disponível nos planos Profissional e Multi-bandas</p>
          <button
            onClick={() => setUpgradeOpen(true)}
            className="mt-4 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors"
          >
            Ver planos de upgrade
          </button>
        </div>
        <UpgradeModal
          isOpen={upgradeOpen}
          onClose={() => setUpgradeOpen(false)}
          feature="Gestão de ensaios"
          currentPlan={plan}
          onNav={onNav}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-slide-up">

      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Ensaios</h1>
        <p className="text-sm text-slate-500 mt-0.5">Organize e acompanhe a frequência nos ensaios</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Ensaios realizados"
          value={completedAll.length}
          icon={Activity}
        />
        <KpiCard
          label="Média de presença"
          value={completedAll.length ? `${avgPresence}%` : '—'}
          icon={Users}
          valueClass={
            completedAll.length
              ? avgPresence >= 80 ? 'text-emerald-600'
              : avgPresence >= 60 ? 'text-amber-500'
              : 'text-red-500'
              : 'text-slate-900 dark:text-slate-100'
          }
        />
        <KpiCard
          label="Mais ensaiada"
          value={topSongByCount ? `${topSongByCount.rehearsalCount}×` : '—'}
          sub={topSongByCount?.title}
          icon={Music}
        />
        <KpiCard
          label="Mais assíduo"
          value={topMembers.length > 0 ? `${topPct}%` : '—'}
          sub={topMemberName || undefined}
          icon={Trophy}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-44">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Buscar por endereço..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {['Todos', 'Agendado', 'Realizado'].map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                statusFilter === f
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <Button size="sm" className="gap-1.5 shrink-0" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Novo ensaio
        </Button>
      </div>

      {/* Upcoming rehearsals */}
      <div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
          Próximos ensaios
          {upcoming.length > 0 && (
            <span className="ml-2 text-xs text-slate-400 font-normal">({upcoming.length})</span>
          )}
        </p>
        {upcoming.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-10 text-center">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Nenhum ensaio agendado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map(r => (
              <RehearsalCard
                key={r.id}
                rehearsal={r}
                members={members}
                onEdit={() => openEdit(r)}
                onAttendance={() => setAttendanceDlg(r)}
                onExport={() => handleExportPdf(r)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Completed rehearsals — collapsible */}
      <div>
        <button
          onClick={() => setRealizadosOpen(p => !p)}
          className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 w-full text-left"
        >
          <span>Ensaios realizados</span>
          {completed.length > 0 && (
            <span className="text-xs text-slate-400 font-normal">({completed.length})</span>
          )}
          <span className="ml-auto text-slate-400">
            {realizadosOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>
        <AnimatePresence initial={false}>
          {realizadosOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              style={{ overflow: 'hidden' }}
            >
              {completed.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-10 text-center">
                  <p className="text-sm text-slate-400">Nenhum ensaio realizado ainda</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {completed.map(r => (
                    <RehearsalCard
                      key={r.id}
                      rehearsal={r}
                      members={members}
                      onEdit={() => openEdit(r)}
                      onAttendance={() => setAttendanceDlg(r)}
                      onExport={() => handleExportPdf(r)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Dialogs */}
      <RehearsalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editRehearsal}
        members={members}
        songs={songs}
      />
      <AttendanceDialog
        open={!!attendanceDlg}
        onOpenChange={(v) => { if (!v) setAttendanceDlg(null) }}
        rehearsal={attendanceDlg}
        members={members}
      />
    </div>
  )
}
