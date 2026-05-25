export const pad = (n) => String(n).padStart(2, '0')

export const fmtCurrency = (v) =>
  'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const fmtCurrencyShort = (v) => {
  const n = Number(v || 0)
  return n >= 1000
    ? 'R$' + (n / 1000).toFixed(1).replace('.', ',') + 'k'
    : fmtCurrency(n)
}

export const parseBRL = (str) => {
  if (!str) return 0
  return parseFloat(String(str).replace(/\./g, '').replace(',', '.')) || 0
}

export const fmtDate = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T12:00:00')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

export const fmtDateShort = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T12:00:00')
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${d.getDate()} ${months[d.getMonth()]}`
}

export const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
export const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export const getInitials = (name) =>
  (name || '').trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase() || '?'

export const trunc = (s, n) => (s && s.length > n ? s.slice(0, n) + '…' : s || '')
