import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { fmtCurrency, fmtDate } from './format'

// ── Palette ───────────────────────────────────────────────────────────────
const BG_DARK  = [8,   9,   9  ]
const ORANGE   = [249, 115, 22 ]
const BODY_DK  = [20,  20,  20 ]
const LABEL    = [80,  80,  80 ]
const LIGHT    = [210, 205, 202]
const WHITE    = [255, 255, 255]
const OFF_WH   = [220, 220, 220]
const DIM_TEXT = [155, 155, 155]
const LIGHT_BG = [244, 241, 236]
const MUTED    = [120, 120, 120]

const HEADER_H = 28
const FOOTER_H = 16

// ── Dynamic brand colors ──────────────────────────────────────────────────
let _colorBase   = BG_DARK
let _colorAccent = ORANGE
let _colorFont   = BODY_DK

function hexToRgb(hex) {
  if (!hex) return null
  const h = hex.replace('#', '')
  if (h.length !== 6) return null
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]
}

function resolveColors(profile) {
  _colorBase   = hexToRgb(profile?.brandColorBase)   || BG_DARK
  _colorAccent = hexToRgb(profile?.brandColorAccent) || ORANGE
  _colorFont   = hexToRgb(profile?.brandColorFont)   || BODY_DK
}

const MONTHS_LONG = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

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

// ── Font loading (cached in memory across calls) ───────────────────────────
const fontCache = new Map()

async function loadFontBase64(url) {
  if (fontCache.has(url)) return fontCache.get(url)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Font fetch failed (${res.status}): ${url}`)
  const buf = await res.arrayBuffer()
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
  const hasBR  = reg(brR,  'Barlow-Regular.ttf',         'Barlow', 'normal')
  const hasBB  = reg(bbR,  'Barlow-Bold.ttf',             'Barlow', 'bold')
  const hasJMR = reg(jmrR, 'JetBrainsMono-Regular.ttf',  'JetBrainsMono', 'normal')
  const hasJMB = reg(jmbR, 'JetBrainsMono-Bold.ttf',      'JetBrainsMono', 'bold')

  return {
    condensed: hasBC             ? 'BarlowCondensed' : 'helvetica',
    body:      (hasBR || hasBB)  ? 'Barlow'          : 'helvetica',
    mono:      (hasJMR || hasJMB)? 'JetBrainsMono'   : 'courier',
  }
}

// ── Akro logo mark ────────────────────────────────────────────────────────
function drawAkroMark(doc, xOff, yOff, markH) {
  const s  = markH / 33
  const ax = xOff + 18 * s,   ay = yOff + 0.5  * s
  const bx = xOff + 35.5 * s, by = yOff + 32.5 * s
  const cx = xOff + 0.5  * s, cy = yOff + 32.5 * s

  // Accent filled triangle
  doc.setFillColor(..._colorAccent)
  doc.setDrawColor(..._colorAccent)
  doc.setLineWidth(0.1)
  doc.lines([[bx - ax, by - ay], [cx - bx, cy - by]], ax, ay, [1, 1], 'F', true)

  // Dark double chevron — round caps/joins for smooth apex
  doc.setDrawColor(28, 25, 23)
  doc.setLineWidth(2.2 * (markH / 18))
  doc.setLineCap(1)   // round
  doc.setLineJoin(1)  // round

  doc.line(xOff +  9 * s, yOff + 26   * s, xOff + 18 * s, yOff + 19 * s)
  doc.line(xOff + 18 * s, yOff + 19   * s, xOff + 27 * s, yOff + 26 * s)
  doc.line(xOff +  6 * s, yOff + 31.5 * s, xOff + 18 * s, yOff + 24 * s)
  doc.line(xOff + 18 * s, yOff + 24   * s, xOff + 30 * s, yOff + 31.5 * s)

  doc.setLineCap(0)
  doc.setLineJoin(0)
  doc.setLineWidth(0.4)

  return xOff + 35.5 * s  // right edge
}

// ── Header ────────────────────────────────────────────────────────────────
function drawHeader(doc, docTitle, fonts) {
  doc.setFillColor(..._colorBase)
  doc.rect(0, 0, 210, HEADER_H, 'F')

  const markH    = 18
  const markRight = drawAkroMark(doc, 10, (HEADER_H - markH) / 2, markH)
  const textX    = markRight + 3

  // "KRO" — logotype wordmark
  doc.setTextColor(...WHITE)
  doc.setFont(fonts.condensed, 'bold')
  doc.setFontSize(17)
  doc.text('KRO', textX, 15.5)

  // Tagline
  doc.setFontSize(5.5)
  doc.setTextColor(...OFF_WH)
  doc.text('GESTÃO MUSICAL', textX, 22.5)

  // Document title — right side
  doc.setFont(fonts.body, 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...OFF_WH)
  doc.text(docTitle, 196, 14, { align: 'right' })

  return HEADER_H + 8
}

// ── Footer ────────────────────────────────────────────────────────────────
function drawFooter(doc, profile, fonts) {
  const H  = doc.internal.pageSize.height
  const fy = H - FOOTER_H

  doc.setFillColor(..._colorBase)
  doc.rect(0, fy, 210, FOOTER_H, 'F')

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

// ── Signature ─────────────────────────────────────────────────────────────
function drawSignature(doc, member, companyProfile, fonts) {
  const ph    = doc.internal.pageSize.height
  const sigY  = ph - FOOTER_H - 38
  const cLabel = companyProfile?.companyName || 'Responsável'
  const cCnpj  = companyProfile?.cnpj || null

  doc.setDrawColor(...LIGHT)
  doc.setLineWidth(0.5)
  doc.line(14, sigY, 90, sigY)
  doc.line(120, sigY, 196, sigY)

  doc.setFont(fonts.body, 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...LABEL)
  doc.text('Assinatura do Favorecido',  52,  sigY + 6, { align: 'center' })
  doc.text('Assinatura do Responsável', 158, sigY + 6, { align: 'center' })

  doc.setFontSize(7)
  doc.setTextColor(...MUTED)
  doc.text(member.name, 52, sigY + 11, { align: 'center' })
  if (member.cpf) doc.text(fmtCpf(member.cpf), 52, sigY + 15, { align: 'center' })
  doc.text(cLabel, 158, sigY + 11, { align: 'center' })
  if (cCnpj) doc.text(`CNPJ: ${cCnpj}`, 158, sigY + 15, { align: 'center' })
}

// ── Exports ───────────────────────────────────────────────────────────────
export async function generateReceipt({ event, member, paidValue, companyProfile }) {
  resolveColors(companyProfile)
  const doc   = new jsPDF({ unit: 'mm', format: 'a4' })
  const fonts = await registerFonts(doc)
  let y = drawHeader(doc, 'RECIBO DE PAGAMENTO', fonts)

  doc.setTextColor(..._colorFont)
  doc.setFont(fonts.condensed, 'bold')
  doc.setFontSize(18)
  doc.text('Recibo de Pagamento', 105, y, { align: 'center' })
  y += 7

  doc.setDrawColor(..._colorAccent)
  doc.setLineWidth(1.5)
  doc.line(72, y, 138, y)
  y += 12

  const fields = [
    ['Evento',          event.name],
    ['Data do Evento',  fmtDate(event.date)],
    ['Local',           event.local || '—'],
    ['Favorecido',      member.name],
    ['CPF',             fmtCpf(member.cpf)],
    ['Cargo',           member.role],
  ]
  fields.forEach(([label, value]) => {
    doc.setFontSize(8.5)
    doc.setFont(fonts.body, 'bold')
    doc.setTextColor(...LABEL)
    doc.text(`${label}:`, 14, y)
    doc.setFont(fonts.body, 'normal')
    doc.setTextColor(..._colorFont)
    doc.text(String(value), 62, y)
    y += 7
  })

  y += 6

  doc.setFillColor(...LIGHT_BG)
  doc.setDrawColor(..._colorAccent)
  doc.setLineWidth(1)
  doc.roundedRect(14, y, 182, 26, 4, 4, 'FD')
  doc.setFont(fonts.body, 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...LABEL)
  doc.text('VALOR PAGO', 105, y + 9, { align: 'center' })
  doc.setFont(fonts.mono, 'normal')
  doc.setFontSize(22)
  doc.setTextColor(..._colorAccent)
  doc.text(fmtCurrency(paidValue), 105, y + 20, { align: 'center' })

  drawSignature(doc, member, companyProfile, fonts)
  drawFooter(doc, companyProfile, fonts)
  doc.save(`recibo_${member.name.replace(/\s+/g, '_')}_${event.date}.pdf`)
}

export async function generatePayslip({ member, events, payments, companyProfile, month, year }) {
  resolveColors(companyProfile)
  const doc   = new jsPDF({ unit: 'mm', format: 'a4' })
  const fonts = await registerFonts(doc)
  let y = drawHeader(doc, 'HOLERITE MENSAL', fonts)

  doc.setTextColor(..._colorFont)
  doc.setFont(fonts.condensed, 'bold')
  doc.setFontSize(18)
  doc.text('Holerite Mensal', 105, y, { align: 'center' })
  y += 6

  doc.setFont(fonts.body, 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...LABEL)
  doc.text(`Competência: ${MONTHS_LONG[month]} / ${year}`, 105, y, { align: 'center' })
  y += 5

  doc.setDrawColor(..._colorAccent)
  doc.setLineWidth(1.5)
  doc.line(72, y, 138, y)
  y += 10

  const info = [
    ['Favorecido',  member.name],
    ['CPF',         fmtCpf(member.cpf)],
    ['Cargo',       member.role],
    ['Competência', `${MONTHS_LONG[month]} de ${year}`],
  ]
  info.forEach(([label, value]) => {
    doc.setFontSize(8.5)
    doc.setFont(fonts.body, 'bold')
    doc.setTextColor(...LABEL)
    doc.text(`${label}:`, 14, y)
    doc.setFont(fonts.body, 'normal')
    doc.setTextColor(..._colorFont)
    doc.text(String(value), 62, y)
    y += 7
  })

  y += 4

  const rows = events.map(ev => {
    const entry = payments[ev.id]?.[member.id] ?? {}
    const base  = member.cache ?? 0
    const val   = entry.customValue != null ? entry.customValue : (entry.doubled ? base * 2 : base)
    const bonus = entry.customValue != null ? (entry.customValue - base) : (entry.doubled ? base : 0)
    const statusLabel = entry.paid ? 'Pago' : (entry.partial ? 'Parcial' : 'Pendente')
    return [ev.name, fmtDate(ev.date), ev.local || ev.city || '—', fmtCurrency(val), bonus !== 0 ? (bonus > 0 ? `+${fmtCurrency(bonus)}` : fmtCurrency(bonus)) : '—', statusLabel]
  })

  autoTable(doc, {
    startY: y,
    head: [['Evento', 'Data', 'Local', 'Valor', 'Ajuste', 'Status']],
    body: rows,
    theme: 'grid',
    styles:             { fontSize: 7.5, cellPadding: 2.5, textColor: _colorFont, font: fonts.body, fontStyle: 'normal' },
    headStyles:         { fillColor: _colorBase, textColor: WHITE, fontStyle: 'bold', fontSize: 7.5, font: fonts.condensed },
    alternateRowStyles: { fillColor: LIGHT_BG },
    columnStyles: {
      0: { cellWidth: 48 },
      1: { cellWidth: 22 },
      2: { cellWidth: 46 },
      3: { cellWidth: 26, halign: 'right', font: fonts.mono, fontStyle: 'normal' },
      4: { cellWidth: 22, halign: 'right', font: fonts.mono, fontStyle: 'normal' },
      5: { cellWidth: 18, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  })

  const after = (doc.lastAutoTable?.finalY ?? y) + 8

  const totalAll  = events.reduce((s, ev) => {
    const entry = payments[ev.id]?.[member.id] ?? {}
    const base  = member.cache ?? 0
    return s + (entry.customValue != null ? entry.customValue : (entry.doubled ? base * 2 : base))
  }, 0)
  const paidTotal = events.reduce((s, ev) => {
    const entry = payments[ev.id]?.[member.id] ?? {}
    const base  = member.cache ?? 0
    const val   = entry.customValue != null ? entry.customValue : (entry.doubled ? base * 2 : base)
    if (entry.paid)    return s + val
    if (entry.partial) return s + (entry.partialAmount ?? 0)
    return s
  }, 0)
  const pending = totalAll - paidTotal

  // Compact financial summary box — centred on page, 70×22mm
  const boxW = 70, boxH = 22, boxX = 105 - boxW / 2, boxCX = 105

  doc.setFillColor(..._colorBase)
  doc.roundedRect(boxX, after, boxW, boxH, 2, 2, 'F')

  doc.setFont(fonts.condensed, 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...WHITE)
  doc.text('RESUMO FINANCEIRO', boxCX, after + 6, { align: 'center' })

  doc.setFont(fonts.mono, 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(...OFF_WH)
  doc.text(`Total:   ${fmtCurrency(totalAll)}`,  boxCX, after + 11.5, { align: 'center' })
  doc.text(`Pago:    ${fmtCurrency(paidTotal)}`,  boxCX, after + 16,   { align: 'center' })
  doc.text(`Aberto:  ${fmtCurrency(pending)}`,    boxCX, after + 20.5, { align: 'center' })

  drawSignature(doc, member, companyProfile, fonts)
  drawFooter(doc, companyProfile, fonts)
  doc.save(`holerite_${member.name.replace(/\s+/g, '_')}_${MONTHS_LONG[month]}_${year}.pdf`)
}
