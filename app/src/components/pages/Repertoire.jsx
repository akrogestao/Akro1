import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  Music, Plus, Search, X, Pencil, Trash2, GripVertical,
  Mic2, Clock, ExternalLink, Download, List, BarChart2, Tag, CheckCircle2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { useStore } from '@/hooks/useStore'
import { fmtDate } from '@/lib/format'
import { cn } from '@/lib/utils'

// ── Constants ─────────────────────────────────────────────
const KEY_OPTIONS = [
  'Dó maior', 'Ré maior', 'Mi maior', 'Fá maior', 'Sol maior', 'Lá maior', 'Si maior',
  'Dó menor', 'Ré menor', 'Mi menor', 'Fá menor', 'Sol menor', 'Lá menor', 'Si menor',
  'Dó# maior', 'Ré# maior', 'Fá# maior', 'Sol# maior', 'Lá# maior',
  'Dó# menor', 'Ré# menor', 'Fá# menor', 'Sol# menor', 'Lá# menor',
  'Personalizado',
]

const TAG_PALETTE = [
  'bg-orange-100 text-orange-700 border-orange-200',
  'bg-blue-100 text-blue-700 border-blue-200',
  'bg-emerald-100 text-emerald-700 border-emerald-200',
  'bg-purple-100 text-purple-700 border-purple-200',
  'bg-amber-100 text-amber-700 border-amber-200',
  'bg-pink-100 text-pink-700 border-pink-200',
  'bg-indigo-100 text-indigo-700 border-indigo-200',
  'bg-teal-100 text-teal-700 border-teal-200',
  'bg-rose-100 text-rose-700 border-rose-200',
  'bg-cyan-100 text-cyan-700 border-cyan-200',
]

// ── Utilities ─────────────────────────────────────────────
function tagColor(tag) {
  let h = 0
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) & 0xffff
  return TAG_PALETTE[h % TAG_PALETTE.length]
}

function parseDuration(str) {
  if (!str) return 0
  const [m, s] = str.split(':').map(Number)
  return (m || 0) * 60 + (s || 0)
}

function fmtTotalDuration(sec) {
  const m = Math.floor(sec / 60), s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// ── PDF generation ────────────────────────────────────────
async function generateSetlistPdf({ setlist, songMap, event, companyProfile }) {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210, H = 297
  const BG = [8, 9, 9], ORANGE = [249, 115, 22]
  const LIGHT = [248, 250, 252]

  // Dark header
  doc.setFillColor(...BG)
  doc.rect(0, 0, W, 28, 'F')

  // Logo triangle
  doc.setFillColor(...ORANGE)
  doc.lines([[6, 14], [-12, 0]], 15, 6, [1, 1], 'F', true)

  // Brand text
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...ORANGE)
  doc.text('KRO', 23, 14)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(120, 120, 120)
  doc.text('GESTÃO MUSICAL', 23, 19)

  // Document title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(255, 255, 255)
  doc.text('SETLIST', W - 12, 13, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(160, 160, 160)
  doc.text(setlist.name, W - 12, 20, { align: 'right' })

  // Accent line
  doc.setFillColor(...ORANGE)
  doc.rect(0, 28, W, 1.5, 'F')

  let y = 36

  // Event info block
  if (event) {
    doc.setFillColor(...LIGHT)
    doc.roundedRect(10, y, W - 20, 20, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(30, 30, 30)
    doc.text(event.name, 16, y + 7)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    const d = new Date(event.date + 'T12:00:00')
    doc.text(
      d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }),
      16, y + 14,
    )
    if (event.local) doc.text(event.local, W - 16, y + 14, { align: 'right' })
    y += 28
  }

  // Setlist name header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...ORANGE)
  doc.text(setlist.name.toUpperCase(), 10, y)
  doc.setFillColor(...ORANGE)
  doc.rect(10, y + 2, W - 20, 0.5, 'F')
  y += 10

  // Song table
  const rows = setlist.songs
    .map((id, i) => {
      const s = songMap[id]
      if (!s) return null
      return [String(i + 1).padStart(2, '0'), s.title, s.artist || '—', s.key || '—', s.duration || '—']
    })
    .filter(Boolean)

  autoTable(doc, {
    startY: y,
    margin: { left: 10, right: 10 },
    head: [['#', 'Título', 'Artista', 'Tom', 'Duração']],
    body: rows,
    headStyles: { fillColor: BG, textColor: ORANGE, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [50, 50, 50] },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', textColor: [180, 180, 180] },
      1: { fontStyle: 'bold' },
      2: { cellWidth: 52 },
      3: { cellWidth: 24, halign: 'center' },
      4: { cellWidth: 20, halign: 'center' },
    },
    styles: { lineColor: [225, 225, 230], lineWidth: 0.2 },
  })

  // Total duration
  const totalSec = setlist.songs.reduce((sum, id) => sum + parseDuration(songMap[id]?.duration), 0)
  if (totalSec > 0) {
    const fy = doc.lastAutoTable.finalY + 5
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...ORANGE)
    doc.text(`DURAÇÃO TOTAL: ${fmtTotalDuration(totalSec)}`, W - 10, fy, { align: 'right' })
  }

  // Footer on all pages
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setFillColor(...BG)
    doc.rect(0, H - 16, W, 16, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...ORANGE)
    if (companyProfile?.companyName) doc.text(companyProfile.companyName, 10, H - 8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120, 120, 120)
    doc.text('Gerado por Akro Gestão Musical', W / 2, H - 8, { align: 'center' })
    doc.text(`${p} / ${pages}`, W - 10, H - 8, { align: 'right' })
  }

  doc.save(`setlist-${(setlist.name || 'setlist').replace(/\s+/g, '-').toLowerCase()}.pdf`)
}

// ── TagPill ───────────────────────────────────────────────
function TagPill({ tag, removable, onRemove }) {
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', tagColor(tag))}>
      {tag}
      {removable && (
        <button type="button" onClick={onRemove} className="leading-none opacity-60 hover:opacity-100">
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  )
}

// ── SongDialog ────────────────────────────────────────────
const BLANK_FORM = { title: '', artist: '', key: '', customKey: '', bpm: '', duration: '', tags: [], youtubeUrl: '', notes: '' }

function SongDialog({ open, onOpenChange, editSong, onSave, onDelete }) {
  const [form, setForm] = useState(BLANK_FORM)
  const [tagInput, setTagInput] = useState('')
  const [delConfirm, setDelConfirm] = useState(false)

  useEffect(() => {
    if (!open) { setTagInput(''); return }
    if (editSong) {
      const knownKeys = KEY_OPTIONS.slice(0, -1)
      const isCustom = editSong.key && !knownKeys.includes(editSong.key)
      setForm({
        title: editSong.title || '',
        artist: editSong.artist || '',
        key: isCustom ? 'Personalizado' : (editSong.key || ''),
        customKey: isCustom ? (editSong.key || '') : '',
        bpm: editSong.bpm || '',
        duration: editSong.duration || '',
        tags: editSong.tags || [],
        youtubeUrl: editSong.youtubeUrl || '',
        notes: editSong.notes || '',
      })
    } else {
      setForm(BLANK_FORM)
    }
  }, [open, editSong])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !form.tags.includes(tag)) setForm(p => ({ ...p, tags: [...p.tags, tag] }))
    setTagInput('')
  }

  const handleSave = () => {
    if (!form.title.trim()) { toast.error('O título é obrigatório'); return }
    const finalKey = form.key === 'Personalizado' ? form.customKey : form.key
    onSave({
      title: form.title.trim(),
      artist: form.artist.trim(),
      key: finalKey || null,
      bpm: form.bpm ? Number(form.bpm) : null,
      duration: form.duration.trim() || null,
      tags: form.tags,
      youtubeUrl: form.youtubeUrl.trim() || null,
      notes: form.notes.trim() || null,
    })
    onOpenChange(false)
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-y-visible">
        <DialogHeader>
          <DialogTitle>{editSong ? 'Editar Música' : 'Adicionar Música'}</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-2 space-y-4 max-h-[calc(85vh-180px)] overflow-y-auto">
          <div className="space-y-1.5">
            <Label className="pb-2 block">Título *</Label>
            <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Nome da música" autoFocus />
          </div>

          <div className="space-y-1.5">
            <Label className="pb-2 block">Artista / Compositor</Label>
            <Input value={form.artist} onChange={e => set('artist', e.target.value)} placeholder="Nome do artista" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="pb-2 block">Tom</Label>
              <Select value={form.key} onValueChange={v => set('key', v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {KEY_OPTIONS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="pb-2 block">BPM</Label>
              <Input type="number" min="40" max="250" value={form.bpm}
                onChange={e => set('bpm', e.target.value)} placeholder="120" />
            </div>
          </div>

          {form.key === 'Personalizado' && (
            <div className="space-y-1.5">
              <Label className="pb-2 block">Tom personalizado</Label>
              <Input value={form.customKey} onChange={e => set('customKey', e.target.value)} placeholder="Ex: Lá# maior" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="pb-2 block">Duração</Label>
              <Input value={form.duration} onChange={e => set('duration', e.target.value)} placeholder="3:45" />
            </div>
            <div className="space-y-1.5">
              <Label className="pb-2 block">URL do YouTube</Label>
              <Input value={form.youtubeUrl} onChange={e => set('youtubeUrl', e.target.value)} placeholder="https://..." />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="pb-2 block">Tags</Label>
            <div className="flex flex-wrap gap-1.5 min-h-[24px]">
              {form.tags.map(tag => (
                <TagPill key={tag} tag={tag} removable
                  onRemove={() => setForm(p => ({ ...p, tags: p.tags.filter(t => t !== tag) }))} />
              ))}
            </div>
            <Input value={tagInput} onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
              placeholder="Digitar tag e pressionar Enter…" />
          </div>

          <div className="space-y-1.5">
            <Label className="pb-2 block">Notas / Cifra</Label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Observações, cifra, tom por instrumento…"
              rows={3}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all duration-150" />
          </div>
        </div>

        <DialogFooter>
          {editSong && (
            <Button variant="destructive" onClick={() => setDelConfirm(true)} className="mr-auto gap-1.5 h-10 px-4">
              <Trash2 className="w-3.5 h-3.5" /> Excluir
            </Button>
          )}
          <Button variant="outline" className="h-10 px-4" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="h-10 px-4" onClick={handleSave}>Salvar Música</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      open={delConfirm}
      onOpenChange={setDelConfirm}
      title="Excluir esta música?"
      description="Ela será removida de todos os setlists. Esta ação não pode ser desfeita."
      confirmLabel="Excluir"
      onConfirm={() => { onDelete(editSong.id); onOpenChange(false) }}
    />
    </>
  )
}

// ── SongCard ──────────────────────────────────────────────
function SongCard({ song, onClick, onEdit, onDelete }) {
  return (
    <div
      onClick={onClick}
      className="group relative bg-white border border-slate-200 rounded-2xl p-4 hover:border-orange-200 hover:shadow-sm transition-all duration-150 cursor-pointer"
    >
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <Button size="icon-sm" variant="ghost" onClick={e => { e.stopPropagation(); onEdit() }}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button size="icon-sm" variant="ghost"
          className="text-red-400 hover:text-red-600 hover:bg-red-50"
          onClick={e => { e.stopPropagation(); onDelete() }}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="pr-16">
        <h3 className="font-semibold text-slate-900 truncate">{song.title}</h3>
        {song.artist && <p className="text-sm text-slate-500 truncate mt-0.5">{song.artist}</p>}
      </div>

      {song.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2.5">
          {song.tags.slice(0, 3).map(tag => <TagPill key={tag} tag={tag} />)}
          {song.tags.length > 3 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-400">
              +{song.tags.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 mt-3 text-xs text-slate-400 flex-wrap">
        {song.key && <span className="font-semibold text-slate-600 bg-slate-50 px-2 py-0.5 rounded">{song.key}</span>}
        {song.bpm && <span>{song.bpm} BPM</span>}
        {song.duration && (
          <span className="flex items-center gap-0.5">
            <Clock className="w-3 h-3" /> {song.duration}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1 font-medium text-orange-500">
          <Mic2 className="w-3 h-3" />
          {song.playCount > 0 ? `${song.playCount}×` : '—'}
        </span>
      </div>
    </div>
  )
}

// ── SongDrawer ────────────────────────────────────────────
function SongDrawer({ song, events, setlists, onClose, onEdit }) {
  const history = useMemo(() => {
    if (!song) return []
    return setlists
      .filter(sl => sl.songs.includes(song.id))
      .map(sl => {
        const ev = events.find(e => e.id === sl.eventId)
        return ev ? { event: ev, setlistName: sl.name } : null
      })
      .filter(Boolean)
      .sort((a, b) => b.event.date.localeCompare(a.event.date))
  }, [song, setlists, events])

  return createPortal(
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/20 z-40"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
        className="fixed right-0 inset-y-0 h-full w-80 sm:w-96 bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200"
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-slate-100">
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-slate-900 leading-snug">{song.title}</h2>
            {song.artist && <p className="text-sm text-slate-500 mt-0.5">{song.artist}</p>}
          </div>
          <div className="flex gap-1 shrink-0">
            <Button size="icon-sm" variant="ghost" onClick={onEdit}><Pencil className="w-3.5 h-3.5" /></Button>
            <Button size="icon-sm" variant="ghost" onClick={onClose}><X className="w-3.5 h-3.5" /></Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {song.tags?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {song.tags.map(tag => <TagPill key={tag} tag={tag} />)}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            {song.key && (
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Tom</p>
                <p className="text-sm font-semibold text-slate-800 mt-1">{song.key}</p>
              </div>
            )}
            {song.bpm && (
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">BPM</p>
                <p className="text-sm font-semibold text-slate-800 mt-1">{song.bpm}</p>
              </div>
            )}
            {song.duration && (
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Duração</p>
                <p className="text-sm font-semibold text-slate-800 mt-1">{song.duration}</p>
              </div>
            )}
            <div className="bg-orange-50 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-orange-400 uppercase tracking-wider">Tocada</p>
              <p className="text-sm font-semibold text-orange-600 mt-1">{song.playCount}×</p>
            </div>
          </div>

          {song.youtubeUrl && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">YouTube</p>
              <a href={song.youtubeUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                onClick={e => e.stopPropagation()}>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{song.youtubeUrl}</span>
              </a>
            </div>
          )}

          {song.notes && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Notas</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-xl p-3 leading-relaxed">
                {song.notes}
              </p>
            </div>
          )}

          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Histórico de Shows</p>
            {history.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Ainda não tocada em nenhum show.</p>
            ) : (
              <div className="space-y-0">
                {history.map(({ event: ev, setlistName }, i) => (
                  <div key={i} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{ev.name}</p>
                      <p className="text-xs text-slate-400">{fmtDate(ev.date)} · {setlistName}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>,
    document.body
  )
}

// ── SortableSongItem ──────────────────────────────────────
function SortableSongItem({ id, song, index, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-100 bg-white hover:border-slate-200 transition-colors"
    >
      <button {...listeners} {...attributes}
        className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 touch-none shrink-0">
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <span className="text-[10px] font-bold text-slate-300 w-4 text-center shrink-0 tabular-nums">{index + 1}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{song.title}</p>
        {song.artist && <p className="text-xs text-slate-400 truncate">{song.artist}</p>}
      </div>
      {song.duration && <span className="text-xs text-slate-400 font-mono shrink-0">{song.duration}</span>}
      <button onClick={onRemove} className="shrink-0 text-slate-300 hover:text-red-400 transition-colors">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ── SetlistSection ────────────────────────────────────────
function SetlistSection({ setlist, songMap, event, companyProfile, onDelete, onRename, onAddSong, onRemoveSong, onReorder, onConfirm, onUnconfirm }) {
  const [editingName, setEditingName] = useState(false)
  const [nameInput,   setNameInput]   = useState(setlist.name)
  const [libSearch,   setLibSearch]   = useState('')
  const [delConfirm,  setDelConfirm]  = useState(false)

  const fmtDateTime = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const oldIdx = setlist.songs.indexOf(active.id)
    const newIdx = setlist.songs.indexOf(over.id)
    onReorder(arrayMove(setlist.songs, oldIdx, newIdx))
  }

  const saveName = () => {
    const trimmed = nameInput.trim()
    if (trimmed && trimmed !== setlist.name) onRename(trimmed)
    setEditingName(false)
  }

  const availableSongs = Object.values(songMap).filter(s => {
    if (setlist.songs.includes(s.id)) return false
    if (!libSearch.trim()) return true
    const q = libSearch.toLowerCase()
    return s.title.toLowerCase().includes(q) || (s.artist || '').toLowerCase().includes(q)
  })

  const totalSec = setlist.songs.reduce((sum, id) => sum + parseDuration(songMap[id]?.duration), 0)

  const handleExport = async () => {
    try {
      await generateSetlistPdf({ setlist, songMap, event, companyProfile })
    } catch {
      toast.error('Erro ao gerar PDF')
    }
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          {editingName ? (
            <input
              autoFocus
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onBlur={saveName}
              onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
              className="flex-1 text-base font-semibold bg-transparent border-b-2 border-orange-500 outline-none text-slate-900 pb-0.5"
            />
          ) : (
            <button onClick={() => { setNameInput(setlist.name); setEditingName(true) }}
              className="flex-1 text-left text-base font-semibold text-slate-900 hover:text-orange-600 transition-colors truncate"
              title="Clique para renomear">
              {setlist.name}
            </button>
          )}
          {setlist.confirmedAt && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 shrink-0">
              <CheckCircle2 className="w-3 h-3" /> Confirmado
            </span>
          )}
          <Button size="icon-sm" variant="ghost"
            className="text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
            onClick={() => setDelConfirm(true)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Confirmed banner */}
        {setlist.confirmedAt && (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 mt-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <p className="text-xs text-emerald-700 flex-1">
              Setlist confirmado em <span className="font-semibold">{fmtDateTime(setlist.confirmedAt)}</span>
            </p>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {setlist.confirmedAt ? (
          /* Confirmed: compact summary + action buttons */
          <div className="flex items-center justify-between pt-1">
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              {setlist.songs.length} música{setlist.songs.length !== 1 ? 's' : ''}
              {totalSec > 0 && <> · <span className="font-semibold text-slate-700">{fmtTotalDuration(totalSec)}</span></>}
            </span>
            <div className="flex items-center gap-2">
              {setlist.songs.length > 0 && (
                <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={handleExport}>
                  <Download className="w-3 h-3" /> Exportar PDF
                </Button>
              )}
              <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={onUnconfirm}>
                <Pencil className="w-3 h-3" /> Editar setlist
              </Button>
            </div>
          </div>
        ) : (
          /* Editing: full two-column grid */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Left: DnD setlist */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Ordem de execução</p>
              {setlist.songs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                  <Music className="w-6 h-6 mb-2 opacity-40" />
                  <p className="text-sm">Nenhuma música adicionada</p>
                  <p className="text-xs mt-0.5 opacity-70">Use a biblioteca à direita</p>
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={setlist.songs} strategy={verticalListSortingStrategy}>
                    <div className="space-y-1.5">
                      {setlist.songs.map((id, i) => {
                        const song = songMap[id]
                        if (!song) return null
                        return (
                          <SortableSongItem key={id} id={id} song={song} index={i}
                            onRemove={() => onRemoveSong(id)} />
                        )
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
              )}

              {setlist.songs.length > 0 && (
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    {totalSec > 0
                      ? <>Duração: <span className="font-semibold text-slate-700 ml-0.5">{fmtTotalDuration(totalSec)}</span></>
                      : <>{setlist.songs.length} música{setlist.songs.length !== 1 ? 's' : ''}</>
                    }
                  </span>
                  <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={handleExport}>
                    <Download className="w-3 h-3" /> Exportar PDF
                  </Button>
                </div>
              )}

              <div className="flex items-center pt-2 border-t border-slate-100">
                <Button
                  size="sm"
                  onClick={onConfirm}
                  disabled={setlist.songs.length === 0}
                  className="gap-1.5 h-7 text-xs"
                >
                  <CheckCircle2 className="w-3 h-3" /> Confirmar setlist
                </Button>
              </div>
            </div>

            {/* Right: Library */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Biblioteca</p>
              <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-1.5 bg-white">
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input value={libSearch} onChange={e => setLibSearch(e.target.value)}
                  placeholder="Buscar na biblioteca…"
                  className="text-xs outline-none text-slate-700 placeholder:text-slate-400 w-full bg-transparent" />
                {libSearch && (
                  <button onClick={() => setLibSearch('')} className="text-slate-300 hover:text-slate-500">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
                {availableSongs.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-6 italic">
                    {Object.keys(songMap).length === 0
                      ? 'Nenhuma música cadastrada'
                      : libSearch ? 'Nenhum resultado' : 'Todas as músicas já estão no setlist'}
                  </p>
                ) : (
                  availableSongs.map(song => (
                    <div key={song.id}
                      className="group flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-100 hover:border-orange-200 hover:bg-orange-50/40 transition-all duration-150">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{song.title}</p>
                        {song.artist && <p className="text-xs text-slate-400 truncate">{song.artist}</p>}
                      </div>
                      {song.duration && <span className="text-xs text-slate-400 font-mono shrink-0">{song.duration}</span>}
                      <Button size="icon-sm" variant="ghost"
                        className="shrink-0 text-orange-500 hover:text-orange-700 hover:bg-orange-100 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onAddSong(song.id)}>
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={delConfirm}
        onOpenChange={setDelConfirm}
        title="Excluir este setlist?"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={onDelete}
      />
    </Card>
  )
}

// ── KpiCard ───────────────────────────────────────────────
function KpiCard({ label, value, sub, compact }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-4">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className={cn('font-bold text-slate-900 mt-1.5', compact ? 'text-sm truncate leading-tight' : 'text-2xl')}>
          {value}
        </p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  )
}

// ── RepertoireTab ─────────────────────────────────────────
function RepertoireTab({ computedSongs, events, setlists }) {
  const { addSong, updateSong, deleteSong } = useStore()
  const [search,     setSearch]     = useState('')
  const [activeTags, setActiveTags] = useState([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editSongId, setEditSongId] = useState(null)
  const [drawerSongId, setDrawerSongId] = useState(null)
  const [delConfirmId, setDelConfirmId] = useState(null)

  const editSong   = computedSongs.find(s => s.id === editSongId) || null
  const drawerSong = computedSongs.find(s => s.id === drawerSongId) || null

  const mostPlayed = useMemo(() => {
    if (!computedSongs.length) return null
    return [...computedSongs].sort((a, b) => b.playCount - a.playCount)[0]
  }, [computedSongs])

  const avgBpm = useMemo(() => {
    const list = computedSongs.filter(s => s.bpm)
    if (!list.length) return null
    return Math.round(list.reduce((s, x) => s + Number(x.bpm), 0) / list.length)
  }, [computedSongs])

  const allTags = useMemo(() => {
    const set = new Set()
    computedSongs.forEach(s => (s.tags || []).forEach(t => set.add(t)))
    return [...set].sort()
  }, [computedSongs])

  const filtered = useMemo(() => {
    let r = computedSongs
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(s => s.title.toLowerCase().includes(q) || (s.artist || '').toLowerCase().includes(q))
    }
    if (activeTags.length > 0) r = r.filter(s => activeTags.every(t => (s.tags || []).includes(t)))
    return r
  }, [computedSongs, search, activeTags])

  const toggleTag = (tag) =>
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])

  const handleSave = (data) => {
    if (editSongId) {
      updateSong(editSongId, data)
      toast.success('Música atualizada!')
    } else {
      addSong(data)
      toast.success('Música adicionada!')
    }
    setDialogOpen(false)
    setEditSongId(null)
  }

  const handleDelete = (id) => {
    deleteSong(id)
    toast.success('Música excluída.')
    if (drawerSongId === id) setDrawerSongId(null)
  }

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Músicas cadastradas" value={computedSongs.length} />
        <KpiCard label="Mais tocada"
          value={mostPlayed?.title || '—'}
          sub={mostPlayed?.playCount > 0 ? `${mostPlayed.playCount} vez${mostPlayed.playCount !== 1 ? 'es' : ''}` : null}
          compact />
        <KpiCard label="BPM médio" value={avgBpm ?? '—'} sub={avgBpm ? 'média do repertório' : 'sem BPM cadastrado'} />
        <KpiCard label="Tags únicas" value={allTags.length} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-1.5 bg-white flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por título ou artista…"
            className="text-xs outline-none text-slate-700 placeholder:text-slate-400 w-full bg-transparent" />
          {search && (
            <button onClick={() => setSearch('')} className="text-slate-300 hover:text-slate-500">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <Button onClick={() => { setEditSongId(null); setDialogOpen(true) }} className="gap-1.5 shrink-0">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Adicionar música</span>
          <span className="sm:hidden">Adicionar</span>
        </Button>
      </div>

      {/* Tag filters */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allTags.map(tag => (
            <button key={tag} onClick={() => toggleTag(tag)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium border transition-all duration-150',
                activeTags.includes(tag)
                  ? 'bg-orange-500 border-orange-500 text-white'
                  : cn(tagColor(tag), 'hover:opacity-80'),
              )}>
              {tag}
            </button>
          ))}
          {activeTags.length > 0 && (
            <button onClick={() => setActiveTags([])}
              className="px-3 py-1 rounded-full text-xs font-medium border border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-400 transition-all duration-150">
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      {computedSongs.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Music className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Nenhuma música cadastrada</p>
          <p className="text-xs mt-1">Clique em "Adicionar música" para começar</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14 text-slate-400">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhuma música encontrada</p>
          <button onClick={() => { setSearch(''); setActiveTags([]) }}
            className="mt-2 text-xs text-orange-500 hover:underline">Limpar filtros</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(song => (
            <SongCard key={song.id} song={song}
              onClick={() => setDrawerSongId(song.id)}
              onEdit={() => { setEditSongId(song.id); setDialogOpen(true) }}
              onDelete={() => setDelConfirmId(song.id)}
            />
          ))}
        </div>
      )}

      <SongDialog
        open={dialogOpen}
        onOpenChange={v => { setDialogOpen(v); if (!v) setEditSongId(null) }}
        editSong={editSong}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      <AnimatePresence>
        {drawerSong && (
          <SongDrawer
            song={drawerSong}
            events={events}
            setlists={setlists}
            onClose={() => setDrawerSongId(null)}
            onEdit={() => { setEditSongId(drawerSongId); setDialogOpen(true); setDrawerSongId(null) }}
          />
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={delConfirmId !== null}
        onOpenChange={v => { if (!v) setDelConfirmId(null) }}
        title="Excluir esta música?"
        description="Ela será removida de todos os setlists. Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={() => handleDelete(delConfirmId)}
      />
    </div>
  )
}

// ── SetlistsTab ───────────────────────────────────────────
function SetlistsTab({ computedSongs, events }) {
  const {
    setlists, companyProfile,
    addSetlist, updateSetlist, deleteSetlist,
    addSongToSetlist, removeSongFromSetlist, reorderSetlist,
  } = useStore()

  const [selEventId, setSelEventId] = useState(null)

  const eligibleEvents = useMemo(() => {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    return [...events]
      .filter(ev => new Date(ev.date + 'T12:00:00') >= cutoff)
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [events])


  const selectedEvent  = events.find(e => e.id === selEventId) || null
  const eventSetlists  = setlists.filter(sl => sl.eventId === selEventId)
  const songMap        = useMemo(() => Object.fromEntries(computedSongs.map(s => [s.id, s])), [computedSongs])

  const handleAddSetlist = () => {
    if (!selEventId) return
    addSetlist(selEventId, 'Novo Setlist')
    toast.success('Setlist criado!')
  }

  return (
    <div className="space-y-5">
      {/* Event picker */}
      <Card className="rounded-2xl">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Label className="shrink-0">Evento</Label>
            {eligibleEvents.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Nenhum evento nos últimos 90 dias ou futuro.</p>
            ) : (
              <Select
                value={selEventId ?? ''}
                onValueChange={v => setSelEventId(v)}>
                <SelectTrigger className="flex-1 min-w-[200px]">
                  <SelectValue placeholder="Selecione um evento…" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleEvents.map(ev => (
                    <SelectItem key={ev.id} value={ev.id}>
                      {ev.name} — {fmtDate(ev.date)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Setlists for selected event */}
      {selEventId && (
        <div className="space-y-4">
          {eventSetlists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
              <List className="w-9 h-9 mb-3 opacity-30" />
              <p className="text-sm font-medium text-slate-500">Nenhum setlist para este evento</p>
              <p className="text-xs mt-1 opacity-80">Crie um setlist para organizar o repertório do show</p>
              <Button onClick={handleAddSetlist} className="mt-5 gap-1.5">
                <Plus className="w-4 h-4" /> Criar setlist
              </Button>
            </div>
          ) : (
            <>
              {eventSetlists.map(sl => (
                <SetlistSection
                  key={sl.id}
                  setlist={sl}
                  songMap={songMap}
                  event={selectedEvent}
                  companyProfile={companyProfile}
                  onDelete={() => { deleteSetlist(sl.id); toast.success('Setlist excluído.') }}
                  onRename={name => updateSetlist(sl.id, { name })}
                  onAddSong={songId => addSongToSetlist(sl.id, songId)}
                  onRemoveSong={songId => removeSongFromSetlist(sl.id, songId)}
                  onReorder={order => reorderSetlist(sl.id, order)}
                  onConfirm={() => { updateSetlist(sl.id, { confirmedAt: new Date().toISOString() }); toast.success('Setlist confirmado!') }}
                  onUnconfirm={() => { updateSetlist(sl.id, { confirmedAt: null }); toast.success('Confirmação removida.') }}
                />
              ))}
              <Button variant="outline" onClick={handleAddSetlist}
                className="w-full gap-1.5 border-dashed h-10">
                <Plus className="w-4 h-4" /> Adicionar setlist
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────
function RepertoireSkeleton() {
  return (
    <div className="space-y-5">
      <div><Skeleton className="h-7 w-36" /><Skeleton className="h-4 w-28 mt-1.5" /></div>
      <div className="flex gap-6 border-b border-slate-200 pb-2.5">
        <Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-16" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 flex-1 rounded-lg" />
        <Skeleton className="h-8 w-36 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────
export default function Repertoire({ isLoading }) {
  const { songs, setlists, events } = useStore()
  const [tab, setTab] = useState('repertoire')

  const computedSongs = useMemo(() => {
    const today = new Date()
    return songs.map(song => {
      const count = setlists.filter(sl => {
        if (!sl.songs.includes(song.id)) return false
        const ev = events.find(e => e.id === sl.eventId)
        return ev ? new Date(ev.date + 'T12:00:00') < today : false
      }).length
      return { ...song, playCount: count }
    })
  }, [songs, setlists, events])

  if (isLoading) return <RepertoireSkeleton />

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Repertório</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {songs.length} música{songs.length !== 1 ? 's' : ''} · {setlists.length} setlist{setlists.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {[
          { id: 'repertoire', label: 'Repertório' },
          { id: 'setlists',   label: 'Setlists'   },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn(
              'pb-2.5 pt-1 mr-6 text-sm font-medium border-b-2 transition-colors',
              tab === t.id
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-700',
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'repertoire'
        ? <RepertoireTab computedSongs={computedSongs} events={events} setlists={setlists} />
        : <SetlistsTab   computedSongs={computedSongs} events={events} />
      }
    </div>
  )
}
