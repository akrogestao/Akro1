import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useBand } from '@/hooks/useBand.jsx'
import { COLORS } from '../data/defaults'
import { getInitials } from '../lib/format'
import { toast } from 'sonner'

const DEFAULT_CHECKLIST_TEMPLATES = [
  { id: 1, name: 'Checklist Padrão', owner: 'both', items: [
    { text: 'Input List' }, { text: 'Room List' }, { text: 'Camarim' },
    { text: 'Lista Integrantes' }, { text: 'Hospedagem' },
    { text: 'Translado show' }, { text: 'Rider' }, { text: 'Contrato assinado' },
  ]},
]

const StoreContext = createContext(null)

const DEFAULT_COMPANY_PROFILE = {
  companyName: '', cnpj: '', address: '', city: '', state: '',
  phone: '', email: '', proposalValidityDays: 30,
  logoBase64: null, brandColorBase: null, brandColorAccent: null,
}

// ── Row converters ────────────────────────────────────────────────────────────

const memberFromRow = r => ({ id: r.id, name: r.name, role: r.role, cache: Number(r.cache), cpf: r.cpf, init: r.init, color: r.color })
const memberToRow   = m => ({ id: m.id, name: m.name, role: m.role || '', cache: m.cache || 0, cpf: m.cpf || '', init: m.init || '', color: m.color || '' })

const contractorFromRow = r => ({ id: r.id, name: r.name, company: r.company, role: r.role, phone: r.phone, email: r.email, city: r.city, state: r.state, lat: r.lat, lng: r.lng, notes: r.notes })
const contractorToRow   = c => ({ id: c.id, name: c.name, company: c.company || '', role: c.role || '', phone: c.phone || '', email: c.email || '', city: c.city || '', state: c.state || '', lat: c.lat ?? null, lng: c.lng ?? null, notes: c.notes || '' })

const eventFromRow = r => ({
  id: r.id, name: r.name, local: r.local, date: r.date, time: r.time,
  end: r.end_time, value: Number(r.value), type: r.type,
  event_type: r.event_type || 'show', visibility: r.visibility || 'publico', organizer_name: r.organizer_name || '',
  members: r.member_ids || [], contractorIds: r.contractor_ids || [],
  city: r.city, state: r.state, lat: r.lat, lng: r.lng, notes: r.notes,
  expenses: r.expenses || { alimentacao: 0, hospedagem: 0, logistica: 0 },
  _memberPayments: r.member_payments || {},
  _contractReceipt: r.contract_receipt || { paid: false, partial: false, paidAmount: null, paidAt: null, partialPayments: [] },
})
const eventFieldsToRow = ev => ({
  name: ev.name, local: ev.local || '', date: ev.date || '', time: ev.time || '',
  end_time: ev.end || '', value: ev.value || 0, type: ev.type || 'Show',
  event_type: ev.event_type || 'show', visibility: ev.visibility || 'publico', organizer_name: ev.organizer_name || null,
  member_ids: ev.members || [], contractor_ids: ev.contractorIds || [],
  city: ev.city || '', state: ev.state || '', lat: ev.lat ?? null, lng: ev.lng ?? null,
  notes: ev.notes || '', expenses: ev.expenses || { alimentacao: 0, hospedagem: 0, logistica: 0 },
})

const expenseFromRow = r => ({ id: r.id, eventId: r.event_id, type: r.type, amount: Number(r.amount), date: r.date, description: r.description, commission_contractors: r.commission_contractors || [] })
const expenseToRow   = e => ({ id: e.id, event_id: e.eventId, type: e.type || '', amount: e.amount || 0, date: e.date || '', description: e.description || '', commission_contractors: e.commission_contractors || [] })

const stopFromRow  = r => ({ id: r.id, name: r.name, city: r.city, state: r.state, lat: r.lat, lng: r.lng, notes: r.notes, afterEventId: r.after_event_id ?? null })
const stopToRow    = (s, isFav) => ({ id: s.id, is_favorite: isFav, name: s.name || '', city: s.city || '', state: s.state || '', lat: s.lat ?? null, lng: s.lng ?? null, notes: s.notes || '', after_event_id: s.afterEventId ?? null })

const songFromRow = r => ({ id: r.id, title: r.title, artist: r.artist, key: r.key, bpm: r.bpm, duration: r.duration, notes: r.notes, tags: r.tags || [], playCount: r.play_count, rehearsalCount: r.rehearsal_count, createdAt: r.created_at })
const songToRow   = s => ({ id: s.id, title: s.title, artist: s.artist || '', key: s.key || '', bpm: s.bpm ?? null, duration: s.duration || '', notes: s.notes || '', tags: s.tags || [], play_count: s.playCount || 0, rehearsal_count: s.rehearsalCount || 0 })

const setlistFromRow = r => ({ id: r.id, eventId: r.event_id, name: r.name, songs: r.songs || [], confirmedAt: r.confirmed_at ?? null, createdAt: r.created_at, updatedAt: r.updated_at })
const setlistToRow   = sl => ({ id: sl.id, event_id: sl.eventId, name: sl.name, songs: sl.songs || [], confirmed_at: sl.confirmedAt ?? null })

const equipmentFromRow = r => ({ id: r.id, name: r.name, category: r.category, brand: r.brand, model: r.model, serial: r.serial, notes: r.notes, status: r.status, value: Number(r.value), createdAt: r.created_at })
const equipmentToRow   = e => ({ id: e.id, name: e.name, category: e.category || '', brand: e.brand || '', model: e.model || '', serial: e.serial || '', notes: e.notes || '', status: e.status || 'Disponível', value: e.value || 0 })

const showEquipmentFromRow = r => ({ id: r.id, eventId: r.event_id, equipmentIds: r.equipment_ids || [], checkedAt: r.checked_at, notes: r.notes })
const showEquipmentToRow   = se => ({ id: se.id, event_id: se.eventId, equipment_ids: se.equipmentIds || [], checked_at: se.checkedAt ?? null, notes: se.notes || '' })

const budgetFromRow = r => ({
  ...r.data,
  id:             r.id,
  status:         r.status,
  state:          r.state          || r.data?.state          || '',
  city:           r.city           || r.data?.city           || '',
  event_type:     r.event_type     || r.data?.event_type     || 'show',
  visibility:     r.visibility     || r.data?.visibility     || 'publico',
  organizer_name: r.organizer_name || r.data?.organizer_name || '',
  createdAt:      r.created_at,
  updatedAt:      r.updated_at,
})
const budgetToRow = b => {
  const { id, status, state, city, event_type, visibility, organizer_name, createdAt, updatedAt, ...data } = b
  return { id, status: status || 'Rascunho', state: state || '', city: city || '', event_type: event_type || 'show', visibility: visibility || 'publico', organizer_name: organizer_name || '', data }
}

const rehearsalFromRow = r => ({ id: r.id, date: r.date, time: r.time, location: r.location, notes: r.notes, status: r.status, songs: r.songs || [], attendedMembers: r.attended_members || [], createdAt: r.created_at })
const rehearsalToRow   = r => ({ id: r.id, date: r.date || '', time: r.time || '', location: r.location || '', notes: r.notes || '', status: r.status || 'Agendado', songs: r.songs || [], attended_members: r.attendedMembers || [] })

const collaboratorFromRow = r => ({ id: r.id, name: r.name, email: r.email, pin: r.pin, role: r.role, avatar: r.avatar, permissions: r.permissions || {}, createdAt: r.created_at })
const collaboratorToRow   = c => ({ id: c.id, name: c.name, email: c.email || '', collaborator_email: c.email || '', pin: c.pin || '', role: c.role || '', avatar: c.avatar || getInitials(c.name), permissions: c.permissions || {} })

const checklistItemFromRow = r => ({ id: r.id, eventId: r.event_id, templateId: r.template_id, text: r.text, done: r.done, doneAt: r.done_at, isCustom: r.is_custom })
const checklistItemToRow   = i => ({ id: i.id, event_id: i.eventId, template_id: i.templateId ?? null, text: i.text, done: i.done, done_at: i.doneAt ?? null, is_custom: i.isCustom })

const profileFromRow = r => ({ companyName: r.company_name, cnpj: r.cnpj, address: r.address, city: r.city, state: r.state, phone: r.phone, email: r.email, proposalValidityDays: r.proposal_validity_days, logoBase64: r.logo_base64, brandColorBase: r.brand_color_base, brandColorAccent: r.brand_color_accent })
const profileToRow   = (p, bandId) => ({ company_name: p.companyName || '', cnpj: p.cnpj || '', address: p.address || '', city: p.city || '', state: p.state || '', phone: p.phone || '', email: p.email || '', proposal_validity_days: p.proposalValidityDays || 30, logo_base64: p.logoBase64 ?? null, brand_color_base: p.brandColorBase ?? null, brand_color_accent: p.brandColorAccent ?? null, band_id: bandId })

// ── Load all from Supabase ─────────────────────────────────────────────────────

async function loadAll(bandId) {
  const q = (table) => supabase.from(table).select('*').eq('band_id', bandId)
  const [
    { data: evRows }, { data: memRows }, { data: conRows }, { data: expRows },
    { data: transpRows }, { data: chkRows }, { data: songRows }, { data: slRows },
    { data: eqRows }, { data: seRows }, { data: budRows }, { data: rehRows },
    { data: colRows }, { data: profRows },
  ] = await Promise.all([
    q('events').order('date'),
    q('members').order('name'),
    q('contractors').order('name'),
    q('expenses'),
    q('transport_entries'),
    q('checklist_items'),
    q('songs').order('title'),
    q('setlists'),
    q('equipment').order('name'),
    q('show_equipment'),
    q('budgets').order('created_at', { ascending: false }),
    q('rehearsals').order('date'),
    q('collaborators').order('name'),
    supabase.from('company_profile').select('*').eq('band_id', bandId).limit(1),
  ])

  const events = (evRows || []).map(eventFromRow)
  const payments = {}; const contractReceipts = {}
  events.forEach(ev => {
    payments[ev.id] = ev._memberPayments
    contractReceipts[ev.id] = ev._contractReceipt
    delete ev._memberPayments; delete ev._contractReceipt
  })

  const transp = transpRows || []
  return {
    events, payments, contractReceipts,
    members: (memRows || []).map(memberFromRow),
    contractors: (conRows || []).map(contractorFromRow),
    expenses: (expRows || []).map(expenseFromRow),
    stops: transp.filter(r => !r.is_favorite).map(stopFromRow),
    favoriteStops: transp.filter(r => r.is_favorite).map(stopFromRow),
    checklistItems: (chkRows || []).map(checklistItemFromRow),
    songs: (songRows || []).map(songFromRow),
    setlists: (slRows || []).map(setlistFromRow),
    equipment: (eqRows || []).map(equipmentFromRow),
    showEquipment: (seRows || []).map(showEquipmentFromRow),
    budgets: (budRows || []).map(budgetFromRow),
    rehearsals: (rehRows || []).map(rehearsalFromRow),
    collaborators: (colRows || []).map(collaboratorFromRow),
    companyProfile: profRows && profRows.length > 0 ? profileFromRow(profRows[0]) : { ...DEFAULT_COMPANY_PROFILE },
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function StoreProvider({ children }) {
  const { activeBand } = useBand()
  const bandId = activeBand?.id
  const [reloadKey, setReloadKey] = useState(0)
  const reloadStore = useCallback(() => setReloadKey(k => k + 1), [])
  const [isInitializing, setIsInitializing] = useState(true)
  const [events,            setEvents]           = useState([])
  const [members,           setMembers]          = useState([])
  const [payments,          setPayments]         = useState({})
  const [expenses,          setExpenses]         = useState([])
  const [stops,             setStops]            = useState([])
  const [favoriteStops,     setFavoriteStops]    = useState([])
  const [contractors,       setContractors]      = useState([])
  const [companyProfile,    setCompanyProfile]   = useState({ ...DEFAULT_COMPANY_PROFILE })
  const [contractReceipts,  setContractReceipts] = useState({})
  const [checklistItems,    setChecklistItems]   = useState([])
  const [songs,             setSongs]            = useState([])
  const [setlists,          setSetlists]         = useState([])
  const [equipment,         setEquipment]        = useState([])
  const [showEquipment,     setShowEquipmentData]= useState([])
  const [budgets,           setBudgets]          = useState([])
  const [rehearsals,        setRehearsals]       = useState([])
  const [collaborators,     setCollaborators]    = useState([])
  const [session,           setSession]          = useState(null)
  const [theme,             setTheme]            = useState(() => { try { return localStorage.getItem('bm_theme') || 'dark' } catch { return 'dark' } })
  const [notificationPrefs, setNotificationPrefs]= useState({ urgentChecklist: true, latePayments: true, inactiveContractors: true, pendingChecklist: true, showsWithoutChecklist: true })

  const activeCollaborator = session?.type === 'collaborator' ? session.id : null

  useEffect(() => {
    if (!bandId) return
    setIsInitializing(true)
    async function init() {
      try {
        const data = await loadAll(bandId)
        setEvents(data.events); setMembers(data.members); setPayments(data.payments)
        setExpenses(data.expenses); setStops(data.stops); setFavoriteStops(data.favoriteStops)
        setContractors(data.contractors); setCompanyProfile(data.companyProfile)
        setContractReceipts(data.contractReceipts); setChecklistItems(data.checklistItems)
        setSongs(data.songs); setSetlists(data.setlists); setEquipment(data.equipment)
        setShowEquipmentData(data.showEquipment); setBudgets(data.budgets)
        setRehearsals(data.rehearsals); setCollaborators(data.collaborators)
        let collabSession = null
        try { collabSession = JSON.parse(localStorage.getItem('bm_collab_session') || 'null') } catch {}
        setSession(collabSession?.id ? { type: 'collaborator', id: collabSession.id } : { type: 'chief' })
      } catch (err) {
        console.error('Init error:', err)
        toast.error('Erro ao conectar com o banco de dados')
      } finally {
        setIsInitializing(false)
      }
    }
    init()
  }, [bandId, reloadKey])

  useEffect(() => { try { localStorage.setItem('bm_theme', theme) } catch {} }, [theme])
  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [theme])

  // ── Events ────────────────────────────────────────────────────────────────
  const addEvent = useCallback((ev, draftChecklistItems = []) => {
    const id = ev.id || crypto.randomUUID()
    const newEv = { ...ev, id }
    setEvents(prev => [...prev, newEv])
    supabase.from('events').insert({ ...eventFieldsToRow(newEv), id, band_id: bandId, member_payments: {}, contract_receipt: { paid: false, partial: false, paidAmount: null, paidAt: null, partialPayments: [] } })
      .then(({ error }) => {
        if (error) { toast.error('Erro ao criar evento'); return }
        if (draftChecklistItems.length > 0) {
          supabase.from('checklist_items').insert(draftChecklistItems.map(i => ({ ...checklistItemToRow(i), band_id: bandId })))
            .then(({ error: e }) => { if (e) console.error('checklist sync error', e) })
        }
      })
  }, [bandId])

  const updateEvent = useCallback((id, u) => {
    setEvents(prev => {
      const updated = prev.map(e => e.id === id ? { ...e, ...u } : e)
      const newEv = updated.find(e => e.id === id)
      if (newEv) supabase.from('events').update(eventFieldsToRow(newEv)).eq('id', id).then(({ error }) => { if (error) toast.error('Erro ao atualizar evento') })
      return updated
    })
  }, [])

  const deleteEvent = useCallback((id) => {
    setEvents(prev => prev.filter(e => e.id !== id))
    supabase.from('events').delete().eq('id', id).then(({ error }) => { if (error) toast.error('Erro ao excluir evento') })
  }, [])

  // ── Members ───────────────────────────────────────────────────────────────
  const addMember = useCallback((m) => {
    setMembers(prev => {
      const color = COLORS[prev.length % COLORS.length]
      const newM = { ...m, id: crypto.randomUUID(), init: getInitials(m.name), color }
      supabase.from('members').insert({ ...memberToRow(newM), band_id: bandId }).then(({ error }) => { if (error) toast.error('Erro ao criar membro') })
      return [...prev, newM]
    })
  }, [bandId])

  const updateMember = useCallback((id, u) => {
    setMembers(prev => {
      const updated = prev.map(m => m.id === id ? { ...m, ...u, init: getInitials(u.name ?? m.name) } : m)
      const newM = updated.find(m => m.id === id)
      if (newM) supabase.from('members').update(memberToRow(newM)).eq('id', id).then(({ error }) => { if (error) toast.error('Erro ao atualizar membro') })
      return updated
    })
  }, [])

  const deleteMember = useCallback((id) => {
    setMembers(prev => prev.filter(m => m.id !== id))
    setEvents(prev => prev.map(e => ({ ...e, members: (e.members || []).filter(mid => mid !== id) })))
    supabase.from('members').delete().eq('id', id).then(({ error }) => { if (error) toast.error('Erro ao excluir membro') })
  }, [])

  // ── Payments ──────────────────────────────────────────────────────────────
  const getPayEntry = useCallback((evId, memId) =>
    payments[evId]?.[memId] ?? { paid: false, partial: false, doubled: false, customValue: null, paidAt: null, partialPayments: [] },
  [payments])

  const setPayEntry = useCallback((evId, memId, updates) => {
    setPayments(prev => {
      const cur = prev[evId]?.[memId] ?? { paid: false, partial: false, doubled: false, customValue: null, paidAt: null, partialPayments: [] }
      const newEvPayments = { ...(prev[evId] || {}), [memId]: { ...cur, ...updates } }
      supabase.from('events').update({ member_payments: newEvPayments }).eq('id', evId).then(({ error }) => { if (error) toast.error('Erro ao salvar pagamento') })
      return { ...prev, [evId]: newEvPayments }
    })
  }, [])

  const addMemberPartialPayment = useCallback((evId, memId, amount) => {
    setPayments(prev => {
      const cur = prev[evId]?.[memId] ?? { paid: false, partial: false, doubled: false, customValue: null, paidAt: null, partialPayments: [] }
      const list = [...(cur.partialPayments || []), { id: crypto.randomUUID(), amount, paidAt: new Date().toISOString() }]
      const newEvPayments = { ...(prev[evId] || {}), [memId]: { ...cur, partialPayments: list } }
      supabase.from('events').update({ member_payments: newEvPayments }).eq('id', evId).then(({ error }) => { if (error) toast.error('Erro ao salvar pagamento parcial') })
      return { ...prev, [evId]: newEvPayments }
    })
  }, [])

  const removeMemberPartialPayment = useCallback((evId, memId, payId) => {
    setPayments(prev => {
      const cur = prev[evId]?.[memId] ?? { paid: false, partial: false, doubled: false, customValue: null, paidAt: null, partialPayments: [] }
      const list = (cur.partialPayments || []).filter(p => p.id !== payId)
      const newEvPayments = { ...(prev[evId] || {}), [memId]: { ...cur, partialPayments: list } }
      supabase.from('events').update({ member_payments: newEvPayments }).eq('id', evId).then(({ error }) => { if (error) toast.error('Erro ao remover pagamento parcial') })
      return { ...prev, [evId]: newEvPayments }
    })
  }, [])

  // ── Expenses ──────────────────────────────────────────────────────────────
  const addExpense = useCallback((exp) => {
    const newExp = { ...exp, id: crypto.randomUUID() }
    setExpenses(prev => [...prev, newExp])
    supabase.from('expenses').insert({ ...expenseToRow(newExp), band_id: bandId }).then(({ error }) => { if (error) toast.error('Erro ao criar despesa') })
  }, [bandId])

  const updateExpense = useCallback((id, u) => {
    setExpenses(prev => {
      const updated = prev.map(e => e.id === id ? { ...e, ...u } : e)
      const newExp = updated.find(e => e.id === id)
      if (newExp) supabase.from('expenses').update(expenseToRow(newExp)).eq('id', id).then(({ error }) => { if (error) toast.error('Erro ao atualizar despesa') })
      return updated
    })
  }, [])

  const deleteExpense = useCallback((id) => {
    setExpenses(prev => prev.filter(e => e.id !== id))
    supabase.from('expenses').delete().eq('id', id).then(({ error }) => { if (error) toast.error('Erro ao excluir despesa') })
  }, [])

  // ── Route stops ───────────────────────────────────────────────────────────
  const addStop = useCallback((s) => {
    const newS = { ...s, id: crypto.randomUUID() }
    setStops(prev => [...prev, newS])
    supabase.from('transport_entries').insert({ ...stopToRow(newS, false), band_id: bandId }).then(({ error }) => { if (error) toast.error('Erro ao criar parada') })
  }, [bandId])

  const updateStop = useCallback((id, u) => {
    setStops(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, ...u } : s)
      const newS = updated.find(s => s.id === id)
      if (newS) supabase.from('transport_entries').update(stopToRow(newS, false)).eq('id', id).then(({ error }) => { if (error) toast.error('Erro ao atualizar parada') })
      return updated
    })
  }, [])

  const deleteStop = useCallback((id) => {
    setStops(prev => prev.filter(s => s.id !== id))
    supabase.from('transport_entries').delete().eq('id', id).then(({ error }) => { if (error) toast.error('Erro ao excluir parada') })
  }, [])

  // ── Favorite stops ────────────────────────────────────────────────────────
  const addFavoriteStop = useCallback((f) => {
    const newF = { ...f, id: crypto.randomUUID() }
    setFavoriteStops(prev => [...prev, newF])
    supabase.from('transport_entries').insert({ ...stopToRow(newF, true), band_id: bandId }).then(({ error }) => { if (error) toast.error('Erro ao criar parada favorita') })
  }, [bandId])

  const deleteFavoriteStop = useCallback((id) => {
    setFavoriteStops(prev => prev.filter(f => f.id !== id))
    supabase.from('transport_entries').delete().eq('id', id).then(({ error }) => { if (error) toast.error('Erro ao excluir parada favorita') })
  }, [])

  // ── Contractors ───────────────────────────────────────────────────────────
  const addContractor = useCallback((c) => {
    const newC = { ...c, id: crypto.randomUUID() }
    setContractors(prev => [...prev, newC])
    supabase.from('contractors').insert({ ...contractorToRow(newC), band_id: bandId }).then(({ error }) => { if (error) toast.error('Erro ao criar contratante') })
  }, [bandId])

  const updateContractor = useCallback((id, u) => {
    setContractors(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, ...u } : c)
      const newC = updated.find(c => c.id === id)
      if (newC) supabase.from('contractors').update(contractorToRow(newC)).eq('id', id).then(({ error }) => { if (error) toast.error('Erro ao atualizar contratante') })
      return updated
    })
  }, [])

  const deleteContractor = useCallback((id) => {
    setContractors(prev => prev.filter(c => c.id !== id))
    supabase.from('contractors').delete().eq('id', id).then(({ error }) => { if (error) toast.error('Erro ao excluir contratante') })
  }, [])

  // ── Company profile ────────────────────────────────────────────────────────
  const updateCompanyProfile = useCallback((u) => {
    setCompanyProfile(prev => {
      const updated = { ...prev, ...u }
      supabase.from('company_profile').upsert(profileToRow(updated, bandId), { onConflict: 'band_id' }).then(({ error }) => { if (error) toast.error('Erro ao salvar perfil') })
      return updated
    })
  }, [bandId])

  // ── Contract receipts ──────────────────────────────────────────────────────
  const getContractReceipt = useCallback((evId) =>
    contractReceipts[evId] ?? { paid: false, partial: false, paidAmount: null, paidAt: null, partialPayments: [] },
  [contractReceipts])

  const setContractReceipt = useCallback((evId, updates) => {
    setContractReceipts(prev => {
      const cur = prev[evId] ?? { paid: false, partial: false, paidAmount: null, paidAt: null, partialPayments: [] }
      const updated = { ...cur, ...updates }
      const next = { ...prev, [evId]: updated }
      supabase.from('events').update({ contract_receipt: updated }).eq('id', evId).then(({ error }) => { if (error) toast.error('Erro ao salvar recibo') })
      return next
    })
  }, [])

  const addPartialPayment = useCallback((eventId, amount) => {
    setContractReceipts(prev => {
      const cur = prev[eventId] ?? { paid: false, partial: false, paidAmount: null, paidAt: null, partialPayments: [] }
      const list = [...(cur.partialPayments || []), { id: crypto.randomUUID(), amount, receivedAt: new Date().toISOString() }]
      const updated = { ...cur, partialPayments: list, paidAmount: list.reduce((s, p) => s + p.amount, 0) }
      supabase.from('events').update({ contract_receipt: updated }).eq('id', eventId).then(({ error }) => { if (error) toast.error('Erro ao salvar pagamento parcial') })
      return { ...prev, [eventId]: updated }
    })
  }, [])

  const removePartialPayment = useCallback((eventId, payId) => {
    setContractReceipts(prev => {
      const cur = prev[eventId] ?? { paid: false, partial: false, paidAmount: null, paidAt: null, partialPayments: [] }
      const list = (cur.partialPayments || []).filter(p => p.id !== payId)
      const updated = { ...cur, partialPayments: list, paidAmount: list.reduce((s, p) => s + p.amount, 0) }
      supabase.from('events').update({ contract_receipt: updated }).eq('id', eventId).then(({ error }) => { if (error) toast.error('Erro ao remover pagamento parcial') })
      return { ...prev, [eventId]: updated }
    })
  }, [])

  // ── Checklist ──────────────────────────────────────────────────────────────
  const initChecklist = useCallback((eventId) => {
    setChecklistItems(prev => {
      if (prev.some(item => item.eventId === eventId)) return prev
      const newItems = []
      DEFAULT_CHECKLIST_TEMPLATES.forEach(tpl => {
        tpl.items.forEach(it => newItems.push({ id: crypto.randomUUID(), eventId, templateId: tpl.id, text: it.text, done: false, doneAt: null, isCustom: false }))
      })
      return [...prev, ...newItems]
    })
  }, [])

  const toggleChecklistItem = useCallback((itemId) => {
    setChecklistItems(prev => {
      const updated = prev.map(item => item.id === itemId ? { ...item, done: !item.done, doneAt: !item.done ? new Date().toISOString() : null } : item)
      const newItem = updated.find(i => i.id === itemId)
      if (newItem) supabase.from('checklist_items').update({ done: newItem.done, done_at: newItem.doneAt }).eq('id', itemId).then(({ error }) => { if (error) toast.error('Erro ao atualizar checklist') })
      return updated
    })
  }, [])

  const addChecklistItem = useCallback((eventId, { text }) => {
    const newItem = { id: crypto.randomUUID(), eventId, templateId: null, text, done: false, doneAt: null, isCustom: true }
    setChecklistItems(prev => [...prev, newItem])
    supabase.from('checklist_items').insert({ ...checklistItemToRow(newItem), band_id: bandId }).then(({ error }) => { if (error) toast.error('Erro ao criar item') })
  }, [bandId])

  const deleteChecklistItem = useCallback((itemId) => {
    setChecklistItems(prev => prev.filter(item => item.id !== itemId))
    supabase.from('checklist_items').delete().eq('id', itemId).then(({ error }) => { if (error) toast.error('Erro ao excluir item') })
  }, [])

  const updateChecklistItem = useCallback((itemId, updates) => {
    setChecklistItems(prev => {
      const updated = prev.map(item => item.id === itemId ? { ...item, ...updates } : item)
      const newItem = updated.find(i => i.id === itemId)
      if (newItem) supabase.from('checklist_items').update(checklistItemToRow(newItem)).eq('id', itemId).then(({ error }) => { if (error) toast.error('Erro ao atualizar item') })
      return updated
    })
  }, [])

  // ── Songs ──────────────────────────────────────────────────────────────────
  const addSong = useCallback((s) => {
    const newS = { ...s, id: crypto.randomUUID(), createdAt: new Date().toISOString(), playCount: 0, rehearsalCount: 0 }
    setSongs(prev => [...prev, newS])
    supabase.from('songs').insert({ ...songToRow(newS), band_id: bandId }).then(({ error }) => { if (error) toast.error('Erro ao criar música') })
  }, [bandId])

  const updateSong = useCallback((id, u) => {
    setSongs(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, ...u } : s)
      const newS = updated.find(s => s.id === id)
      if (newS) supabase.from('songs').update(songToRow(newS)).eq('id', id).then(({ error }) => { if (error) toast.error('Erro ao atualizar música') })
      return updated
    })
  }, [])

  const deleteSong = useCallback((id) => {
    setSongs(prev => prev.filter(s => s.id !== id))
    setSetlists(prev => prev.map(sl => {
      if (!sl.songs.includes(id)) return sl
      const newSongs = sl.songs.filter(sid => sid !== id)
      supabase.from('setlists').update({ songs: newSongs }).eq('id', sl.id).then(({ error }) => { if (error) toast.error('Erro ao atualizar setlist') })
      return { ...sl, songs: newSongs }
    }))
    supabase.from('songs').delete().eq('id', id).then(({ error }) => { if (error) toast.error('Erro ao excluir música') })
  }, [])

  // ── Setlists ───────────────────────────────────────────────────────────────
  const addSetlist = useCallback((eventId, name) => {
    const newSl = { id: crypto.randomUUID(), eventId, name, songs: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    setSetlists(prev => [...prev, newSl])
    supabase.from('setlists').insert({ ...setlistToRow(newSl), band_id: bandId }).then(({ error }) => { if (error) toast.error('Erro ao criar setlist') })
  }, [bandId])

  const updateSetlist = useCallback((id, u) => {
    setSetlists(prev => {
      const updated = prev.map(sl => sl.id === id ? { ...sl, ...u, updatedAt: new Date().toISOString() } : sl)
      const newSl = updated.find(sl => sl.id === id)
      if (newSl) supabase.from('setlists').update(setlistToRow(newSl)).eq('id', id).then(({ error }) => { if (error) toast.error('Erro ao atualizar setlist') })
      return updated
    })
  }, [])

  const deleteSetlist = useCallback((id) => {
    setSetlists(prev => prev.filter(sl => sl.id !== id))
    supabase.from('setlists').delete().eq('id', id).then(({ error }) => { if (error) toast.error('Erro ao excluir setlist') })
  }, [])

  const addSongToSetlist = useCallback((setlistId, songId) => {
    setSetlists(prev => prev.map(sl => {
      if (sl.id !== setlistId || sl.songs.includes(songId)) return sl
      const newSongs = [...sl.songs, songId]
      supabase.from('setlists').update({ songs: newSongs }).eq('id', setlistId).then(({ error }) => { if (error) toast.error('Erro ao adicionar música') })
      return { ...sl, songs: newSongs, updatedAt: new Date().toISOString() }
    }))
  }, [])

  const removeSongFromSetlist = useCallback((setlistId, songId) => {
    setSetlists(prev => prev.map(sl => {
      if (sl.id !== setlistId) return sl
      const newSongs = sl.songs.filter(id => id !== songId)
      supabase.from('setlists').update({ songs: newSongs }).eq('id', setlistId).then(({ error }) => { if (error) toast.error('Erro ao remover música') })
      return { ...sl, songs: newSongs, updatedAt: new Date().toISOString() }
    }))
  }, [])

  const reorderSetlist = useCallback((setlistId, orderedSongIds) => {
    setSetlists(prev => prev.map(sl => {
      if (sl.id !== setlistId) return sl
      supabase.from('setlists').update({ songs: orderedSongIds }).eq('id', setlistId).then(({ error }) => { if (error) toast.error('Erro ao reordenar setlist') })
      return { ...sl, songs: orderedSongIds, updatedAt: new Date().toISOString() }
    }))
  }, [])

  // ── Equipment ──────────────────────────────────────────────────────────────
  const addEquipment = useCallback((e) => {
    const newE = { ...e, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
    setEquipment(prev => [...prev, newE])
    supabase.from('equipment').insert({ ...equipmentToRow(newE), band_id: bandId }).then(({ error }) => { if (error) toast.error('Erro ao criar equipamento') })
  }, [bandId])

  const updateEquipment = useCallback((id, u) => {
    setEquipment(prev => {
      const updated = prev.map(e => e.id === id ? { ...e, ...u } : e)
      const newE = updated.find(e => e.id === id)
      if (newE) supabase.from('equipment').update(equipmentToRow(newE)).eq('id', id).then(({ error }) => { if (error) toast.error('Erro ao atualizar equipamento') })
      return updated
    })
  }, [])

  const deleteEquipment = useCallback((id) => {
    setEquipment(prev => prev.filter(e => e.id !== id))
    setShowEquipmentData(prev => prev.map(se => {
      if (!se.equipmentIds.includes(id)) return se
      const newIds = se.equipmentIds.filter(eid => eid !== id)
      supabase.from('show_equipment').update({ equipment_ids: newIds }).eq('id', se.id).then(({ error }) => { if (error) toast.error('Erro ao atualizar show equipment') })
      return { ...se, equipmentIds: newIds }
    }))
    supabase.from('equipment').delete().eq('id', id).then(({ error }) => { if (error) toast.error('Erro ao excluir equipamento') })
  }, [])

  // ── Show Equipment ─────────────────────────────────────────────────────────
  const setShowEquipment = useCallback((eventId, equipmentIds, extra = {}) => {
    setShowEquipmentData(prev => {
      const existing = prev.find(se => se.eventId === eventId)
      if (existing) {
        const updated = prev.map(se => se.eventId === eventId ? { ...se, ...extra, equipmentIds } : se)
        const newSe = updated.find(se => se.eventId === eventId)
        supabase.from('show_equipment').update(showEquipmentToRow(newSe)).eq('id', newSe.id).then(({ error }) => { if (error) toast.error('Erro ao atualizar equipamentos') })
        return updated
      }
      const newSe = { id: crypto.randomUUID(), eventId, equipmentIds, checkedAt: null, notes: '', ...extra }
      supabase.from('show_equipment').insert({ ...showEquipmentToRow(newSe), band_id: bandId }).then(({ error }) => { if (error) toast.error('Erro ao criar equipamentos') })
      return [...prev, newSe]
    })
  }, [])

  const getShowEquipment = useCallback((eventId) => showEquipment.find(se => se.eventId === eventId) ?? null, [showEquipment])

  // ── Budgets ───────────────────────────────────────────────────────────────
  const addBudget = useCallback((b) => {
    const now = new Date().toISOString()
    const newBudget = { ...b, id: crypto.randomUUID(), status: b.status || 'Rascunho', createdAt: now, updatedAt: now }
    setBudgets(prev => [...prev, newBudget])
    supabase.from('budgets').insert({ ...budgetToRow(newBudget), band_id: bandId }).then(({ error }) => { if (error) toast.error('Erro ao criar orçamento') })
    return newBudget
  }, [bandId])

  const updateBudget = useCallback((id, u) => {
    setBudgets(prev => {
      const updated = prev.map(b => b.id === id ? { ...b, ...u, updatedAt: new Date().toISOString() } : b)
      const newB = updated.find(b => b.id === id)
      if (newB) supabase.from('budgets').update(budgetToRow(newB)).eq('id', id).then(({ error }) => { if (error) toast.error('Erro ao atualizar orçamento') })
      return updated
    })
  }, [])

  const deleteBudget = useCallback((id) => {
    setBudgets(prev => prev.filter(b => b.id !== id))
    supabase.from('budgets').delete().eq('id', id).then(({ error }) => { if (error) toast.error('Erro ao excluir orçamento') })
  }, [])

  const approveBudget = useCallback((id) => {
    let approved = null
    setBudgets(prev => {
      const updated = prev.map(b => {
        if (b.id === id) { approved = { ...b, status: 'Aprovado', updatedAt: new Date().toISOString() }; return approved }
        return b
      })
      if (approved) supabase.from('budgets').update(budgetToRow(approved)).eq('id', id).then(({ error }) => { if (error) toast.error('Erro ao aprovar orçamento') })
      return updated
    })
    return approved
  }, [])

  // ── Rehearsals ─────────────────────────────────────────────────────────────
  const addRehearsal = useCallback((r) => {
    const newR = { ...r, id: crypto.randomUUID(), attendedMembers: r.attendedMembers || [], status: r.status || 'Agendado', createdAt: new Date().toISOString() }
    setRehearsals(prev => [...prev, newR])
    supabase.from('rehearsals').insert({ ...rehearsalToRow(newR), band_id: bandId }).then(({ error }) => { if (error) toast.error('Erro ao criar ensaio') })
  }, [bandId])

  const updateRehearsal = useCallback((id, u) => {
    setRehearsals(prev => {
      const updated = prev.map(r => r.id === id ? { ...r, ...u } : r)
      const newR = updated.find(r => r.id === id)
      if (newR) supabase.from('rehearsals').update(rehearsalToRow(newR)).eq('id', id).then(({ error }) => { if (error) toast.error('Erro ao atualizar ensaio') })
      return updated
    })
  }, [])

  const deleteRehearsal = useCallback((id) => {
    setRehearsals(prev => prev.filter(r => r.id !== id))
    supabase.from('rehearsals').delete().eq('id', id).then(({ error }) => { if (error) toast.error('Erro ao excluir ensaio') })
  }, [])

  const registerAttendance = useCallback((rehearsalId, memberIds) => {
    const target = rehearsals.find(r => r.id === rehearsalId)
    const wasNotRealizado = target?.status !== 'Realizado'
    const rehearsalSongs = target?.songs || []
    setRehearsals(prev => {
      const updated = prev.map(r => r.id === rehearsalId ? { ...r, attendedMembers: memberIds, status: 'Realizado' } : r)
      const newR = updated.find(r => r.id === rehearsalId)
      if (newR) supabase.from('rehearsals').update(rehearsalToRow(newR)).eq('id', rehearsalId).then(({ error }) => { if (error) toast.error('Erro ao registrar presença') })
      return updated
    })
    if (wasNotRealizado && rehearsalSongs.length > 0) {
      setSongs(prev => {
        const updated = prev.map(s => rehearsalSongs.includes(s.id) ? { ...s, rehearsalCount: (s.rehearsalCount ?? 0) + 1 } : s)
        updated.filter(s => rehearsalSongs.includes(s.id)).forEach(s => {
          supabase.from('songs').update({ rehearsal_count: s.rehearsalCount }).eq('id', s.id).then(({ error }) => { if (error) toast.error('Erro ao atualizar contagem') })
        })
        return updated
      })
    }
  }, [rehearsals])

  // ── Collaborators ──────────────────────────────────────────────────────────
  const addCollaborator = useCallback(async (c) => {
    const newC = { ...c, id: c.id || crypto.randomUUID(), avatar: getInitials(c.name), createdAt: new Date().toISOString() }
    setCollaborators(prev => [...prev, newC])
    const { error } = await supabase.from('collaborators').insert({ ...collaboratorToRow(newC), band_id: bandId })
    if (error) { console.error('Erro ao criar colaborador:', error); toast.error('Erro ao criar colaborador'); return null }
    return newC
  }, [bandId])

  const updateCollaborator = useCallback((id, u) => {
    setCollaborators(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, ...u, avatar: getInitials(u.name ?? c.name) } : c)
      const newC = updated.find(c => c.id === id)
      if (newC) supabase.from('collaborators').update(collaboratorToRow(newC)).eq('id', id).then(({ error }) => { if (error) toast.error('Erro ao atualizar colaborador') })
      return updated
    })
  }, [])

  const deleteCollaborator = useCallback((id) => {
    setCollaborators(prev => prev.filter(c => c.id !== id))
    setSession(prev => (prev?.type === 'collaborator' && prev.id === id ? { type: 'chief' } : prev))
    supabase.from('collaborators').delete().eq('id', id).then(({ error }) => { if (error) toast.error('Erro ao excluir colaborador') })
  }, [])

  // ── Session / Auth ─────────────────────────────────────────────────────────
  const logout = useCallback(() => setSession(null), [])

  const login = useCallback((email, pin) => {
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) { setSession({ type: 'chief' }); return { ok: true } }
    if (companyProfile.email && cleanEmail === companyProfile.email.trim().toLowerCase()) { setSession({ type: 'chief' }); return { ok: true } }
    const collab = collaborators.find(c => c.email?.trim().toLowerCase() === cleanEmail)
    if (collab) {
      if (!collab.pin || pin === collab.pin) { setSession({ type: 'collaborator', id: collab.id }); return { ok: true } }
      return { ok: false, message: 'PIN incorreto' }
    }
    return { ok: false, message: 'E-mail não reconhecido. Contate o administrador.' }
  }, [companyProfile, collaborators])

  const setActiveCollaborator = useCallback((id) => setSession({ type: 'collaborator', id, isSimulation: true }), [])

  const switchToChief = useCallback(() => {
    if (session?.isSimulation) setSession({ type: 'chief' })
    else logout()
  }, [session, logout])

  // ── Theme / Prefs ──────────────────────────────────────────────────────────
  const toggleTheme = useCallback(() => setTheme(prev => (prev === 'dark' ? 'light' : 'dark')), [])
  const updateNotificationPrefs = useCallback((u) => setNotificationPrefs(prev => ({ ...prev, ...u })), [])

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500">Carregando dados...</p>
        </div>
      </div>
    )
  }

  return (
    <StoreContext.Provider value={{
      events, members, payments, expenses, stops, favoriteStops, contractors,
      companyProfile, contractReceipts, checklistItems,
      addEvent, updateEvent, deleteEvent,
      addMember, updateMember, deleteMember,
      getPayEntry, setPayEntry, addMemberPartialPayment, removeMemberPartialPayment,
      addExpense, updateExpense, deleteExpense,
      addStop, updateStop, deleteStop,
      addFavoriteStop, deleteFavoriteStop,
      addContractor, updateContractor, deleteContractor,
      updateCompanyProfile,
      getContractReceipt, setContractReceipt, addPartialPayment, removePartialPayment,
      initChecklist, toggleChecklistItem, addChecklistItem, deleteChecklistItem, updateChecklistItem,
      songs, setlists,
      addSong, updateSong, deleteSong,
      addSetlist, updateSetlist, deleteSetlist,
      addSongToSetlist, removeSongFromSetlist, reorderSetlist,
      equipment, showEquipment,
      addEquipment, updateEquipment, deleteEquipment,
      setShowEquipment, getShowEquipment,
      budgets,
      addBudget, updateBudget, deleteBudget, approveBudget,
      rehearsals,
      addRehearsal, updateRehearsal, deleteRehearsal, registerAttendance,
      collaborators, activeCollaborator, session,
      addCollaborator, updateCollaborator, deleteCollaborator,
      setActiveCollaborator, switchToChief, login, logout,
      theme, toggleTheme,
      notificationPrefs, updateNotificationPrefs,
      reloadStore,
    }}>
      {children}
    </StoreContext.Provider>
  )
}

export const useStore = () => useContext(StoreContext)
