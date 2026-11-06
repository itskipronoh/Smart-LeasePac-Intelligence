import type { Customer, LeaseAgreement, LeaseApplication } from './types'
import { customerName, fmtDate, fmtMoney, summarize } from './engine'

export const LESSOR = {
  name: 'Demo Leasing Company Ltd (fictional)', address: 'Demo Plaza, Upper Hill, Nairobi, Kenya', reg: 'CPR/2020/000000 (demo)',
}

/** Agreement body shared by the on-screen preview and the PDF so both show the same approved data. */
export function agreementClauses(app: LeaseApplication, c: Customer) {
  const s = summarize(app.terms)
  const t = app.terms
  return {
    s,
    parties: [
      ['Lessor', `${LESSOR.name}, ${LESSOR.address}`],
      ['Lessee', `${customerName(c)} (${c.customerNo}), ${c.type === 'Business / Corporate' ? `Reg. ${c.regNo}, PIN ${c.pin}` : `${c.idType} ${c.idNumber}, PIN ${c.pin || 'pending'}`}`],
      ['Lessee address', `${c.physicalAddress}, ${c.city}, ${c.county}, ${c.country}`],
      ['Lessee contacts', `${c.email} · ${c.mobile}`],
    ],
    asset: [
      ['Asset category', app.asset.category], ['Description', app.asset.description], ['Supplier', app.asset.supplier],
    ],
    financial: [
      ['Asset purchase value', fmtMoney(t.price)], ['Customer deposit', fmtMoney(t.deposit)], ['Amount financed', fmtMoney(s.financed)],
      ['Lease period', `${t.termMonths} months (${s.schedule.length} ${t.frequency.toLowerCase()} installments)`],
      ['Annual financing rate', `${t.ratePct}% (reducing balance, illustrative)`],
      ['Installment', fmtMoney(s.installment)], ['Arrangement fee', fmtMoney(s.fee)],
      ['Total financing cost', fmtMoney(s.cost)], ['Total scheduled installments', fmtMoney(s.total)],
      ['Effective date', fmtDate(t.startDate)],
    ],
  }
}

async function make() {
  const { jsPDF } = await import('jspdf')
  return new jsPDF({ unit: 'pt', format: 'a4' })
}

export async function downloadAgreementPdf(app: LeaseApplication, c: Customer, ag: LeaseAgreement) {
  const doc = await make()
  const { s, parties, asset, financial } = agreementClauses(app, c)
  const W = 595, M = 48
  let y = 56
  const ensure = (h: number) => { if (y + h > 790) { doc.addPage(); y = 56 } }
  const text = (t: string, size = 10, bold = false, x = M) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size)
    const lines = doc.splitTextToSize(t, W - M * 2 - (x - M)) as string[]
    lines.forEach((l) => { ensure(size + 4); doc.text(l, x, y); y += size + 4 })
  }
  const row = (k: string, v: string) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5)
    const lines = doc.splitTextToSize(v, 340) as string[]
    ensure(lines.length * 13 + 2)
    doc.text(k, M, y); doc.setFont('helvetica', 'normal'); lines.forEach((l) => { doc.text(l, 190, y); y += 13 }); y += 2
  }
  doc.setFillColor(11, 42, 74); doc.rect(0, 0, W, 34, 'F')
  doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
  doc.text('SMART LEASEPAC · DEMONSTRATION AGREEMENT — NOT LEGALLY REVIEWED', M, 22)
  doc.setTextColor(18, 35, 58); y = 68
  text('LEASE AGREEMENT', 20, true)
  text(`Reference ${ag.ref} · Version ${ag.version} · Status: ${ag.status} · Application ${app.ref}`, 9.5)
  text(`Generated ${new Date(ag.generatedAt).toLocaleString('en-GB')} by ${ag.generatedBy}`, 9.5); y += 8
  text('1. Parties', 12, true); parties.forEach(([k, v]) => row(k, v)); y += 6
  text('2. Leased asset', 12, true); asset.forEach(([k, v]) => row(k, v)); y += 6
  text('3. Financial terms', 12, true); financial.forEach(([k, v]) => row(k, v)); y += 6
  text('4. Repayment schedule', 12, true)
  const cols = [M, 90, 170, 260, 345, 430, 500]
  const head = ['#', 'Date', 'Opening', 'Installment', 'Charge', 'Principal', 'Closing']
  const drawHead = () => { ensure(16); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); head.forEach((h, i) => doc.text(h, cols[i], y)); y += 12 }
  drawHead()
  doc.setFont('helvetica', 'normal')
  s.schedule.forEach((r) => {
    if (y > 780) { doc.addPage(); y = 56; drawHead(); doc.setFont('helvetica', 'normal') }
    doc.setFontSize(8)
    const vals = [String(r.period), fmtDate(r.date), r.opening, r.installment, r.charge, r.principal, r.closing].map((v) => (typeof v === 'number' ? Math.round(v).toLocaleString('en-KE') : v))
    vals.forEach((v, i) => doc.text(v, cols[i], y)); y += 11
  })
  y += 10
  text('5. Applicable terms', 12, true)
  text('The Lessee shall pay each installment on its due date. Title to the asset remains with the Lessor until all sums due are paid. The Lessee shall insure and maintain the asset for the lease period. Early settlement and default provisions follow the Lessor\'s lease product terms (to be aligned with LeasePac production rules).', 9.5)
  y += 6
  text('6. Signatures (placeholders — no e-signature service connected)', 12, true); y += 14
  ensure(60)
  doc.setFontSize(9)
  doc.line(M, y + 24, M + 200, y + 24); doc.line(320, y + 24, 520, y + 24)
  doc.text(`For the Lessor — ${LESSOR.name}`, M, y + 38); doc.text(`Lessee — ${customerName(c)}`, 320, y + 38)
  y += 60
  text('This document is a hackathon demonstration generated from synthetic data. It is not a legally reviewed contract and carries no legal effect.', 8.5)
  doc.save(`${ag.ref}_v${ag.version}.pdf`)
}

export async function downloadQuotePdf(app: LeaseApplication, c: Customer) {
  const doc = await make()
  const s = summarize(app.terms)
  let y = 60
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.text('Lease Quotation (prototype estimate)', 48, y); y += 24
  doc.setFontSize(10); doc.setFont('helvetica', 'normal')
  const lines = [
    `Application: ${app.ref}`, `Customer: ${customerName(c)} (${c.customerNo})`, `Asset: ${app.asset.description}`, '',
    `Asset price: ${fmtMoney(app.terms.price)}`, `Deposit: ${fmtMoney(app.terms.deposit)}`, `Amount financed: ${fmtMoney(s.financed)}`,
    `Term: ${app.terms.termMonths} months at ${app.terms.ratePct}% p.a., ${app.terms.frequency.toLowerCase()}`,
    `Installment: ${fmtMoney(s.installment)}`, `Total installments: ${fmtMoney(s.total)}`, `Total financing cost: ${fmtMoney(s.cost)}`, `Arrangement fee: ${fmtMoney(s.fee)}`,
    `Total expected payments: ${fmtMoney(s.expectedPayments)}`, '',
    'Illustrative calculation using a reducing-balance model. Requires alignment with actual LeasePac product rules. Not an offer.',
  ]
  lines.forEach((l) => { doc.text(doc.splitTextToSize(l, 500) as string[], 48, y); y += 16 })
  doc.save(`Quote_${app.ref}.pdf`)
}
