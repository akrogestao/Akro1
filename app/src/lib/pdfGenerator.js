import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { fmtCurrency, fmtDate, MONTHS } from './format'

// ── Palette (Akro identity) ────────────────────────────────────────────────
const BG_DARK   = [8,   9,   9  ]
const ORANGE    = [249, 115, 22 ]
const BODY_DK   = [20,  20,  20 ]
const LABEL     = [80,  80,  80 ]
const LIGHT     = [210, 205, 202]
const WHITE     = [255, 255, 255]
const OFF_WH    = [220, 220, 220]
const DIM_TEXT  = [155, 155, 155]
const LIGHT_BG  = [244, 241, 236]
const MUTED     = [120, 120, 120]
const GREEN     = [22,  163, 74 ]
const RED       = [220, 38,  38 ]
const BG_GREEN  = [220, 252, 231]
const BG_RED    = [254, 226, 226]
const BG_ORANGE = [255, 237, 213]

const HEADER_H  = 28
const FOOTER_H  = 16
const MARGIN    = 14
const PAGE_W    = 210
const PAGE_H    = 297
const CONTENT_W = PAGE_W - MARGIN * 2
const BOTTOM    = PAGE_H - FOOTER_H - 12

const MONTHS_LONG = MONTHS

// ── Brand color resolution ─────────────────────────────────────────────────
let _colorBase   = BG_DARK
let _colorAccent = ORANGE

function hexToRgb(hex) {
  if (!hex) return null
  const h = hex.replace('#', '')
  if (h.length !== 6) return null
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]
}

function resolveColors(profile) {
  _colorBase   = hexToRgb(profile?.brandColorBase)   || BG_DARK
  _colorAccent = hexToRgb(profile?.brandColorAccent) || ORANGE
}

async function getImgDims(src) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload  = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => resolve({ w: 1, h: 1 })
    img.src = src
  })
}

// ── Font loading (module-level cache shared with pdf.js) ───────────────────
const fontCache = new Map()

async function loadFontBase64(url) {
  if (fontCache.has(url)) return fontCache.get(url)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Font fetch failed (${res.status}): ${url}`)
  const buf   = await res.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  const b64 = btoa(bin)
  fontCache.set(url, b64)
  return b64
}

const FONT_URLS = {
  barlowCondensedBold: 'https://raw.githubusercontent.com/google/fonts/main/ofl/barlowcondensed/BarlowCondensed-Bold.ttf',
  barlowRegular:       'https://raw.githubusercontent.com/google/fonts/main/ofl/barlow/Barlow-Regular.ttf',
  barlowBold:          'https://raw.githubusercontent.com/google/fonts/main/ofl/barlow/Barlow-Bold.ttf',
  jetbrainsMonoReg:    'https://raw.githubusercontent.com/google/fonts/main/ofl/jetbrainsmono/static/JetBrainsMono-Regular.ttf',
  jetbrainsMonoBold:   'https://raw.githubusercontent.com/google/fonts/main/ofl/jetbrainsmono/static/JetBrainsMono-Bold.ttf',
}

async function registerFonts(doc) {
  const [bcR, brR, bbR, jmrR, jmbR] = await Promise.allSettled([
    loadFontBase64(FONT_URLS.barlowCondensedBold),
    loadFontBase64(FONT_URLS.barlowRegular),
    loadFontBase64(FONT_URLS.barlowBold),
    loadFontBase64(FONT_URLS.jetbrainsMonoReg),
    loadFontBase64(FONT_URLS.jetbrainsMonoBold),
  ])
  const reg = (result, file, name, style) => {
    if (result.status === 'fulfilled') {
      doc.addFileToVFS(file, result.value)
      doc.addFont(file, name, style)
      return true
    }
    return false
  }
  const hasBC  = reg(bcR,  'BarlowCondensed-Bold.ttf',  'BarlowCondensed', 'bold')
  const hasBR  = reg(brR,  'Barlow-Regular.ttf',         'Barlow',          'normal')
  const hasBB  = reg(bbR,  'Barlow-Bold.ttf',             'Barlow',          'bold')
  const hasJMR = reg(jmrR, 'JetBrainsMono-Regular.ttf',  'JetBrainsMono',   'normal')
  const hasJMB = reg(jmbR, 'JetBrainsMono-Bold.ttf',      'JetBrainsMono',   'bold')
  return {
    condensed: hasBC            ? 'BarlowCondensed' : 'helvetica',
    body:      hasBR || hasBB   ? 'Barlow'          : 'helvetica',
    mono:      hasJMR || hasJMB ? 'JetBrainsMono'   : 'courier',
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtCpf(cpf) {
  if (!cpf) return '—'
  const d = cpf.replace(/\D/g, '')
  if (d.length === 11) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
  return cpf
}

function fmtPhone(phone) {
  if (!phone) return null
  const d = phone.replace(/\D/g, '').slice(0, 11)
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return phone
}

function today() { return new Date().toLocaleDateString('pt-BR') }

function fmtIsoDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function calcEntryValue(entry, memberCache) {
  const base = memberCache ?? 0
  return entry.customValue != null ? entry.customValue : (entry.doubled ? base * 2 : base)
}

function checkPageBreak(doc, y, needed = 25) {
  if (y + needed > BOTTOM) { doc.addPage(); return MARGIN + 5 }
  return y
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

// ── Akro logo mark ─────────────────────────────────────────────────────────
function drawAkroMark(doc, xOff, yOff, markH) {
  const s  = markH / 33
  const ax = xOff + 18 * s,   ay = yOff + 0.5  * s
  const bx = xOff + 35.5 * s, by = yOff + 32.5 * s
  const cx = xOff + 0.5  * s, cy = yOff + 32.5 * s

  doc.setFillColor(..._colorAccent)
  doc.setDrawColor(..._colorAccent)
  doc.setLineWidth(0.1)
  doc.lines([[bx - ax, by - ay], [cx - bx, cy - by]], ax, ay, [1, 1], 'F', true)

  doc.setDrawColor(28, 25, 23)
  doc.setLineWidth(2.2 * (markH / 18))
  doc.setLineCap(1)
  doc.setLineJoin(1)
  doc.line(xOff +  9 * s, yOff + 26   * s, xOff + 18 * s, yOff + 19 * s)
  doc.line(xOff + 18 * s, yOff + 19   * s, xOff + 27 * s, yOff + 26 * s)
  doc.line(xOff +  6 * s, yOff + 31.5 * s, xOff + 18 * s, yOff + 24 * s)
  doc.line(xOff + 18 * s, yOff + 24   * s, xOff + 30 * s, yOff + 31.5 * s)
  doc.setLineCap(0)
  doc.setLineJoin(0)
  doc.setLineWidth(0.4)
  return xOff + 35.5 * s
}

// ── Header (dark Akro, page 1) ─────────────────────────────────────────────
function _drawDefaultHeaderContent(doc, docTitle, fonts) {
  const markH     = 18
  const markRight = drawAkroMark(doc, 10, (HEADER_H - markH) / 2, markH)
  const textX     = markRight + 3
  doc.setTextColor(...WHITE)
  doc.setFont(fonts.condensed, 'bold').setFontSize(17)
  doc.text('KRO', textX, 15.5)
  doc.setFontSize(5.5).setTextColor(...OFF_WH)
  doc.text('GESTÃO MUSICAL', textX, 22.5)
  doc.setFont(fonts.body, 'normal').setFontSize(7).setTextColor(...OFF_WH)
  doc.text(docTitle, 196, 14, { align: 'right' })
}

async function drawHeader(doc, docTitle, fonts, companyProfile) {
  resolveColors(companyProfile)
  const logo = companyProfile?.logoBase64 || null

  doc.setFillColor(..._colorBase)
  doc.rect(0, 0, PAGE_W, HEADER_H, 'F')

  if (logo) {
    try {
      const { w: imgW, h: imgH } = await getImgDims(logo)
      const maxH = HEADER_H - 6, maxW = 30
      const ratio = imgW / imgH
      const dH = ratio >= maxW / maxH ? maxW / ratio : maxH
      const dW = dH * ratio
      const lx = MARGIN, ly = (HEADER_H - dH) / 2
      const fmt = /image\/jpe?g/.test(logo) ? 'JPEG' : 'PNG'
      doc.addImage(logo, fmt, lx, ly, dW, dH)
      const cx = lx + dW + 4 + (196 - lx - dW - 4) / 2
      doc.setTextColor(...WHITE)
      doc.setFont(fonts.condensed, 'bold').setFontSize(13)
      doc.text(companyProfile?.companyName || 'Akro', cx, 12, { align: 'center' })
      doc.setFont(fonts.body, 'normal').setFontSize(7).setTextColor(...OFF_WH)
      doc.text(docTitle, cx, 21, { align: 'center' })
    } catch (err) {
      console.error('[drawHeader logo]', err)
      _drawDefaultHeaderContent(doc, docTitle, fonts)
    }
  } else {
    _drawDefaultHeaderContent(doc, docTitle, fonts)
  }

  return HEADER_H + 8
}

// ── Footer (dark Akro, all pages, with page number) ────────────────────────
function drawFooterOnPage(doc, profile, fonts, pageNum, totalPages) {
  const fy = PAGE_H - FOOTER_H
  doc.setFillColor(..._colorBase)
  doc.rect(0, fy, PAGE_W, FOOTER_H, 'F')

  // Page number — top-right of footer
  doc.setFont(fonts.mono, 'normal')
  doc.setFontSize(5.5)
  doc.setTextColor(...DIM_TEXT)
  doc.text(`${pageNum}/${totalPages}`, 196, fy + 4.5, { align: 'right' })

  const { companyName, cnpj, address, city, state, phone, email } = profile || {}
  const cols = [
    { bold: companyName || null, normal: cnpj ? `CNPJ: ${cnpj}` : null },
    { bold: address     || null, normal: (city || state) ? [city, state].filter(Boolean).join(', ') : null },
    { bold: fmtPhone(phone),     normal: email || null },
  ]
  ;[14, 80, 146].forEach((x, i) => {
    const { bold, normal } = cols[i]
    if (!bold && !normal) return
    let ry = fy + 6.5
    if (bold) {
      doc.setFont(fonts.body, 'bold')
      doc.setFontSize(6.5)
      doc.setTextColor(...OFF_WH)
      doc.text(bold, x, ry)
      ry += 5
    }
    if (normal) {
      doc.setFont(fonts.body, 'normal')
      doc.setFontSize(5.5)
      doc.setTextColor(...DIM_TEXT)
      doc.text(normal, x, ry)
    }
  })
}

function applyFooters(doc, profile, fonts) {
  const total = doc.internal.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    drawFooterOnPage(doc, profile, fonts, i, total)
  }
}

// ── Shared drawing utilities ───────────────────────────────────────────────
function drawSectionTitle(doc, y, title, fonts) {
  doc.setFont(fonts.condensed, 'bold')
  doc.setFontSize(10)
  doc.setTextColor(..._colorAccent)
  doc.text(title.toUpperCase(), MARGIN, y)
  doc.setDrawColor(..._colorAccent)
  doc.setLineWidth(0.5)
  doc.line(MARGIN, y + 2, PAGE_W - MARGIN, y + 2)
  return y + 9
}

function drawHighlightBlock(doc, y, items, variant, fonts) {
  const bg     = variant === 'green' ? BG_GREEN : variant === 'red' ? BG_RED : BG_ORANGE
  const accent = variant === 'green' ? GREEN    : variant === 'red' ? RED    : _colorAccent
  const h      = 9 + items.length * 7
  doc.setFillColor(...bg)
  doc.roundedRect(MARGIN, y, CONTENT_W, h, 2, 2, 'F')
  doc.setFillColor(...accent)
  doc.rect(MARGIN, y, 2.5, h, 'F')
  let ty = y + 9
  items.forEach(({ label, value, bold }) => {
    if (label) {
      doc.setFont(fonts.body, bold ? 'bold' : 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...BODY_DK)
      doc.text(label, MARGIN + 7, ty)
      doc.setFont(fonts.mono, bold ? 'bold' : 'normal')
      doc.text(value ?? '', PAGE_W - MARGIN, ty, { align: 'right' })
    } else {
      doc.setFont(fonts.condensed, 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...accent)
      doc.text(value ?? '', PAGE_W / 2, ty, { align: 'center' })
    }
    ty += 7
  })
  return y + h + 5
}

function drawInfoRow(doc, y, label, value, fonts) {
  doc.setFont(fonts.body, 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...LABEL)
  doc.text(label.toUpperCase(), MARGIN, y)
  doc.setFont(fonts.body, 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...BODY_DK)
  doc.text(String(value || '—'), MARGIN, y + 5)
  return y + 11
}

function drawSignatureBlock(doc, member, companyProfile, fonts) {
  const sigY   = PAGE_H - FOOTER_H - 38
  const cLabel = companyProfile?.companyName || 'Responsável'
  const cCnpj  = companyProfile?.cnpj || null
  doc.setDrawColor(...LIGHT)
  doc.setLineWidth(0.5)
  doc.line(14, sigY, 90, sigY)
  doc.line(120, sigY, 196, sigY)
  doc.setFont(fonts.body, 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...LABEL)
  doc.text('Assinatura do Favorecido',  52,  sigY + 6,  { align: 'center' })
  doc.text('Assinatura do Responsável', 158, sigY + 6,  { align: 'center' })
  doc.setFontSize(7)
  doc.setTextColor(...MUTED)
  doc.text(member.name, 52, sigY + 11, { align: 'center' })
  if (member.cpf) doc.text(fmtCpf(member.cpf), 52, sigY + 15, { align: 'center' })
  doc.text(cLabel, 158, sigY + 11, { align: 'center' })
  if (cCnpj) doc.text(`CNPJ: ${cCnpj}`, 158, sigY + 15, { align: 'center' })
}

// ── autoTable base config ──────────────────────────────────────────────────
const tableBase = (fonts) => ({
  theme: 'grid',
  styles:             { fontSize: 7.5, cellPadding: 2.5, textColor: BODY_DK, font: fonts.body, fontStyle: 'normal' },
  headStyles:         { fillColor: _colorBase, textColor: WHITE, fontStyle: 'bold', fontSize: 7.5, font: fonts.condensed },
  footStyles:         { fillColor: LIGHT_BG, textColor: BODY_DK, fontStyle: 'bold', fontSize: 7.5, font: fonts.condensed },
  alternateRowStyles: { fillColor: LIGHT_BG },
  margin:             { left: MARGIN, right: MARGIN, top: MARGIN + 5 },
})

// ── Holerite Mensal (melhorado, identidade Akro) ────────────────────────────
export async function generatePayslip({ member, events, payments, companyProfile, month, year }) {
  const doc   = new jsPDF({ unit: 'mm', format: 'a4' })
  const fonts = await registerFonts(doc)
  let y = await drawHeader(doc, 'HOLERITE MENSAL', fonts, companyProfile)

  doc.setFont(fonts.condensed, 'bold').setFontSize(18).setTextColor(...BODY_DK)
  doc.text('Holerite Mensal', PAGE_W / 2, y, { align: 'center' })
  y += 6
  doc.setFont(fonts.body, 'normal').setFontSize(10).setTextColor(...LABEL)
  doc.text(`Competência: ${MONTHS_LONG[month]} / ${year}`, PAGE_W / 2, y, { align: 'center' })
  y += 5
  doc.setDrawColor(..._colorAccent).setLineWidth(1.5)
  doc.line(72, y, 138, y)
  y += 10

  // Two-column member info
  const midX = MARGIN + CONTENT_W / 2 + 5
  ;[['Favorecido', member.name], ['Cargo', member.role]].forEach(([lbl, val], i) => {
    const iy = y + i * 10
    doc.setFont(fonts.body, 'bold').setFontSize(7.5).setTextColor(...LABEL)
    doc.text(lbl.toUpperCase(), MARGIN, iy)
    doc.setFont(fonts.body, 'normal').setFontSize(9).setTextColor(...BODY_DK)
    doc.text(String(val || '—'), MARGIN, iy + 4.5)
  })
  ;[['CPF', fmtCpf(member.cpf)], ['Cachê Base', fmtCurrency(member.cache ?? 0)]].forEach(([lbl, val], i) => {
    const iy = y + i * 10
    doc.setFont(fonts.body, 'bold').setFontSize(7.5).setTextColor(...LABEL)
    doc.text(lbl.toUpperCase(), midX, iy)
    doc.setFont(fonts.body, 'normal').setFontSize(9).setTextColor(...BODY_DK)
    doc.text(String(val || '—'), midX, iy + 4.5)
  })
  y += 26

  y = drawSectionTitle(doc, y, 'Detalhamento de Shows', fonts)

  const rows = events.map(ev => {
    const entry   = payments[ev.id]?.[member.id] ?? {}
    const val     = calcEntryValue(entry, member.cache)
    const paidAmt = entry.paid ? val : (entry.partial ? (entry.partialAmount ?? 0) : 0)
    return [fmtDate(ev.date), ev.name, ev.city || ev.local || '—', fmtCurrency(val), fmtCurrency(paidAmt), entry.paid ? 'Pago' : entry.partial ? 'Parcial' : 'Pendente']
  })

  autoTable(doc, {
    ...tableBase(fonts),
    startY: y,
    head: [['Data', 'Evento', 'Cidade', 'Valor Bruto', 'Valor Pago', 'Status']],
    body: rows,
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 54 },
      2: { cellWidth: 38 },
      3: { cellWidth: 28, halign: 'right', font: fonts.mono },
      4: { cellWidth: 28, halign: 'right', font: fonts.mono },
      5: { cellWidth: 12, halign: 'center' },
    },
  })

  y = (doc.lastAutoTable?.finalY ?? y) + 8

  const totalAll  = events.reduce((s, ev) => s + calcEntryValue(payments[ev.id]?.[member.id] ?? {}, member.cache), 0)
  const paidTotal = events.reduce((s, ev) => {
    const entry = payments[ev.id]?.[member.id] ?? {}
    const val   = calcEntryValue(entry, member.cache)
    return s + (entry.paid ? val : entry.partial ? (entry.partialAmount ?? 0) : 0)
  }, 0)
  const pending = totalAll - paidTotal

  // Compact RESUMO FINANCEIRO box
  const boxW = 70, boxH = 22, boxX = PAGE_W / 2 - boxW / 2
  doc.setFillColor(..._colorBase)
  doc.roundedRect(boxX, y, boxW, boxH, 2, 2, 'F')
  doc.setFont(fonts.condensed, 'bold').setFontSize(7.5).setTextColor(...WHITE)
  doc.text('RESUMO FINANCEIRO', PAGE_W / 2, y + 6, { align: 'center' })
  doc.setFont(fonts.mono, 'bold').setFontSize(6.5).setTextColor(...OFF_WH)
  doc.text(`Total:   ${fmtCurrency(totalAll)}`,  PAGE_W / 2, y + 11.5, { align: 'center' })
  doc.text(`Pago:    ${fmtCurrency(paidTotal)}`,  PAGE_W / 2, y + 16,   { align: 'center' })
  doc.text(`Aberto:  ${fmtCurrency(pending)}`,    PAGE_W / 2, y + 20.5, { align: 'center' })

  if (pending <= 0.01) {
    y += boxH + 5
    doc.setFillColor(...GREEN)
    doc.roundedRect(PAGE_W / 2 - 28, y, 56, 8, 2, 2, 'F')
    doc.setFont(fonts.condensed, 'bold').setFontSize(8).setTextColor(...WHITE)
    doc.text('Pagamento quitado', PAGE_W / 2, y + 5.5, { align: 'center' })
  }

  drawSignatureBlock(doc, member, companyProfile, fonts)
  applyFooters(doc, companyProfile, fonts)
  doc.save(`holerite_${member.name.replace(/\s+/g, '_')}_${MONTHS_LONG[month]}_${year}.pdf`)
}

// ── Relatório de Turnê ──────────────────────────────────────────────────────
export async function generateTourReport({ events, members, payments, expenses, checklistItems, companyProfile, dataInicio, dataFim, eventIds, contractReceipts = {} }) {
  const tourEvents = events
    .filter(ev => eventIds
      ? eventIds.includes(ev.id)
      : (!dataInicio || ev.date >= dataInicio) && (!dataFim || ev.date <= dataFim)
    )
    .sort((a, b) => a.date.localeCompare(b.date))

  const tourIds      = new Set(tourEvents.map(ev => ev.id))
  const tourExpenses = expenses.filter(exp => tourIds.has(exp.eventId))
  const totalRevenue  = tourEvents.reduce((s, ev) => s + (ev.value || 0), 0)
  const totalExpenses = tourExpenses.reduce((s, exp) => s + (exp.amount || 0), 0)

  let totalCaches = 0
  tourEvents.forEach(ev => {
    ;(ev.members || []).forEach(memId => {
      const m = members.find(x => x.id === memId)
      if (m) totalCaches += calcEntryValue(payments[ev.id]?.[memId] ?? {}, m.cache)
    })
  })
  const netResult = totalRevenue - totalCaches - totalExpenses

  const doc   = new jsPDF({ unit: 'mm', format: 'a4' })
  const fonts = await registerFonts(doc)
  const period = dataInicio && dataFim
    ? `${fmtDate(dataInicio)} a ${fmtDate(dataFim)}`
    : `${tourEvents.length} evento${tourEvents.length !== 1 ? 's' : ''} selecionados`

  let y = await drawHeader(doc, 'RELATÓRIO DE TURNÊ', fonts, companyProfile)

  doc.setFont(fonts.condensed, 'bold').setFontSize(18).setTextColor(...BODY_DK)
  doc.text('Relatório de Turnê', PAGE_W / 2, y, { align: 'center' })
  y += 6
  doc.setFont(fonts.body, 'normal').setFontSize(9).setTextColor(...LABEL)
  doc.text(`Período: ${period}`, PAGE_W / 2, y, { align: 'center' })
  y += 5
  doc.setDrawColor(..._colorAccent).setLineWidth(1.5)
  doc.line(72, y, 138, y)
  y += 10

  y = drawSectionTitle(doc, y, 'Resumo Executivo', fonts)
  y = drawHighlightBlock(doc, y, [
    { label: 'Total de Shows',    value: String(tourEvents.length), bold: false },
    { label: 'Receita Total',     value: fmtCurrency(totalRevenue), bold: false },
    { label: 'Total de Cachês',   value: fmtCurrency(totalCaches),  bold: false },
    { label: 'Despesas Operac.',  value: fmtCurrency(totalExpenses),bold: false },
    { label: 'Resultado Líquido', value: fmtCurrency(netResult),    bold: true  },
  ], netResult >= 0 ? 'green' : 'red', fonts)

  y = checkPageBreak(doc, y, 20)
  y = drawSectionTitle(doc, y, 'Detalhamento dos Shows', fonts)

  const showRows = tourEvents.map(ev => {
    const evCaches = (ev.members || []).reduce((s, memId) => {
      const m = members.find(x => x.id === memId)
      return s + (m ? calcEntryValue(payments[ev.id]?.[memId] ?? {}, m.cache) : 0)
    }, 0)
    const evExp = tourExpenses.filter(e => e.eventId === ev.id).reduce((s, e) => s + (e.amount || 0), 0)
    return [
      fmtDate(ev.date),
      ev.name,
      [ev.city, ev.state].filter(Boolean).join(' / ') || '—',
      fmtCurrency(ev.value || 0),
      fmtCurrency(evCaches),
      fmtCurrency(evExp),
      fmtCurrency((ev.value || 0) - evCaches - evExp),
    ]
  })

  autoTable(doc, {
    ...tableBase(fonts),
    startY: y,
    head: [['Data', 'Evento', 'Local', 'Contrato', 'Cachês', 'Despesas', 'Líquido']],
    body: showRows.length ? showRows : [['', 'Nenhum evento no período selecionado', '', '', '', '', '']],
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 44 },
      2: { cellWidth: 34 },
      3: { cellWidth: 26, halign: 'right', font: fonts.mono },
      4: { cellWidth: 20, halign: 'right', font: fonts.mono },
      5: { cellWidth: 20, halign: 'right', font: fonts.mono },
      6: { cellWidth: 16, halign: 'right', font: fonts.mono },
    },
  })

  y = (doc.lastAutoTable?.finalY ?? y) + 8
  y = checkPageBreak(doc, y, 20)

  y = drawSectionTitle(doc, y, 'Resumo por Estado', fonts)
  const stateMap = {}
  tourEvents.forEach(ev => {
    const uf = ev.state || 'N/A'
    if (!stateMap[uf]) stateMap[uf] = { count: 0, revenue: 0 }
    stateMap[uf].count   += 1
    stateMap[uf].revenue += ev.value || 0
  })
  const stateRows = Object.entries(stateMap)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .map(([uf, { count, revenue }]) => [uf, String(count), fmtCurrency(revenue)])

  autoTable(doc, {
    ...tableBase(fonts),
    startY: y,
    head: [['Estado', 'Nº de Shows', 'Receita Total']],
    body: stateRows.length ? stateRows : [['—', '—', '—']],
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 60, halign: 'center', font: fonts.mono },
      2: { cellWidth: 62, halign: 'right', font: fonts.mono },
    },
  })

  y = (doc.lastAutoTable?.finalY ?? y) + 8
  y = checkPageBreak(doc, y, 20)

  y = drawSectionTitle(doc, y, 'Status do Checklist por Show', fonts)
  const clRows = tourEvents.map(ev => {
    const items = (checklistItems || []).filter(item => item.eventId === ev.id)
    const done  = items.filter(item => item.done).length
    const total = items.length
    const pct   = total > 0 ? Math.round((done / total) * 100) : 0
    return [fmtDate(ev.date), ev.name, `${done}/${total}`, `${pct}%`, pct === 100 ? 'Completo' : total === 0 ? 'Sem itens' : 'Em andamento']
  })

  autoTable(doc, {
    ...tableBase(fonts),
    startY: y,
    head: [['Data', 'Evento', 'Concluídos', 'Progresso', 'Status']],
    body: clRows.length ? clRows : [['—', 'Nenhum evento', '—', '—', '—']],
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 72 },
      2: { cellWidth: 26, halign: 'center', font: fonts.mono },
      3: { cellWidth: 26, halign: 'center', font: fonts.mono },
      4: { cellWidth: 36, halign: 'center' },
    },
  })

  y = (doc.lastAutoTable?.finalY ?? y) + 8
  y = checkPageBreak(doc, y, 30)
  y = drawSectionTitle(doc, y, 'Status de Recebimento dos Contratos', fonts)

  const tourRcptRows = tourEvents.map(ev => {
    const rcpt    = contractReceipts[ev.id] ?? {}
    const label   = rcpt.paid ? 'Pago' : rcpt.partial ? 'Parcial' : 'Pendente'
    const paidStr = rcpt.paidAt ? fmtIsoDateTime(rcpt.paidAt) : (rcpt.partial && (rcpt.partialPayments || []).length > 0 ? `${(rcpt.partialPayments || []).length} lançamento(s)` : '—')
    const rcvd    = rcpt.paid ? (ev.value || 0) : (rcpt.paidAmount || 0)
    return [fmtDate(ev.date), ev.name, label, paidStr, fmtCurrency(rcvd)]
  })
  const rcptStatuses = tourEvents.map(ev => contractReceipts[ev.id]?.paid ? 'paid' : contractReceipts[ev.id]?.partial ? 'partial' : 'pending')

  autoTable(doc, {
    ...tableBase(fonts),
    startY: y,
    head: [['Data', 'Evento', 'Status', 'Confirmação / Detalhes', 'Recebido']],
    body: tourRcptRows.length ? tourRcptRows : [['—', 'Nenhum evento', '—', '—', '—']],
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 50 },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 62, font: fonts.mono, fontSize: 7 },
      4: { cellWidth: 30, halign: 'right', font: fonts.mono },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 2) {
        const st = rcptStatuses[data.row.index]
        data.cell.styles.textColor = st === 'paid' ? GREEN : st === 'partial' ? ORANGE : RED
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })

  applyFooters(doc, companyProfile, fonts)
  const fromStr = (dataInicio || '').replace(/-/g, '')
  const toStr   = (dataFim   || '').replace(/-/g, '')
  doc.save(`turne_relatorio_${fromStr}_${toStr}.pdf`)
}

// ── Comprovante de Pagamento ───────────────────────────────────────────────
export async function generatePaymentReceipt({ member, event, payments, companyProfile, contractReceipts = {} }) {
  const entry     = payments[event.id]?.[member.id] ?? {}
  const fullVal   = calcEntryValue(entry, member.cache)
  const paidAmt   = entry.paid ? fullVal : (entry.partial ? (entry.partialAmount ?? 0) : 0)
  const isPartial = entry.partial && !entry.paid
  const accent    = isPartial ? ORANGE : GREEN
  const bg        = isPartial ? BG_ORANGE : BG_GREEN

  const doc   = new jsPDF({ unit: 'mm', format: 'a4' })
  const fonts = await registerFonts(doc)
  let y = await drawHeader(doc, 'COMPROVANTE DE PAGAMENTO', fonts, companyProfile)

  doc.setFont(fonts.condensed, 'bold').setFontSize(18).setTextColor(...BODY_DK)
  doc.text('Comprovante de Pagamento', PAGE_W / 2, y, { align: 'center' })
  y += 6
  doc.setDrawColor(..._colorAccent).setLineWidth(1.5)
  doc.line(72, y, 138, y)
  y += 10

  y = drawSectionTitle(doc, y, 'Dados do Favorecido', fonts)
  y = drawInfoRow(doc, y, 'Nome',  member.name, fonts)
  y = drawInfoRow(doc, y, 'CPF',   fmtCpf(member.cpf), fonts)
  y = drawInfoRow(doc, y, 'Cargo', member.role, fonts)
  y += 4

  y = drawSectionTitle(doc, y, 'Dados do Evento', fonts)
  y = drawInfoRow(doc, y, 'Evento', event.name, fonts)
  y = drawInfoRow(doc, y, 'Data',   fmtDate(event.date), fonts)
  y = drawInfoRow(doc, y, 'Local',  event.local || event.city || '—', fonts)
  y += 4

  // Bloco de valor principal
  doc.setFillColor(...bg)
  doc.roundedRect(MARGIN, y, CONTENT_W, 36, 3, 3, 'F')
  doc.setFillColor(...accent)
  doc.rect(MARGIN, y, 3, 36, 'F')

  doc.setFont(fonts.condensed, 'bold').setFontSize(8.5).setTextColor(...LABEL)
  doc.text(isPartial ? 'VALOR PARCIALMENTE PAGO' : 'VALOR PAGO', PAGE_W / 2, y + 9, { align: 'center' })

  doc.setFont(fonts.mono, 'bold').setFontSize(28).setTextColor(...accent)
  doc.text(fmtCurrency(paidAmt), PAGE_W / 2, y + 24, { align: 'center' })

  if (isPartial) {
    doc.setFont(fonts.body, 'normal').setFontSize(7.5).setTextColor(...MUTED)
    doc.text(
      `Valor total: ${fmtCurrency(fullVal)}  —  Saldo restante: ${fmtCurrency(fullVal - paidAmt)}`,
      PAGE_W / 2, y + 32, { align: 'center' }
    )
  }
  y += 42

  // Nota automática
  doc.setFont(fonts.body, 'normal').setFontSize(7.5).setTextColor(...MUTED)
  doc.text(
    `Este comprovante foi gerado em ${today()} e registra o pagamento de cachê referente ao evento acima.`,
    PAGE_W / 2, y, { align: 'center', maxWidth: CONTENT_W }
  )
  y += 8

  // Auditoria de pagamento do contrato
  const cRcpt   = contractReceipts[event.id] ?? {}
  const cPaidAt = cRcpt.paidAt || null
  const cPPs    = cRcpt.partialPayments || []

  if (cPaidAt) {
    y = checkPageBreak(doc, y, 20)
    y = drawSectionTitle(doc, y, 'Auditoria do Pagamento do Contrato', fonts)
    doc.setFont(fonts.body, 'normal').setFontSize(8.5).setTextColor(...GREEN)
    doc.text(`Pagamento integral confirmado em ${fmtIsoDateTime(cPaidAt)}.`, MARGIN, y + 4)
    y += 12
  } else if (cPPs.length > 0) {
    y = checkPageBreak(doc, y, 35)
    y = drawSectionTitle(doc, y, 'Histórico de Recebimentos do Contrato', fonts)
    const ppRows  = cPPs.map(pp => [fmtIsoDateTime(pp.receivedAt), fmtCurrency(pp.amount)])
    const ppTotal = cPPs.reduce((s, p) => s + p.amount, 0)
    autoTable(doc, {
      ...tableBase(fonts),
      startY: y,
      head: [['Data / Hora', 'Valor']],
      body: ppRows,
      foot: [['Total Recebido', fmtCurrency(ppTotal)]],
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 62, halign: 'right', font: fonts.mono },
      },
    })
    y = (doc.lastAutoTable?.finalY ?? y) + 8
  } else {
    doc.setFont(fonts.body, 'normal').setFontSize(8).setTextColor(...ORANGE)
    doc.text('Pagamento do contrato: pendente.', PAGE_W / 2, y, { align: 'center' })
  }

  drawSignatureBlock(doc, member, companyProfile, fonts)
  applyFooters(doc, companyProfile, fonts)

  const safeName  = member.name.replace(/\s+/g, '_')
  const safeEvent = event.name.replace(/\s+/g, '_').slice(0, 30)
  doc.save(`comprovante_${safeName}_${safeEvent}.pdf`)
}

// ── Balanço Financeiro Mensal ──────────────────────────────────────────────
export async function generateBalanceReport({ events, members, payments, expenses, companyProfile, month, year, contractReceipts = {}, contractors = [] }) {
  const periodEvents = events
    .filter(ev => { const d = new Date(ev.date + 'T12:00:00'); return d.getFullYear() === year && d.getMonth() === month })
    .sort((a, b) => a.date.localeCompare(b.date))

  const periodIds      = new Set(periodEvents.map(ev => ev.id))
  const periodExpenses = expenses.filter(exp => periodIds.has(exp.eventId))
  const totalRevenue   = periodEvents.reduce((s, ev) => s + (ev.value || 0), 0)
  const totalOpEx      = periodExpenses.reduce((s, exp) => s + (exp.amount || 0), 0)

  let totalCaches = 0
  periodEvents.forEach(ev => {
    ;(ev.members || []).forEach(memId => {
      const m = members.find(x => x.id === memId)
      if (m) totalCaches += calcEntryValue(payments[ev.id]?.[memId] ?? {}, m.cache)
    })
  })
  const netResult = totalRevenue - totalCaches - totalOpEx
  const margin    = totalRevenue > 0 ? Math.round((netResult / totalRevenue) * 100) : 0

  const doc   = new jsPDF({ unit: 'mm', format: 'a4' })
  const fonts = await registerFonts(doc)
  let y = await drawHeader(doc, 'BALANÇO FINANCEIRO MENSAL', fonts, companyProfile)

  doc.setFont(fonts.condensed, 'bold').setFontSize(18).setTextColor(...BODY_DK)
  doc.text('Balanço Financeiro', PAGE_W / 2, y, { align: 'center' })
  y += 6
  doc.setFont(fonts.body, 'normal').setFontSize(10).setTextColor(...LABEL)
  doc.text(`Competência: ${MONTHS_LONG[month]} / ${year}`, PAGE_W / 2, y, { align: 'center' })
  y += 5
  doc.setDrawColor(..._colorAccent).setLineWidth(1.5)
  doc.line(72, y, 138, y)
  y += 10

  y = drawSectionTitle(doc, y, 'Visão Geral do Período', fonts)
  y = drawHighlightBlock(doc, y, [
    { label: 'Receita Total',     value: fmtCurrency(totalRevenue), bold: false },
    { label: 'Total de Cachês',   value: fmtCurrency(totalCaches),  bold: false },
    { label: 'Despesas Operac.',  value: fmtCurrency(totalOpEx),    bold: false },
    { label: 'Resultado Líquido', value: fmtCurrency(netResult),    bold: true  },
  ], netResult >= 0 ? 'green' : 'red', fonts)

  y = checkPageBreak(doc, y, 20)
  y = drawSectionTitle(doc, y, 'Receitas — Contratos do Período', fonts)

  const revenueRows = periodEvents.map(ev => [
    fmtDate(ev.date),
    ev.name,
    [ev.city, ev.state].filter(Boolean).join(' / ') || '—',
    ev.type || '—',
    fmtCurrency(ev.value || 0),
  ])

  autoTable(doc, {
    ...tableBase(fonts),
    startY: y,
    head: [['Data', 'Evento', 'Local', 'Tipo', 'Valor']],
    body: revenueRows.length ? revenueRows : [['', 'Nenhum evento neste período', '', '', '']],
    foot: revenueRows.length ? [['', '', '', 'Total', fmtCurrency(totalRevenue)]] : undefined,
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 60 },
      2: { cellWidth: 38 },
      3: { cellWidth: 28 },
      4: { cellWidth: 34, halign: 'right', font: fonts.mono },
    },
  })

  y = (doc.lastAutoTable?.finalY ?? y) + 8
  y = checkPageBreak(doc, y, 20)

  y = drawSectionTitle(doc, y, 'Despesas — Cachês dos Membros', fonts)
  const memberRows = members.flatMap(m => {
    const mEvs = periodEvents.filter(ev => (ev.members || []).includes(m.id))
    if (!mEvs.length) return []
    let total = 0, paid = 0
    mEvs.forEach(ev => {
      const entry = payments[ev.id]?.[m.id] ?? {}
      const val   = calcEntryValue(entry, m.cache)
      total += val
      paid  += entry.paid ? val : (entry.partial ? (entry.partialAmount ?? 0) : 0)
    })
    return [[m.name, m.role, String(mEvs.length), fmtCurrency(total), fmtCurrency(paid), fmtCurrency(total - paid)]]
  })

  autoTable(doc, {
    ...tableBase(fonts),
    startY: y,
    head: [['Membro', 'Cargo', 'Shows', 'Total Cachê', 'Pago', 'Pendente']],
    body: memberRows.length ? memberRows : [['Nenhum membro com shows neste período', '', '', '', '', '']],
    foot: memberRows.length ? [['', '', '', fmtCurrency(totalCaches), '', '']] : undefined,
    columnStyles: {
      0: { cellWidth: 48 },
      1: { cellWidth: 34 },
      2: { cellWidth: 14, halign: 'center', font: fonts.mono },
      3: { cellWidth: 28, halign: 'right', font: fonts.mono },
      4: { cellWidth: 28, halign: 'right', font: fonts.mono },
      5: { cellWidth: 30, halign: 'right', font: fonts.mono },
    },
  })

  y = (doc.lastAutoTable?.finalY ?? y) + 8
  y = checkPageBreak(doc, y, 20)

  y = drawSectionTitle(doc, y, 'Despesas — Custos Operacionais', fonts)
  const expCatMap = {}
  periodExpenses.forEach(exp => {
    const cat = exp.type || 'Outros'
    if (!expCatMap[cat]) expCatMap[cat] = { count: 0, total: 0 }
    expCatMap[cat].count += 1
    expCatMap[cat].total += exp.amount || 0
  })
  const expRows = Object.entries(expCatMap)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([cat, { count, total }]) => [cat, String(count), fmtCurrency(total)])

  autoTable(doc, {
    ...tableBase(fonts),
    startY: y,
    head: [['Categoria', 'Lançamentos', 'Total']],
    body: expRows.length ? expRows : [['Nenhuma despesa registrada', '', '']],
    foot: expRows.length ? [['Total', '', fmtCurrency(totalOpEx)]] : undefined,
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 42, halign: 'center', font: fonts.mono },
      2: { cellWidth: 40, halign: 'right',  font: fonts.mono },
    },
  })

  y = (doc.lastAutoTable?.finalY ?? y) + 8
  y = checkPageBreak(doc, y, 42)

  y = drawSectionTitle(doc, y, 'Resultado do Período', fonts)
  y = drawHighlightBlock(doc, y, [
    { label: 'Receita Total',     value: fmtCurrency(totalRevenue), bold: false },
    { label: '(-) Cachês',        value: fmtCurrency(totalCaches),  bold: false },
    { label: '(-) Despesas',      value: fmtCurrency(totalOpEx),    bold: false },
    { label: 'Resultado Líquido', value: fmtCurrency(netResult),    bold: true  },
    { label: 'Margem de Lucro',   value: `${margin}%`,              bold: false },
  ], netResult >= 0 ? 'green' : 'red', fonts)

  y = checkPageBreak(doc, y, 30)
  y = drawSectionTitle(doc, y, 'Status de Recebimento dos Contratos', fonts)

  const balRcptRows = periodEvents.map(ev => {
    const rcpt    = contractReceipts[ev.id] ?? {}
    const label   = rcpt.paid ? 'Pago' : rcpt.partial ? 'Parcial' : 'Pendente'
    const detail  = rcpt.paidAt ? fmtIsoDateTime(rcpt.paidAt) : (rcpt.partial && (rcpt.partialPayments || []).length > 0 ? `${(rcpt.partialPayments || []).length} pagamento(s) parcial(is)` : 'Pagamento pendente')
    const rcvd    = rcpt.paid ? (ev.value || 0) : (rcpt.paidAmount || 0)
    const balance = (ev.value || 0) - rcvd
    return [fmtDate(ev.date), ev.name, label, detail, fmtCurrency(rcvd), fmtCurrency(balance)]
  })
  const balStatuses = periodEvents.map(ev => contractReceipts[ev.id]?.paid ? 'paid' : contractReceipts[ev.id]?.partial ? 'partial' : 'pending')

  autoTable(doc, {
    ...tableBase(fonts),
    startY: y,
    head: [['Data', 'Evento', 'Status', 'Detalhes', 'Recebido', 'Saldo']],
    body: balRcptRows.length ? balRcptRows : [['—', 'Nenhum evento neste período', '—', '—', '—', '—']],
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 44 },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 48, fontSize: 7 },
      4: { cellWidth: 26, halign: 'right', font: fonts.mono },
      5: { cellWidth: 26, halign: 'right', font: fonts.mono },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 2) {
        const st = balStatuses[data.row.index]
        data.cell.styles.textColor = st === 'paid' ? GREEN : st === 'partial' ? ORANGE : RED
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })

  applyFooters(doc, companyProfile, fonts)
  const mm = String(month + 1).padStart(2, '0')
  doc.save(`balanco_${mm}${year}.pdf`)
}

// ── Relatório Completo do Show ─────────────────────────────────────────────
export async function generateShowReport({ eventId, state }) {
  const {
    events, members, payments, expenses, contractors,
    companyProfile, checklistItems, equipment,
    showEquipment, songs, setlists, contractReceipts,
  } = state

  const event = events.find(e => e.id === eventId)
  if (!event) return

  const d          = new Date(event.date + 'T12:00:00')
  const longDate   = d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
  const weekdayRaw = d.toLocaleDateString('pt-BR', { weekday: 'long' })
  const weekday    = weekdayRaw.charAt(0).toUpperCase() + weekdayRaw.slice(1)

  // Contract receipt status
  const receipt         = contractReceipts?.[eventId] ?? { paid: false, partial: false }
  const paidAt          = receipt.paidAt || null
  const partialPayments = receipt.partialPayments || []
  const rcptLabel       = receipt.paid ? 'Pago' : receipt.partial ? 'Parcial' : 'Pendente'
  const rcptColor       = receipt.paid ? GREEN  : receipt.partial ? ORANGE    : RED

  // Contractors
  const eventContractors = (event.contractorIds || [])
    .map(id => contractors.find(c => c.id === id)).filter(Boolean)
  const contractorStr = eventContractors.length
    ? eventContractors.map(c => c.company ? `${c.name} (${c.company})` : c.name).join(', ')
    : null

  // Financials
  const memberIds       = event.members || []
  const eventExpenses   = (expenses || []).filter(e => e.eventId === eventId)
  const revenue         = event.value || 0
  const totalExpSum     = eventExpenses.reduce((s, e) => s + (e.amount || 0), 0)
  let   totalCaches = 0, paidCaches = 0
  memberIds.forEach(memId => {
    const m     = members.find(x => x.id === memId)
    if (!m) return
    const entry = payments[event.id]?.[memId] ?? {}
    const val   = calcEntryValue(entry, m.cache)
    totalCaches += val
    paidCaches  += entry.paid ? val : (entry.partial ? (entry.partialAmount ?? 0) : 0)
  })
  const netResult = revenue - totalCaches - totalExpSum
  const margin    = revenue > 0 ? Math.round((netResult / revenue) * 100) : 0
  const avgTicket = memberIds.length > 0 ? netResult / memberIds.length : 0
  const profitColor = netResult >= 0 ? GREEN : RED

  // Logistics: find previous event by date
  const prevEvent = [...events]
    .filter(e => e.id !== eventId && e.date < event.date)
    .sort((a, b) => b.date.localeCompare(a.date))[0] || null
  const originCity  = prevEvent?.city  || companyProfile?.city  || null
  const originState = prevEvent?.state || companyProfile?.state || null
  const originLabel = [originCity, originState].filter(Boolean).join(', ') || '—'
  const destLabel   = [event.city, event.state].filter(Boolean).join(', ') || '—'
  let   distStr     = 'Distância não informada'
  if (prevEvent?.lat && prevEvent?.lng && event.lat && event.lng) {
    const km = haversineKm(prevEvent.lat, prevEvent.lng, event.lat, event.lng)
    distStr  = `${Math.round(km).toLocaleString('pt-BR')} km`
  }

  // Checklist
  const eventCL  = (checklistItems || []).filter(i => i.eventId === eventId)
  const clDone   = eventCL.filter(i => i.done).length
  const clPct    = eventCL.length > 0 ? Math.round((clDone / eventCL.length) * 100) : 0

  // Equipment
  const showEqRec = (showEquipment || []).find(se => se.eventId === eventId)
  const eqIds     = showEqRec?.equipmentIds || []
  const showEqs   = eqIds.map(id => (equipment || []).find(e => e.id === id)).filter(Boolean)
    .sort((a, b) => a.category.localeCompare(b.category))

  // Setlist
  const eventSetlists = (setlists || []).filter(sl => sl.eventId === eventId)
  const songMap       = Object.fromEntries((songs || []).map(s => [s.id, s]))

  // ── Build doc ────────────────────────────────────────────────────────────
  const doc   = new jsPDF({ unit: 'mm', format: 'a4' })
  const fonts = await registerFonts(doc)
  let   y     = await drawHeader(doc, 'RELATÓRIO DO SHOW', fonts, companyProfile)

  doc.setFont(fonts.condensed, 'bold').setFontSize(18).setTextColor(...BODY_DK)
  doc.text('Relatório do Show', PAGE_W / 2, y, { align: 'center' })
  y += 6
  doc.setFont(fonts.body, 'normal').setFontSize(9).setTextColor(...LABEL)
  doc.text(event.name, PAGE_W / 2, y, { align: 'center' })
  y += 5
  doc.setDrawColor(..._colorAccent).setLineWidth(1.5)
  doc.line(72, y, 138, y)
  y += 10

  // ── Seção 1: Identificação ────────────────────────────────────────────────
  y = drawSectionTitle(doc, y, 'Identificação do Show', fonts)

  const idRows = [
    ['NOME DO SHOW',       event.name],
    ['DATA',               longDate],
    ['DIA DA SEMANA',      weekday],
    ['CIDADE / ESTADO',    [event.city, event.state].filter(Boolean).join(', ') || '—'],
    ['TIPO DE SHOW',       event.event_type === 'festival' ? 'Festival' : 'Show solo'],
    ['INICIATIVA',         event.visibility === 'privado' ? 'Privada' : 'Pública'],
    ...(event.organizer_name ? [['ÓRGÃO CONTRATANTE', event.organizer_name]] : []),
    ...(contractorStr ? [['CONTRATANTE', contractorStr]] : []),
    ['STATUS DO CONTRATO', rcptLabel],
    ...(paidAt    ? [['PAGO EM',         fmtIsoDateTime(paidAt)]] : []),
    ...(!paidAt && !receipt.paid && !receipt.partial ? [['PENDÊNCIA', 'Pagamento não confirmado']] : []),
  ]
  const statusIdx  = idRows.findIndex(r => r[0] === 'STATUS DO CONTRATO')
  const paidAtIdx  = idRows.findIndex(r => r[0] === 'PAGO EM')

  autoTable(doc, {
    theme: 'plain',
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    styles:             { cellPadding: [3, 4, 3, 4], fontSize: 8.5, font: fonts.body, textColor: BODY_DK },
    alternateRowStyles: { fillColor: LIGHT_BG },
    columnStyles: {
      0: { cellWidth: 52, fontStyle: 'bold', textColor: LABEL, fontSize: 7 },
    },
    body: idRows,
    didParseCell: (d) => {
      if (d.section !== 'body' || d.column.index !== 1) return
      if (d.row.index === statusIdx) {
        d.cell.styles.textColor = rcptColor
        d.cell.styles.fontStyle = 'bold'
        d.cell.styles.font      = fonts.mono
      }
      if (paidAtIdx >= 0 && d.row.index === paidAtIdx) {
        d.cell.styles.textColor = GREEN
        d.cell.styles.font      = fonts.mono
      }
    },
  })
  y = (doc.lastAutoTable?.finalY ?? y) + 8

  // ── Seção 2: Resultado Financeiro ─────────────────────────────────────────
  y = checkPageBreak(doc, y, 60)
  y = drawSectionTitle(doc, y, 'Resultado Financeiro', fonts)

  y = drawHighlightBlock(doc, y, [
    { label: 'Faturamento Bruto',     value: fmtCurrency(revenue),      bold: false },
    { label: 'Total de Cachês',       value: fmtCurrency(totalCaches),  bold: false },
    { label: 'Despesas Operacionais', value: fmtCurrency(totalExpSum),  bold: false },
    { label: 'Lucro Líquido',         value: fmtCurrency(netResult),    bold: true  },
  ], netResult >= 0 ? 'green' : 'red', fonts)

  doc.setFont(fonts.body, 'normal').setFontSize(8).setTextColor(...LABEL)
  doc.text('Margem de Lucro:', MARGIN + 7, y + 5)
  doc.setFont(fonts.mono, 'bold').setFontSize(9).setTextColor(...profitColor)
  doc.text(`${margin}%`, PAGE_W - MARGIN, y + 5, { align: 'right' })
  y += 8

  if (memberIds.length > 0) {
    doc.setFont(fonts.body, 'normal').setFontSize(8).setTextColor(...LABEL)
    doc.text('Ticket Médio por Membro:', MARGIN + 7, y + 2)
    doc.setFont(fonts.mono, 'bold').setFontSize(9).setTextColor(...BODY_DK)
    doc.text(fmtCurrency(avgTicket), PAGE_W - MARGIN, y + 2, { align: 'right' })
    y += 6
  }
  y += 5

  // ── Seção 2b: Histórico de Recebimentos do Contrato ──────────────────────
  if (partialPayments.length > 0 || paidAt) {
    y = checkPageBreak(doc, y, 35)
    y = drawSectionTitle(doc, y, 'Histórico de Recebimentos', fonts)

    if (partialPayments.length > 0) {
      const ppRows  = partialPayments.map(pp => [fmtIsoDateTime(pp.receivedAt), fmtCurrency(pp.amount)])
      const ppTotal = partialPayments.reduce((s, p) => s + p.amount, 0)
      autoTable(doc, {
        ...tableBase(fonts),
        startY: y,
        head: [['Data / Hora', 'Valor Recebido']],
        body: ppRows,
        foot: [['Total Recebido', fmtCurrency(ppTotal)]],
        columnStyles: {
          0: { cellWidth: 120 },
          1: { cellWidth: 62, halign: 'right', font: fonts.mono },
        },
      })
      y = (doc.lastAutoTable?.finalY ?? y) + 8
    } else if (paidAt) {
      doc.setFont(fonts.body, 'normal').setFontSize(8.5).setTextColor(...GREEN)
      doc.text(`Pagamento integral confirmado em ${fmtIsoDateTime(paidAt)}.`, MARGIN, y + 4)
      y += 14
    }
  }

  // ── Seção 3: Detalhamento de Despesas ─────────────────────────────────────
  y = checkPageBreak(doc, y, 35)
  y = drawSectionTitle(doc, y, 'Detalhamento de Despesas', fonts)

  if (eventExpenses.length === 0) {
    doc.setFont(fonts.body, 'normal').setFontSize(8.5).setTextColor(...MUTED)
    doc.text('Nenhuma despesa registrada para este show.', MARGIN, y + 4)
    y += 14
  } else {
    const expRows = eventExpenses.map(e => [e.description || '—', e.type || '—', fmtCurrency(e.amount || 0)])
    autoTable(doc, {
      ...tableBase(fonts),
      startY: y,
      head: [['Descrição', 'Categoria', 'Valor']],
      body: expRows,
      foot: [[`${expRows.length} lançamento${expRows.length !== 1 ? 's' : ''}`, 'Total', fmtCurrency(totalExpSum)]],
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 48 },
        2: { cellWidth: 34, halign: 'right', font: fonts.mono },
      },
    })
    y = (doc.lastAutoTable?.finalY ?? y) + 8
  }

  // ── Seção 4: Cachês dos Membros ───────────────────────────────────────────
  y = checkPageBreak(doc, y, 35)
  y = drawSectionTitle(doc, y, 'Cachês dos Membros', fonts)

  if (memberIds.length === 0) {
    doc.setFont(fonts.body, 'normal').setFontSize(8.5).setTextColor(...MUTED)
    doc.text('Nenhum membro escalado registrado.', MARGIN, y + 4)
    y += 14
  } else {
    const memberStatuses = []
    const memberRows = memberIds.map(memId => {
      const m     = members.find(x => x.id === memId)
      if (!m) return null
      const entry = payments[event.id]?.[memId] ?? {}
      const val   = calcEntryValue(entry, m.cache)
      const st    = entry.paid ? 'paid' : (entry.partial ? 'partial' : 'pending')
      memberStatuses.push(st)
      const stLabel = entry.paid ? 'Pago' : (entry.partial ? 'Parcial' : 'Pendente')
      return [m.name, m.role || '—', fmtCurrency(val), stLabel]
    }).filter(Boolean)

    autoTable(doc, {
      ...tableBase(fonts),
      startY: y,
      head: [['Membro', 'Cargo', 'Valor do Cachê', 'Status']],
      body: memberRows,
      foot: [[
        `Total pago: ${fmtCurrency(paidCaches)}`,
        '',
        fmtCurrency(totalCaches),
        `Pendente: ${fmtCurrency(totalCaches - paidCaches)}`,
      ]],
      columnStyles: {
        0: { cellWidth: 62 },
        1: { cellWidth: 50 },
        2: { cellWidth: 38, halign: 'right', font: fonts.mono },
        3: { cellWidth: 32, halign: 'center' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          const st = memberStatuses[data.row.index]
          data.cell.styles.textColor = st === 'paid' ? GREEN : st === 'partial' ? ORANGE : RED
          data.cell.styles.fontStyle = 'bold'
        }
      },
    })
    y = (doc.lastAutoTable?.finalY ?? y) + 8
  }

  // ── Seção 5: Logística e Distância ────────────────────────────────────────
  y = checkPageBreak(doc, y, 42)
  y = drawSectionTitle(doc, y, 'Logística e Distância', fonts)

  const logRows = [
    ['ORIGEM', originLabel + (prevEvent ? ` (show: ${fmtDate(prevEvent.date)})` : ' (cidade base)')],
    ['DESTINO', destLabel],
    ['DISTÂNCIA', distStr],
  ]
  autoTable(doc, {
    theme: 'plain',
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    styles:             { cellPadding: [3, 4, 3, 4], fontSize: 8.5, font: fonts.body, textColor: BODY_DK },
    alternateRowStyles: { fillColor: LIGHT_BG },
    columnStyles: {
      0: { cellWidth: 52, fontStyle: 'bold', textColor: LABEL, fontSize: 7 },
    },
    body: logRows,
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1 && data.row.index === 2) {
        data.cell.styles.font      = fonts.mono
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.textColor = distStr === 'Distância não informada' ? MUTED : BODY_DK
      }
    },
  })
  y = (doc.lastAutoTable?.finalY ?? y) + 8

  // ── Seção 6: Checklist ────────────────────────────────────────────────────
  y = checkPageBreak(doc, y, 35)
  y = drawSectionTitle(doc, y, 'Checklist do Show', fonts)

  if (eventCL.length === 0) {
    doc.setFont(fonts.body, 'normal').setFontSize(8.5).setTextColor(...MUTED)
    doc.text('Checklist não iniciado para este show.', MARGIN, y + 4)
    y += 14
  } else {
    const clStatuses = []
    const clRows = eventCL.map(item => {
      const owner = item.isCustom ? '—' : 'Ambos'
      const done  = item.done
      clStatuses.push(done)
      return [item.text, owner, done ? 'Concluído' : 'Pendente']
    })
    autoTable(doc, {
      ...tableBase(fonts),
      startY: y,
      head: [['Tarefa', 'Responsável', 'Status']],
      body: clRows,
      foot: [[`${clDone}/${eventCL.length} concluídos`, '', `${clPct}%`]],
      columnStyles: {
        0: { cellWidth: 110 },
        1: { cellWidth: 40, halign: 'center' },
        2: { cellWidth: 32, halign: 'center' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 2) {
          const done = clStatuses[data.row.index]
          data.cell.styles.textColor = done ? GREEN : ORANGE
          data.cell.styles.fontStyle = 'bold'
        }
      },
    })
    y = (doc.lastAutoTable?.finalY ?? y) + 8
  }

  // ── Seção 7: Equipamentos ─────────────────────────────────────────────────
  y = checkPageBreak(doc, y, 35)
  y = drawSectionTitle(doc, y, 'Equipamentos do Show', fonts)

  if (showEqs.length === 0) {
    doc.setFont(fonts.body, 'normal').setFontSize(8.5).setTextColor(...MUTED)
    doc.text('Equipamentos não registrados para este show.', MARGIN, y + 4)
    y += 14
  } else {
    const eqRows = showEqs.map(eq => [eq.category, eq.name, eq.condition])
    autoTable(doc, {
      ...tableBase(fonts),
      startY: y,
      head: [['Categoria', 'Nome', 'Estado']],
      body: eqRows,
      foot: [[`${showEqs.length} item${showEqs.length !== 1 ? 's' : ''}`, '', '']],
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 112 },
        2: { cellWidth: 30, halign: 'center' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 2) {
          const cond = data.cell.raw
          if (cond === 'Precisando de reparo') data.cell.styles.textColor = RED
          else if (cond === 'Regular')         data.cell.styles.textColor = ORANGE
          else                                 data.cell.styles.textColor = GREEN
          data.cell.styles.fontStyle = 'bold'
        }
      },
    })
    y = (doc.lastAutoTable?.finalY ?? y) + 8
  }

  // ── Seção 8: Setlist ──────────────────────────────────────────────────────
  y = checkPageBreak(doc, y, 35)
  y = drawSectionTitle(doc, y, 'Setlist', fonts)

  if (eventSetlists.length === 0) {
    doc.setFont(fonts.body, 'normal').setFontSize(8.5).setTextColor(...MUTED)
    doc.text('Setlist não cadastrado para este show.', MARGIN, y + 4)
    y += 14
  } else {
    eventSetlists.forEach((sl, idx) => {
      if (eventSetlists.length > 1) {
        y = checkPageBreak(doc, y, 20)
        doc.setFont(fonts.condensed, 'bold').setFontSize(9).setTextColor(...BODY_DK)
        doc.text(`${idx + 1}. ${sl.name}`, MARGIN, y)
        y += 6
      }
      const slRows = sl.songs
        .map((songId, i) => {
          const song = songMap[songId]
          if (!song) return null
          return [String(i + 1).padStart(2, '0'), song.title, song.artist || '—']
        })
        .filter(Boolean)

      if (slRows.length === 0) {
        doc.setFont(fonts.body, 'normal').setFontSize(8).setTextColor(...MUTED)
        doc.text('Setlist vazio.', MARGIN + 4, y + 3)
        y += 10
        return
      }

      autoTable(doc, {
        ...tableBase(fonts),
        startY: y,
        head: [['#', 'Título', 'Artista']],
        body: slRows,
        foot: [[`${slRows.length} música${slRows.length !== 1 ? 's' : ''}`, '', '']],
        columnStyles: {
          0: { cellWidth: 12, halign: 'center', font: fonts.mono, textColor: MUTED },
          1: { cellWidth: 106, fontStyle: 'bold' },
          2: { cellWidth: 64 },
        },
      })
      y = (doc.lastAutoTable?.finalY ?? y) + (idx < eventSetlists.length - 1 ? 6 : 8)
    })
  }

  // ── Footers e save ────────────────────────────────────────────────────────
  applyFooters(doc, companyProfile, fonts)

  const nameSlug = event.name.replace(/\s+/g, '_').toLowerCase()
  const dd2  = String(d.getDate()).padStart(2, '0')
  const mm2  = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  doc.save(`relatorio_show_${nameSlug}_${dd2}${mm2}${yyyy}.pdf`)
}

// ── Lista de Backline ─────────────────────────────────────────────────────────
export async function generateBacklineReport({ eventId, state }) {
  const { events, showEquipment: showEqList, equipment: allEquipment, companyProfile } = state

  const event = events.find(e => e.id === eventId)
  if (!event) return

  const showEqRec = (showEqList || []).find(se => se.eventId === eventId)
  const eqIds     = showEqRec?.equipmentIds || []
  const checkedAt = showEqRec?.checkedAt || null
  const notes     = showEqRec?.notes || ''

  const eqItems = eqIds
    .map(id => (allEquipment || []).find(e => e.id === id))
    .filter(Boolean)
    .sort((a, b) => a.category.localeCompare(b.category))

  const d        = new Date(event.date + 'T12:00:00')
  const longDate = d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
  const cityStr  = event.city ? [event.city, event.state].filter(Boolean).join(' / ') : '—'

  const categoryMap = {}
  eqItems.forEach(eq => {
    if (!categoryMap[eq.category]) categoryMap[eq.category] = []
    categoryMap[eq.category].push(eq)
  })
  const categories = Object.keys(categoryMap).sort()

  const doc   = new jsPDF({ unit: 'mm', format: 'a4' })
  const fonts = await registerFonts(doc)
  let y = await drawHeader(doc, 'LISTA DE BACKLINE', fonts, companyProfile)

  doc.setFont(fonts.condensed, 'bold').setFontSize(18).setTextColor(...BODY_DK)
  doc.text('Lista de Backline', PAGE_W / 2, y, { align: 'center' })
  y += 6
  doc.setFont(fonts.body, 'normal').setFontSize(9).setTextColor(...LABEL)
  doc.text(event.name, PAGE_W / 2, y, { align: 'center' })
  y += 5
  doc.setDrawColor(..._colorAccent).setLineWidth(1.5)
  doc.line(72, y, 138, y)
  y += 10

  // ── Seção 1: Dados do Show ────────────────────────────────────────────────
  y = drawSectionTitle(doc, y, 'Dados do Show', fonts)
  autoTable(doc, {
    theme: 'plain',
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    styles:             { cellPadding: [3, 4, 3, 4], fontSize: 8.5, font: fonts.body, textColor: BODY_DK },
    alternateRowStyles: { fillColor: LIGHT_BG },
    columnStyles: {
      0: { cellWidth: 52, fontStyle: 'bold', textColor: LABEL, fontSize: 7 },
    },
    body: [
      ['EVENTO',             event.name],
      ['DATA',               longDate],
      ['CIDADE',             cityStr],
      ['LISTA CONFIRMADA EM', checkedAt ? fmtIsoDateTime(checkedAt) : '—'],
    ],
  })
  y = (doc.lastAutoTable?.finalY ?? y) + 8

  // ── Seção 2: Lista de Backline por categoria ──────────────────────────────
  y = checkPageBreak(doc, y, 20)
  y = drawSectionTitle(doc, y, 'Lista de Backline', fonts)

  if (eqItems.length === 0) {
    doc.setFont(fonts.body, 'normal').setFontSize(8.5).setTextColor(...MUTED)
    doc.text('Nenhum equipamento registrado para este show.', MARGIN, y + 4)
    y += 14
  } else {
    categories.forEach(cat => {
      const items = categoryMap[cat]
      y = checkPageBreak(doc, y, 30)

      // Separator line + category subtitle
      doc.setDrawColor(...LIGHT).setLineWidth(0.4)
      doc.line(MARGIN, y, PAGE_W - MARGIN, y)
      y += 5
      doc.setFont(fonts.condensed, 'bold').setFontSize(10).setTextColor(...BODY_DK)
      doc.text(cat.toUpperCase(), MARGIN, y)
      y += 6

      const rows       = items.map(eq => [
        eq.name,
        eq.condition === 'Precisando de reparo' ? `[!] ${eq.condition}` : eq.condition,
      ])
      const conditions = items.map(eq => eq.condition)

      autoTable(doc, {
        ...tableBase(fonts),
        startY: y,
        head: [['Equipamento', 'Estado']],
        foot: [[`${items.length} item${items.length !== 1 ? 's' : ''}`, '']],
        body: rows,
        columnStyles: {
          0: { cellWidth: 150 },
          1: { cellWidth: 32, halign: 'center' },
        },
        didParseCell: (data) => {
          if (data.section !== 'body') return
          const cond = conditions[data.row.index]
          if (cond === 'Precisando de reparo') {
            data.cell.styles.fillColor = BG_RED
            if (data.column.index === 1) {
              data.cell.styles.textColor = RED
              data.cell.styles.fontStyle = 'bold'
            }
          } else if (data.column.index === 1) {
            data.cell.styles.textColor = cond === 'Ótimo' ? GREEN : cond === 'Bom' ? [14, 116, 187] : ORANGE
            data.cell.styles.fontStyle = 'bold'
          }
        },
      })
      y = (doc.lastAutoTable?.finalY ?? y) + 6
    })

    // Total geral
    y = checkPageBreak(doc, y, 15)
    doc.setFillColor(..._colorBase)
    doc.roundedRect(MARGIN, y, CONTENT_W, 11, 2, 2, 'F')
    doc.setFont(fonts.condensed, 'bold').setFontSize(9).setTextColor(...WHITE)
    doc.text(
      `Total geral: ${eqItems.length} equipamento${eqItems.length !== 1 ? 's' : ''}`,
      PAGE_W / 2, y + 7, { align: 'center' }
    )
    y += 18
  }

  // ── Seção 3: Observações ──────────────────────────────────────────────────
  if (notes.trim()) {
    y = checkPageBreak(doc, y, 30)
    y = drawSectionTitle(doc, y, 'Observações Gerais', fonts)
    doc.setFont(fonts.body, 'normal').setFontSize(9).setTextColor(...BODY_DK)
    const lines = doc.splitTextToSize(notes.trim(), CONTENT_W - 4)
    doc.text(lines, MARGIN + 2, y)
    y += lines.length * 5.5 + 6
  }

  // ── Footers ───────────────────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    drawFooterOnPage(doc, companyProfile, fonts, i, totalPages)
    const fy = PAGE_H - FOOTER_H
    doc.setFont(fonts.body, 'normal').setFontSize(5).setTextColor(...DIM_TEXT)
    doc.text(
      'Documento gerado para uso interno e controle de patrimônio da banda.',
      PAGE_W / 2, fy + 14, { align: 'center' }
    )
  }

  // ── Filename ──────────────────────────────────────────────────────────────
  const slugify = (str) => (str || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
  const dd   = String(d.getDate()).padStart(2, '0')
  const mm   = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const filename = `backline_${slugify(event.name)}_${dd}${mm}${yyyy}.pdf`
  doc.save(filename)
  return filename
}

// ── Orçamento / Proposta Comercial ────────────────────────────────────────────
export async function generateBudgetPdf({ budget, companyProfile }) {
  const doc   = new jsPDF({ unit: 'mm', format: 'a4' })
  const fonts = await registerFonts(doc)
  let y = await drawHeader(doc, 'ORÇAMENTO COMERCIAL', fonts, companyProfile)

  doc.setFont(fonts.condensed, 'bold').setFontSize(18).setTextColor(...BODY_DK)
  doc.text('Orçamento Comercial', PAGE_W / 2, y, { align: 'center' })
  y += 6
  doc.setFont(fonts.body, 'normal').setFontSize(10).setTextColor(...LABEL)
  doc.text(budget.name || 'Orçamento', PAGE_W / 2, y, { align: 'center' })
  y += 5
  doc.setDrawColor(..._colorAccent).setLineWidth(1.5)
  doc.line(72, y, 138, y)
  y += 10

  // ── Informações do Show ────────────────────────────────────────────────────
  y = drawSectionTitle(doc, y, 'Informações do Show', fonts)
  const infoRows = [
    ['NOME / EVENTO',   budget.name     || '—'],
    ['CIDADE',          budget.city     || '—'],
    ['DATA PREVISTA',   budget.eventDate ? fmtDate(budget.eventDate) : '—'],
    ['TIPO',            budget.eventType || '—'],
    ['VALIDADE DA PROPOSTA', budget.validUntil ? fmtDate(budget.validUntil) : '—'],
    ...(budget.notes ? [['OBSERVAÇÕES', budget.notes]] : []),
  ]
  autoTable(doc, {
    theme: 'plain',
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    styles:             { cellPadding: [3, 4, 3, 4], fontSize: 8.5, font: fonts.body, textColor: BODY_DK },
    alternateRowStyles: { fillColor: LIGHT_BG },
    columnStyles: {
      0: { cellWidth: 52, fontStyle: 'bold', textColor: LABEL, fontSize: 7 },
    },
    body: infoRows,
  })
  y = (doc.lastAutoTable?.finalY ?? y) + 8

  // ── Composição de Custos ───────────────────────────────────────────────────
  y = checkPageBreak(doc, y, 40)
  y = drawSectionTitle(doc, y, 'Composição de Custos', fonts)

  const costs = budget.costs || {}
  const others = (costs.others || []).filter(o => o.value > 0)
  const costRows = [
    ...(costs.cachet        > 0 ? [['Cachê dos músicos',  fmtCurrency(costs.cachet)]]        : []),
    ...(costs.transport     > 0 ? [['Transporte',         fmtCurrency(costs.transport)]]      : []),
    ...(costs.fuel          > 0 ? [['Combustível',        fmtCurrency(costs.fuel)]]           : []),
    ...(costs.food          > 0 ? [['Alimentação',        fmtCurrency(costs.food)]]           : []),
    ...(costs.accommodation > 0 ? [['Hospedagem',         fmtCurrency(costs.accommodation)]] : []),
    ...others.map(o => [o.description || 'Outros', fmtCurrency(o.value)]),
  ]
  const totalCosts = (costs.cachet || 0) + (costs.transport || 0) + (costs.fuel || 0) +
    (costs.food || 0) + (costs.accommodation || 0) + others.reduce((s, o) => s + (o.value || 0), 0)

  if (costRows.length === 0) {
    doc.setFont(fonts.body, 'normal').setFontSize(8.5).setTextColor(...MUTED)
    doc.text('Nenhum custo detalhado registrado.', MARGIN, y + 4)
    y += 14
  } else {
    autoTable(doc, {
      ...tableBase(fonts),
      startY: y,
      head: [['Item', 'Valor']],
      body: costRows,
      foot: [['Total de Custos', fmtCurrency(totalCosts)]],
      columnStyles: {
        0: { cellWidth: 140 },
        1: { cellWidth: 42, halign: 'right', font: fonts.mono },
      },
    })
    y = (doc.lastAutoTable?.finalY ?? y) + 8
  }

  // ── Definição do Valor Final ───────────────────────────────────────────────
  y = checkPageBreak(doc, y, 50)
  y = drawSectionTitle(doc, y, 'Definição do Valor Final', fonts)

  const taxAmount    = budget.finalValue * (budget.taxRate / 100)
  const netProfit    = budget.finalValue - totalCosts - taxAmount
  const netMarginPct = budget.finalValue > 0 ? (netProfit / budget.finalValue) * 100 : 0

  y = drawHighlightBlock(doc, y, [
    { label: 'Total de Custos',         value: fmtCurrency(totalCosts),        bold: false },
    { label: `Impostos (${budget.taxRate.toFixed(1)}%)`, value: fmtCurrency(taxAmount), bold: false },
    { label: 'Lucro Líquido Est.',      value: fmtCurrency(netProfit),         bold: false },
    { label: 'Margem Líquida',          value: `${netMarginPct.toFixed(1)}%`,  bold: false },
    { label: 'VALOR FINAL',             value: fmtCurrency(budget.finalValue), bold: true  },
  ], netProfit >= 0 ? 'green' : 'red', fonts)

  // ── Status badge ───────────────────────────────────────────────────────────
  y = checkPageBreak(doc, y, 20)
  const statusColor = budget.status === 'Aprovado' ? GREEN : budget.status === 'Enviado' ? ORANGE : LABEL
  doc.setFillColor(...(budget.status === 'Aprovado' ? BG_GREEN : budget.status === 'Enviado' ? BG_ORANGE : [230, 230, 235]))
  doc.roundedRect(MARGIN, y, CONTENT_W, 12, 2, 2, 'F')
  doc.setFont(fonts.condensed, 'bold').setFontSize(10).setTextColor(...statusColor)
  doc.text(`Status: ${budget.status}`, PAGE_W / 2, y + 8, { align: 'center' })
  y += 18

  // ── Note ──────────────────────────────────────────────────────────────────
  doc.setFont(fonts.body, 'normal').setFontSize(7.5).setTextColor(...MUTED)
  doc.text(
    `Proposta gerada em ${today()} · Válida até ${budget.validUntil ? fmtDate(budget.validUntil) : 'prazo não definido'}`,
    PAGE_W / 2, y, { align: 'center' }
  )

  applyFooters(doc, companyProfile, fonts)
  const nameSlug = (budget.name || 'orcamento').replace(/\s+/g, '_').toLowerCase().replace(/[^a-z0-9_]/g, '')
  doc.save(`orcamento_${nameSlug}.pdf`)
}

// ── Convocação de Ensaio ───────────────────────────────────────────────────
export async function generateRehearsalPdf({ rehearsal, members, songs, companyProfile }) {
  const doc   = new jsPDF({ unit: 'mm', format: 'a4' })
  const fonts = await registerFonts(doc)
  let y = await drawHeader(doc, 'CONVOCAÇÃO DE ENSAIO', fonts, companyProfile)

  // Title
  doc.setFont(fonts.condensed, 'bold').setFontSize(22).setTextColor(...BODY_DK)
  doc.text('Convocação de Ensaio', PAGE_W / 2, y, { align: 'center' })
  y += 5
  doc.setDrawColor(..._colorAccent).setLineWidth(1.5)
  doc.line(70, y, 140, y)
  y += 10

  // Date / time / address block
  const d         = new Date(rehearsal.date + 'T12:00:00')
  const weekday   = d.toLocaleDateString('pt-BR', { weekday: 'long' })
  const dateLabel = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  const fullDate  = weekday.charAt(0).toUpperCase() + weekday.slice(1) + ', ' + dateLabel
  const address   = rehearsal.address || rehearsal.location || '—'

  y = drawHighlightBlock(doc, y, [
    { label: 'Data',     value: fullDate },
    { label: 'Horário', value: rehearsal.time || '—' },
    { label: 'Endereço', value: address },
  ], 'orange', fonts)
  y += 6

  // Convocated members
  const convocated = members.filter(m =>
    (rehearsal.expectedMembers || []).map(String).includes(String(m.id))
  )
  if (convocated.length > 0) {
    y = checkPageBreak(doc, y, 30)
    y = drawSectionTitle(doc, y, 'Membros Convocados', fonts)
    autoTable(doc, {
      ...tableBase(fonts),
      startY: y,
      head: [['#', 'Nome', 'Instrumento / Função']],
      body: convocated.map((m, i) => [
        String(i + 1).padStart(2, '0'),
        m.name,
        m.role || '—',
      ]),
      columnStyles: {
        0: { cellWidth: 12, halign: 'center', textColor: MUTED },
        1: { fontStyle: 'bold' },
        2: { cellWidth: 70 },
      },
    })
    y = (doc.lastAutoTable?.finalY ?? y) + 8
  }

  // Songs to prepare
  const rehearsalSongs = songs.filter(s =>
    (rehearsal.songs || []).map(String).includes(String(s.id))
  )
  if (rehearsalSongs.length > 0) {
    y = checkPageBreak(doc, y, 30)
    y = drawSectionTitle(doc, y, 'Músicas a Preparar', fonts)
    autoTable(doc, {
      ...tableBase(fonts),
      startY: y,
      head: [['#', 'Título', 'Artista']],
      body: rehearsalSongs.map((s, i) => [
        String(i + 1).padStart(2, '0'),
        s.title,
        s.artist || '—',
      ]),
      columnStyles: {
        0: { cellWidth: 12, halign: 'center', textColor: MUTED },
        1: { fontStyle: 'bold' },
        2: { cellWidth: 70 },
      },
    })
    y = (doc.lastAutoTable?.finalY ?? y) + 8
  }

  // Notes
  if (rehearsal.notes?.trim()) {
    y = checkPageBreak(doc, y, 25)
    y = drawSectionTitle(doc, y, 'Observações', fonts)
    doc.setFont(fonts.body, 'normal').setFontSize(9).setTextColor(...BODY_DK)
    const lines = doc.splitTextToSize(rehearsal.notes.trim(), CONTENT_W)
    doc.text(lines, MARGIN, y)
  }

  // "Generated by" note just above the footer on each page
  applyFooters(doc, companyProfile, fonts)
  const totalPages = doc.internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    const noteY = PAGE_H - FOOTER_H - 3
    doc.setFont(fonts.body, 'normal').setFontSize(6).setTextColor(...MUTED)
    doc.text(
      `Este documento foi gerado pelo sistema Akro · ${today()}`,
      PAGE_W / 2, noteY, { align: 'center' }
    )
  }

  const dd   = String(d.getDate()).padStart(2, '0')
  const mm   = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  doc.save(`ensaio_${dd}${mm}${yyyy}.pdf`)
}

// ── Intelligence PDF ───────────────────────────────────────────────────────
export async function generateEventExpensePDF({ event, expenses, members, payments, companyProfile, historicalAvg = 0, historicalCount = 0 }) {
  const doc   = new jsPDF({ unit: 'mm', format: 'a4' })
  const fonts = await registerFonts(doc)
  resolveColors(companyProfile)

  const eventName = event.name || 'Show sem nome'
  let y = await drawHeader(doc, `RELATÓRIO DE DESPESAS — ${eventName.toUpperCase()}`, fonts, companyProfile)

  // Show info block
  doc.setFillColor(30, 30, 30)
  doc.roundedRect(MARGIN, y, CONTENT_W, 30, 3, 3, 'F')
  doc.setFont(fonts.condensed, 'bold').setFontSize(15).setTextColor(...WHITE)
  doc.text(eventName.toUpperCase(), MARGIN + 5, y + 10)
  doc.setFont(fonts.body, 'normal').setFontSize(9).setTextColor(...DIM_TEXT)
  const dateStr  = event.date ? fmtDate(event.date) : '—'
  const location = [event.local, event.city, event.state].filter(Boolean).join(' · ') || '—'
  doc.text(`${dateStr}  ·  ${location}`, MARGIN + 5, y + 18)
  doc.setFont(fonts.body, 'bold').setFontSize(9).setTextColor(...OFF_WH)
  const contractLabel = event.value ? `Valor do contrato: ${fmtCurrency(event.value)}` : 'Valor do contrato não informado'
  doc.text(contractLabel, MARGIN + 5, y + 26)
  y += 36

  // ── Variable expenses grouped by category ─────────────────────────────
  const varExpenses = (expenses || []).filter(e => e.eventId === event.id)
  const catOrder    = ['Alimentação', 'Hospedagem', 'Combustível', 'Outros']
  const catGroups   = {}
  varExpenses.forEach(e => {
    const cat = e.type || 'Outros'
    if (!catGroups[cat]) catGroups[cat] = []
    catGroups[cat].push(e)
  })
  const sortedCats = [
    ...catOrder.filter(c => catGroups[c]),
    ...Object.keys(catGroups).filter(c => !catOrder.includes(c)),
  ]

  y = drawSectionTitle(doc, y, 'Despesas Variáveis por Categoria', fonts)

  let totalVarExp = 0
  if (varExpenses.length === 0) {
    doc.setFont(fonts.body, 'normal').setFontSize(9).setTextColor(...LABEL)
    doc.text('Nenhuma despesa variável registrada para este show.', MARGIN, y + 6)
    y += 14
  } else {
    for (const cat of sortedCats) {
      const items    = catGroups[cat]
      const catTotal = items.reduce((s, e) => s + (e.amount || 0), 0)
      totalVarExp   += catTotal

      y = checkPageBreak(doc, y, 24)
      doc.setFillColor(240, 240, 240)
      doc.rect(MARGIN, y, CONTENT_W, 7, 'F')
      doc.setFont(fonts.condensed, 'bold').setFontSize(9).setTextColor(...BODY_DK)
      doc.text(cat.toUpperCase(), MARGIN + 3, y + 5)
      doc.setFont(fonts.mono, 'bold').setFontSize(9)
      doc.text(fmtCurrency(catTotal), PAGE_W - MARGIN - 1, y + 5, { align: 'right' })
      y += 8

      const rows = items.map(e => [e.description || '—', e.date ? fmtDate(e.date) : '—', fmtCurrency(e.amount || 0)])
      autoTable(doc, {
        ...tableBase(fonts),
        startY: y,
        head: [['Descrição', 'Data', 'Valor']],
        body: rows,
        theme: 'plain',
        styles: { fontSize: 8.5, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 }, textColor: BODY_DK, font: fonts.body, fontStyle: 'normal' },
        headStyles: { fillColor: [235, 235, 235], textColor: LABEL, fontStyle: 'bold', fontSize: 8, font: fonts.condensed },
        columnStyles: { 2: { halign: 'right' } },
        margin: { left: MARGIN + 3, right: MARGIN },
      })
      y = doc.lastAutoTable.finalY + 4
    }

    y = checkPageBreak(doc, y, 14)
    doc.setFillColor(..._colorAccent)
    doc.roundedRect(MARGIN, y, CONTENT_W, 8, 2, 2, 'F')
    doc.setFont(fonts.condensed, 'bold').setFontSize(10).setTextColor(...WHITE)
    doc.text('TOTAL DESPESAS VARIÁVEIS', MARGIN + 4, y + 5.5)
    doc.setFont(fonts.mono, 'bold').setFontSize(10)
    doc.text(fmtCurrency(totalVarExp), PAGE_W - MARGIN - 2, y + 5.5, { align: 'right' })
    y += 14
  }

  // ── Member caches ──────────────────────────────────────────────────────
  const eventMembers = (event.members || []).map(id => members.find(m => m.id === id)).filter(Boolean)
  const totalCaches  = eventMembers.reduce((s, m) => s + calcEntryValue(payments[event.id]?.[m.id] ?? {}, m.cache), 0)

  y = checkPageBreak(doc, y, 40)
  y = drawSectionTitle(doc, y, 'Cachês dos Músicos', fonts)

  if (eventMembers.length === 0) {
    doc.setFont(fonts.body, 'normal').setFontSize(9).setTextColor(...LABEL)
    doc.text('Nenhum músico escalado para este show.', MARGIN, y + 6)
    y += 14
  } else {
    const cacheRows = eventMembers.map(m => {
      const entry  = payments[event.id]?.[m.id] ?? {}
      const value  = calcEntryValue(entry, m.cache)
      const status = entry.paid ? 'Pago' : entry.partial ? 'Parcial' : 'Pendente'
      return [m.name, m.role || '—', fmtCurrency(value), status]
    })
    autoTable(doc, {
      ...tableBase(fonts),
      startY: y,
      head: [['Músico', 'Instrumento/Cargo', 'Cachê', 'Status']],
      body: cacheRows,
      columnStyles: { 2: { halign: 'right' } },
    })
    y = doc.lastAutoTable.finalY + 8
  }

  // ── Financial summary ──────────────────────────────────────────────────
  const totalCost = totalVarExp + totalCaches
  const revenue   = event.value || 0
  const result    = revenue - totalCost
  const margin    = revenue > 0 ? Math.round((result / revenue) * 100) : 0

  y = checkPageBreak(doc, y, 55)
  y = drawSectionTitle(doc, y, 'Resumo Financeiro', fonts)
  y = drawHighlightBlock(doc, y, [
    { label: 'Cachês dos Músicos',                value: fmtCurrency(totalCaches), bold: false },
    { label: 'Total Despesas Variáveis',          value: fmtCurrency(totalVarExp), bold: false },
    { label: 'Custo Total',                       value: fmtCurrency(totalCost),   bold: true  },
    { label: 'Receita do Show',                   value: fmtCurrency(revenue),     bold: false },
    { label: `Lucro Líquido (margem ${margin}%)`, value: fmtCurrency(result),      bold: true  },
  ], result >= 0 ? 'green' : 'red', fonts)

  // ── Analytical paragraph ───────────────────────────────────────────────
  y = checkPageBreak(doc, y, 50)
  y = drawSectionTitle(doc, y, 'Análise', fonts)

  const paragraphs = []

  if (revenue > 0) {
    const costRatio = Math.round((totalCost / revenue) * 100)
    paragraphs.push(
      `Este show gerou receita de ${fmtCurrency(revenue)} com custo operacional de ${fmtCurrency(totalCost)} (${costRatio}% do contrato), resultando em ${result >= 0 ? 'lucro' : 'prejuízo'} líquido de ${fmtCurrency(Math.abs(result))}.`
    )
  } else {
    paragraphs.push(`Este show apresentou custo operacional total de ${fmtCurrency(totalCost)}, sem valor de contrato registrado.`)
  }

  if (historicalCount > 1 && historicalAvg > 0) {
    const diff    = totalCost - historicalAvg
    const diffPct = Math.round((Math.abs(diff) / historicalAvg) * 100)
    if (diff > historicalAvg * 0.15) {
      paragraphs.push(
        `O custo está ${diffPct}% acima da média histórica dos outros ${historicalCount - 1} shows (${fmtCurrency(historicalAvg)}), indicando despesas operacionais excepcionalmente elevadas neste evento.`
      )
    } else if (diff < -historicalAvg * 0.15) {
      paragraphs.push(
        `O custo está ${diffPct}% abaixo da média histórica dos outros ${historicalCount - 1} shows (${fmtCurrency(historicalAvg)}), representando uma execução financeiramente eficiente.`
      )
    } else {
      paragraphs.push(
        `O custo está alinhado com a média histórica dos outros ${historicalCount - 1} shows (${fmtCurrency(historicalAvg)}), sem desvios significativos.`
      )
    }
  }

  if (varExpenses.length > 0 && totalVarExp > 0) {
    const catMap = varExpenses.reduce((acc, e) => {
      const c = e.type || 'Outros'; acc[c] = (acc[c] || 0) + (e.amount || 0); return acc
    }, {})
    const dom    = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0]
    const domPct = Math.round((dom[1] / totalVarExp) * 100)
    paragraphs.push(
      `Entre as despesas variáveis, ${dom[0]} foi a categoria predominante, correspondendo a ${domPct}% do total variável (${fmtCurrency(dom[1])}). ${domPct >= 60 ? 'Essa concentração sugere oportunidade de diversificação ou negociação nessa categoria.' : 'A composição das demais categorias está dentro de um nível aceitável de diversificação.'}`
    )
  }

  paragraphs.forEach(text => {
    y = checkPageBreak(doc, y, 22)
    const lines = doc.splitTextToSize(text, CONTENT_W - 4)
    doc.setFont(fonts.body, 'normal').setFontSize(9).setTextColor(...BODY_DK)
    doc.text(lines, MARGIN + 2, y)
    y += lines.length * 5 + 5
  })

  applyFooters(doc, companyProfile, fonts)

  const slug = (event.name || 'show').toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30)
  doc.save(`despesas_${slug}_${event.date || 'sem_data'}.pdf`)
}

export async function generateIntelligencePDF({ moduleName, periodLabel, companyProfile, blocks = [], filename }) {
  const doc   = new jsPDF({ unit: 'mm', format: 'a4' })
  const fonts = await registerFonts(doc)
  resolveColors(companyProfile)

  const docTitle = `${moduleName} · ${periodLabel}`
  let y = await drawHeader(doc, docTitle, fonts, companyProfile)

  // Module label block
  doc.setFillColor(30, 30, 30)
  doc.roundedRect(MARGIN, y, CONTENT_W, 14, 3, 3, 'F')
  doc.setFont(fonts.condensed, 'bold').setFontSize(13).setTextColor(...WHITE)
  doc.text(moduleName.toUpperCase(), MARGIN + 5, y + 9.5)
  doc.setFont(fonts.body, 'normal').setFontSize(8).setTextColor(...DIM_TEXT)
  doc.text(periodLabel, PAGE_W - MARGIN - 3, y + 9.5, { align: 'right' })
  y += 20

  for (const block of blocks) {
    if (!block) continue

    if (block.type === 'chart') {
      y = checkPageBreak(doc, y, 80)
      y = drawSectionTitle(doc, y, block.title, fonts)
      if (block.imageDataUrl) {
        const imgH = 65
        try { doc.addImage(block.imageDataUrl, 'PNG', MARGIN, y, CONTENT_W, imgH) } catch {}
        y += imgH + 4
      }
      y += 4

    } else if (block.type === 'insight') {
      if (!block.text) continue
      y = checkPageBreak(doc, y, 24)
      doc.setFont(fonts.body, 'normal').setFontSize(8).setTextColor(92, 64, 10)
      const lines = doc.splitTextToSize(`• ${block.text}`, CONTENT_W - 8)
      const blockH = Math.max(10, lines.length * 5 + 6)
      doc.setFillColor(254, 243, 199)
      doc.roundedRect(MARGIN, y, CONTENT_W, blockH, 2, 2, 'F')
      doc.setFillColor(245, 158, 11)
      doc.rect(MARGIN, y, 1.5, blockH, 'F')
      doc.text(lines, MARGIN + 5, y + 6)
      y += blockH + 4

    } else if (block.type === 'analytic') {
      if (!block.text) continue
      y = checkPageBreak(doc, y, 20)
      doc.setFont(fonts.body, 'normal').setFontSize(8.5).setTextColor(71, 85, 105)
      const lines = doc.splitTextToSize(block.text, CONTENT_W - 8)
      const blockH = Math.max(12, lines.length * 5 + 8)
      doc.setFillColor(248, 250, 252)
      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.3)
      doc.roundedRect(MARGIN, y, CONTENT_W, blockH, 2, 2, 'FD')
      doc.text(lines, MARGIN + 4, y + 6)
      y += blockH + 4
    }
  }

  applyFooters(doc, companyProfile, fonts)

  const fname = filename || `inteligencia_${moduleName.toLowerCase().replace(/\s+/g, '_')}.pdf`
  doc.save(fname)
}
