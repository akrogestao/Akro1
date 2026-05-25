import { useState, useMemo, useCallback } from 'react'
import { AlertTriangle, DollarSign, ClipboardList, UserX, Clipboard, FileWarning, UserMinus, TrendingUp, TrendingDown, AlertOctagon, PartyPopper, CheckCircle, BarChart2, Cake, Calendar, FileX } from 'lucide-react'
import { fmtCurrency, MONTHS } from '@/lib/format'

function loadReadIds() {
  try {
    const v = localStorage.getItem('bm_notifications_read')
    return v ? new Set(JSON.parse(v)) : new Set()
  } catch { return new Set() }
}

function saveReadIds(ids) {
  try { localStorage.setItem('bm_notifications_read', JSON.stringify([...ids])) } catch {}
}

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

export function useNotifications({ events, members, payments, contractors, checklistItems, expenses = [], rehearsals = [] }) {
  const [readIds, setReadIds] = useState(loadReadIds)

  const rawNotifications = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const daysUntil = (dateStr) => {
      const d = new Date(dateStr + 'T00:00:00')
      return Math.round((d - today) / 86_400_000)
    }

    const list = []

    // ── HIGH: checklist_urgent — events in next 0-3 days with pending items ──
    events.forEach(ev => {
      const days = daysUntil(ev.date)
      if (days < 0 || days > 3) return
      const items   = checklistItems.filter(i => i.eventId === ev.id)
      const pending = items.filter(i => !i.done).length
      if (items.length > 0 && pending > 0) {
        const when = days === 0 ? 'hoje' : days === 1 ? 'amanhã' : `em ${days} dias`
        list.push({
          id: `checklist_urgent_${ev.id}`,
          priority: 'high',
          Icon: AlertTriangle,
          title: 'Checklist urgente',
          description: `${ev.name} — ${pending} tarefa${pending !== 1 ? 's' : ''} pendente${pending !== 1 ? 's' : ''} · ${when}`,
          navTo: 'checklist',
          days,
        })
      }
    })

    // ── HIGH: payment_overdue — one notification per event with pending cachês ──
    events.forEach(ev => {
      if (daysUntil(ev.date) >= 0) return
      const pendingCount = (ev.members || []).filter(memId => {
        const m = members.find(x => x.id === memId)
        if (!m) return false
        const entry = payments[ev.id]?.[m.id] ?? {}
        if (entry.paid) return false
        const base = m.cache ?? 0
        const val  = entry.customValue != null ? entry.customValue : (entry.doubled ? base * 2 : base)
        const done = entry.partial ? (entry.partialAmount ?? 0) : 0
        return val - done > 0
      }).length
      if (pendingCount === 0) return
      const d   = new Date(ev.date + 'T12:00:00')
      const dia = String(d.getDate()).padStart(2, '0')
      const mes = String(d.getMonth() + 1).padStart(2, '0')
      list.push({
        id: `payment_overdue_${ev.id}`,
        priority: 'high',
        Icon: DollarSign,
        title: `${ev.name} com pagamentos em aberto`,
        description: `O show aconteceu em ${dia}/${mes} e ${pendingCount} pagamento${pendingCount !== 1 ? 's' : ''} ainda segue${pendingCount !== 1 ? 'm' : ''} pendente${pendingCount !== 1 ? 's' : ''}. Deseja resolver isso?`,
        navTo: 'logistics',
        days: daysUntil(ev.date),
      })
    })

    // ── HIGH: contract_no_value — events with no contract value set ──
    events.forEach(ev => {
      if (ev.value && ev.value > 0) return
      list.push({
        id: `contract_no_value_${ev.id}`,
        priority: 'high',
        Icon: FileWarning,
        title: `${ev.name} — sem valor cadastrado`,
        description: 'Esse show está confirmado mas não tem valor de contrato registrado. Quanto foi fechado?',
        navTo: 'contracts',
        days: daysUntil(ev.date),
      })
    })

    // ── HIGH: show_no_members — future events with no members assigned ──
    events.forEach(ev => {
      if (daysUntil(ev.date) < 0) return
      if (ev.members && ev.members.length > 0) return
      list.push({
        id: `show_no_members_${ev.id}`,
        priority: 'high',
        Icon: UserMinus,
        title: `${ev.name} — sem músicos escalados`,
        description: 'O show está chegando e nenhum membro foi escalado ainda. Quem vai tocar?',
        navTo: 'contracts',
        days: daysUntil(ev.date),
      })
    })

    // ── HIGH: expense_anomaly — individual expense > 2× 3-month average ──
    ;(() => {
      const threeMonthsAgo = new Date(today)
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
      const recentExps = expenses.filter(exp => {
        const ev = events.find(e => e.id === exp.eventId)
        return ev && new Date(ev.date + 'T12:00:00') >= threeMonthsAgo
      })
      if (!recentExps.length) return
      const avg = recentExps.reduce((s, e) => s + (e.amount || 0), 0) / recentExps.length
      if (avg <= 0) return
      expenses.forEach(exp => {
        if ((exp.amount || 0) <= avg * 2) return
        const ev = events.find(e => e.id === exp.eventId)
        if (!ev) return
        list.push({
          id: `expense_anomaly_${exp.id}`,
          priority: 'high',
          Icon: TrendingUp,
          title: 'Despesa fora do padrão',
          description: `Uma despesa de ${fmtCurrency(exp.amount)} foi lançada em ${ev.name} — bem acima da média. Foi isso mesmo?`,
          navTo: 'logistics',
          days: null,
        })
      })
    })()

    // ── HIGH: negative_month — current month net profit < 0 ──
    ;(() => {
      const curMonthEvs = events.filter(ev => {
        const d = new Date(ev.date + 'T12:00:00')
        return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth()
      })
      const revenue = curMonthEvs.reduce((s, ev) => s + (ev.value || 0), 0)
      let caches = 0
      curMonthEvs.forEach(ev => {
        ;(ev.members || []).forEach(memId => {
          const m = members.find(x => x.id === memId)
          if (!m) return
          const entry = payments[ev.id]?.[m.id] ?? {}
          const base  = m.cache ?? 0
          caches += entry.customValue != null ? entry.customValue : (entry.doubled ? base * 2 : base)
        })
      })
      const monthExpenses = expenses
        .filter(exp => curMonthEvs.some(ev => ev.id === exp.eventId))
        .reduce((s, e) => s + (e.amount || 0), 0)
      const net = revenue - caches - monthExpenses
      if (net >= 0) return
      const yyyymm = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`
      list.push({
        id: `negative_month_${yyyymm}`,
        priority: 'high',
        Icon: TrendingDown,
        title: 'Mês no vermelho',
        description: `O balanço de ${MONTHS[today.getMonth()]} está negativo em ${fmtCurrency(Math.abs(net))}. Vale revisar as despesas e cachês lançados.`,
        navTo: 'reports',
        days: null,
      })
    })()

    // ── HIGH: cancelled_with_payments — cancelled events with pay entries ──
    events.forEach(ev => {
      const isCancelled = ev.status === 'cancelado' || ev.status === 'Cancelado' || ev.cancelled === true
      if (!isCancelled) return
      const membersWithPayments = (ev.members || []).filter(memId => {
        const entry = payments[ev.id]?.[memId]
        return entry && (entry.paid || entry.partial || entry.customValue != null)
      })
      if (!membersWithPayments.length) return
      list.push({
        id: `cancelled_with_payments_${ev.id}`,
        priority: 'high',
        Icon: AlertOctagon,
        title: `${ev.name} — cancelado com cachês lançados`,
        description: `Esse show foi cancelado mas ainda tem cachês registrados para ${membersWithPayments.length} membro${membersWithPayments.length !== 1 ? 's' : ''}. Precisa estornar?`,
        navTo: 'logistics',
        days: null,
      })
    })

    // ── MEDIUM: checklist_pending — events 4-7 days with pending items ──
    events.forEach(ev => {
      const days = daysUntil(ev.date)
      if (days < 4 || days > 7) return
      const items   = checklistItems.filter(i => i.eventId === ev.id)
      const pending = items.filter(i => !i.done).length
      if (items.length > 0 && pending > 0)
        list.push({
          id: `checklist_pending_${ev.id}`,
          priority: 'medium',
          Icon: ClipboardList,
          title: 'Checklist incompleto',
          description: `${ev.name} — ${pending} tarefa${pending !== 1 ? 's' : ''} · em ${days} dias`,
          navTo: 'checklist',
          days,
        })
    })

    // ── MEDIUM: contractor_inactive — no show for > 90 days ──
    contractors.forEach(c => {
      const linked = events.filter(ev => (ev.contractorIds || []).includes(c.id))
      if (!linked.length) return
      const lastDate = linked.reduce((l, ev) => ev.date > l ? ev.date : l, '')
      const days = daysUntil(lastDate)
      if (days < -90)
        list.push({
          id: `contractor_inactive_${c.id}`,
          priority: 'medium',
          Icon: UserX,
          title: 'Contratante inativo',
          description: `${c.name} — sem shows há ${Math.abs(days)} dias`,
          navTo: 'contractors',
          days,
        })
    })

    // ── MEDIUM: show_no_checklist_complete — all checklist items done ──
    events.forEach(ev => {
      const items = checklistItems.filter(i => i.eventId === ev.id)
      if (!items.length || !items.every(i => i.done)) return
      list.push({
        id: `show_complete_${ev.id}`,
        priority: 'medium',
        Icon: PartyPopper,
        title: `${ev.name} — tudo pronto!`,
        description: `Checklist 100% concluído. A produção de ${ev.name} está redonda — bora arrasar!`,
        navTo: 'checklist',
        days: daysUntil(ev.date),
      })
    })

    // ── MEDIUM: collaborator_task_done — checklist item done by collaborator ──
    checklistItems
      .filter(i => i.done && i.owner === 'collaborator')
      .forEach(item => {
        const ev = events.find(e => e.id === item.eventId)
        if (!ev) return
        list.push({
          id: `colab_task_${item.id}`,
          priority: 'medium',
          Icon: CheckCircle,
          title: 'Tarefa concluída pelo produtor',
          description: `"${item.text}" foi marcado como concluído. Checklist de ${ev.name} avançando bem.`,
          navTo: 'checklist',
          days: daysUntil(ev.date),
        })
      })

    // ── MEDIUM: below_average_revenue — current month < historical avg - 30% ──
    ;(() => {
      const monthRevenues = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(today.getFullYear(), today.getMonth() - (i + 1), 1)
        return events
          .filter(ev => {
            const evd = new Date(ev.date + 'T12:00:00')
            return evd.getFullYear() === d.getFullYear() && evd.getMonth() === d.getMonth()
          })
          .reduce((s, ev) => s + (ev.value || 0), 0)
      })
      const historicalAvg = monthRevenues.reduce((s, v) => s + v, 0) / 6
      if (historicalAvg <= 0) return
      const curRevenue = events
        .filter(ev => {
          const d = new Date(ev.date + 'T12:00:00')
          return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth()
        })
        .reduce((s, ev) => s + (ev.value || 0), 0)
      const drop = (historicalAvg - curRevenue) / historicalAvg
      if (drop <= 0.3) return
      const pct   = Math.round(drop * 100)
      const yyyymm = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`
      list.push({
        id: `below_avg_${yyyymm}`,
        priority: 'medium',
        Icon: BarChart2,
        title: 'Faturamento abaixo da média',
        description: `O faturamento de ${MONTHS[today.getMonth()]} está ${pct}% abaixo da sua média histórica. Mês mais fraco ou agenda ainda incompleta?`,
        navTo: 'reports',
        days: null,
      })
    })()

    // ── MEDIUM: member_birthday — birthday in next 7 days ──
    members.forEach(m => {
      if (!m.birthdate) return
      let day, month
      if (typeof m.birthdate === 'string') {
        if (m.birthdate.includes('-')) {
          const p = m.birthdate.split('-')
          day = parseInt(p[2], 10); month = parseInt(p[1], 10) - 1
        } else if (m.birthdate.includes('/')) {
          const p = m.birthdate.split('/')
          day = parseInt(p[0], 10); month = parseInt(p[1], 10) - 1
        } else return
      } else return
      if (isNaN(day) || isNaN(month)) return
      for (let i = 0; i <= 7; i++) {
        const check = new Date(today)
        check.setDate(check.getDate() + i)
        if (check.getDate() === day && check.getMonth() === month) {
          list.push({
            id: `birthday_${m.id}`,
            priority: 'medium',
            Icon: Cake,
            title: `${m.name} faz aniversário essa semana`,
            description: 'Uma boa oportunidade para reconhecer quem faz a banda acontecer.',
            navTo: 'members',
            days: i,
          })
          break
        }
      }
    })

    // ── LOW: no_checklist — events in next 0-15 days with zero items ──
    events.forEach(ev => {
      const days = daysUntil(ev.date)
      if (days < 0 || days > 15) return
      const items = checklistItems.filter(i => i.eventId === ev.id)
      if (items.length === 0) {
        const when = days === 0 ? 'hoje' : days === 1 ? 'amanhã' : `em ${days} dias`
        list.push({
          id: `no_checklist_${ev.id}`,
          priority: 'low',
          Icon: Clipboard,
          title: 'Sem checklist',
          description: `${ev.name} — ${when}, nenhuma tarefa criada`,
          navTo: 'checklist',
          days,
        })
      }
    })

    // ── LOW: inactive_member — member with no events, registered > 30 days ago ──
    const thirtyDaysAgoMs = Date.now() - 30 * 86_400_000
    members.forEach(m => {
      // IDs > 1e12 are timestamps; skip if created < 30 days ago
      if (m.id > 1e12 && m.id > thirtyDaysAgoMs) return
      if (events.some(ev => (ev.members || []).includes(m.id))) return
      list.push({
        id: `inactive_member_${m.id}`,
        priority: 'low',
        Icon: UserX,
        title: `${m.name} — sem shows recentes`,
        description: `${m.name} está cadastrado há mais de 30 dias mas não aparece em nenhum show. Ainda faz parte da banda?`,
        navTo: 'members',
        days: null,
      })
    })

    // ── LOW: contractor_no_show — contractor with no linked events at all ──
    contractors.forEach(c => {
      if (events.some(ev => (ev.contractorIds || []).includes(c.id))) return
      list.push({
        id: `contractor_no_show_${c.id}`,
        priority: 'low',
        Icon: Calendar,
        title: `${c.name} — sem shows agendados`,
        description: `${c.name} foi cadastrado mas ainda não tem nenhum show agendado. Vale entrar em contato?`,
        navTo: 'contractors',
        days: null,
      })
    })

    // ── LOW: contractor_no_contract — event with contractor but no value ──
    events.forEach(ev => {
      if (!ev.contractorIds || !ev.contractorIds.length) return
      if (ev.value && ev.value > 0) return
      const contractorName = contractors.find(c => ev.contractorIds.includes(c.id))?.name || 'o contratante'
      list.push({
        id: `contractor_no_contract_${ev.id}`,
        priority: 'low',
        Icon: FileX,
        title: `${ev.name} — sem contrato formalizado`,
        description: `O show com ${contractorName} está agendado mas não tem contrato registrado. Tá só no verbal?`,
        navTo: 'contracts',
        days: daysUntil(ev.date),
      })
    })

    // ── MEDIUM: rehearsal_no_attendance — past rehearsal with no attendance recorded ──
    rehearsals.forEach(r => {
      if ((r.attendedMembers || []).length > 0) return
      if (!r.date) return
      const dt = new Date(r.date + 'T' + (r.time || '23:59') + ':00')
      if (dt >= new Date()) return
      const d   = new Date(r.date + 'T12:00:00')
      const dia = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
      list.push({
        id: `rehearsal_no_attendance_${r.id}`,
        priority: 'medium',
        Icon: ClipboardList,
        title: r.address || r.location || `Ensaio de ${dia}`,
        description: `O ensaio de ${dia} já aconteceu mas a presença ainda não foi registrada. Quem estava lá?`,
        navTo: 'rehearsals',
        days: null,
      })
    })

    // Sort: priority first, then by date proximity (null days go last)
    return list.sort((a, b) => {
      const pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      if (pd !== 0) return pd
      if (a.days === null && b.days === null) return 0
      if (a.days === null) return 1
      if (b.days === null) return -1
      return Math.abs(a.days) - Math.abs(b.days)
    })
  }, [events, members, payments, contractors, checklistItems, expenses, rehearsals])

  const notifications = useMemo(() =>
    rawNotifications.map(n => ({ ...n, read: readIds.has(n.id) })),
  [rawNotifications, readIds])

  const unreadCount = useMemo(() =>
    notifications.filter(n => !n.read).length,
  [notifications])

  const markAsRead = useCallback((id) => {
    setReadIds(prev => {
      const next = new Set(prev)
      next.add(id)
      saveReadIds(next)
      return next
    })
  }, [])

  const markAllAsRead = useCallback(() => {
    setReadIds(prev => {
      const next = new Set(prev)
      rawNotifications.forEach(n => next.add(n.id))
      saveReadIds(next)
      return next
    })
  }, [rawNotifications])

  return { notifications, unreadCount, markAsRead, markAllAsRead }
}
