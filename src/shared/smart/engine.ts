import type {
  ActiveLease, CreditAssessment, Customer, CustomerDocument, LeaseApplication, RepaymentInstallment,
  RiskFactor, Role, Status, Terms,
} from './types'

/* ---------- formatting ---------- */
export const fmtMoney = (n: number, cur = 'KES') =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(Math.round(n || 0))
export const fmtNum = (n: number) => new Intl.NumberFormat('en-KE').format(Math.round(n || 0))
export const fmtDate = (iso?: string) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
export const fmtDateTime = (iso?: string) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
export const customerName = (c?: Customer) =>
  !c ? 'Unknown' : c.type === 'Business / Corporate' ? c.businessName || 'Unnamed business' : [c.firstName, c.middleName, c.lastName].filter(Boolean).join(' ') || 'Unnamed customer'
export const uid = (p: string) => p + '-' + Math.random().toString(36).slice(2, 8)

/* ---------- repayment model (illustrative; align with LeasePac product rules) ---------- */
export const financedAmount = (t: Terms) => Math.max(0, t.price - t.deposit)
export const periodsOf = (t: Terms) => Math.max(1, Math.round(t.termMonths / (t.frequency === 'Monthly' ? 1 : 3)))
export function buildSchedule(t: Terms): RepaymentInstallment[] {
  const F = financedAmount(t)
  const n = periodsOf(t)
  const i = t.ratePct / 100 / (t.frequency === 'Monthly' ? 12 : 4)
  const R = (t.price * t.residualPct) / 100
  const pmt = i === 0 ? (F - R) / n : ((F - R / Math.pow(1 + i, n)) * i) / (1 - Math.pow(1 + i, -n))
  const rows: RepaymentInstallment[] = []
  let bal = F
  const start = new Date(t.startDate || Date.now())
  for (let p = 1; p <= n; p++) {
    const d = new Date(start)
    d.setMonth(d.getMonth() + p * (t.frequency === 'Monthly' ? 1 : 3))
    const charge = bal * i
    let principal = pmt - charge
    let inst = pmt
    if (p === n) { principal = bal; inst = bal + charge }
    const closing = Math.max(0, bal - principal)
    rows.push({ period: p, date: d.toISOString().slice(0, 10), opening: bal, installment: inst, charge, principal, closing })
    bal = closing
  }
  return rows
}
export function summarize(t: Terms) {
  const s = buildSchedule(t)
  const financed = financedAmount(t)
  const total = s.reduce((a, r) => a + r.installment, 0)
  const fee = (financed * t.arrangementFeePct) / 100
  const regular = s.length ? s[0].installment : 0
  return {
    schedule: s, financed, installment: regular, total, cost: total - financed,
    fee, expectedPayments: total + fee,
    monthlyEquivalent: t.frequency === 'Monthly' ? regular : regular / 3,
    residual: (t.price * t.residualPct) / 100,
  }
}

/* ---------- documents ---------- */
export const requiredDocTypes = (type: Customer['type']): string[] =>
  type === 'Business / Corporate'
    ? ['Certificate of Incorporation', 'KRA PIN Certificate', 'Bank Statements (6 months)', 'Audited / Management Accounts']
    : ['National ID / Passport', 'KRA PIN Certificate', 'Bank Statements (6 months)', 'Payslip / Proof of Income']
export const optionalDocTypes = ['Supplier Quotation', 'Lease Supporting Document']
export function ensureDocSlots(type: Customer['type'], docs: CustomerDocument[]): CustomerDocument[] {
  const wanted = [...requiredDocTypes(type).map((t) => [t, true] as const), ...optionalDocTypes.map((t) => [t, false] as const)]
  return wanted.map(([t, req]) => docs.find((d) => d.type === t) ?? { id: uid('doc'), type: t, required: req, status: 'Missing' as const })
}
export const missingDocs = (c: Customer) =>
  ensureDocSlots(c.type, c.documents).filter((d) => d.required && (d.status === 'Missing')).map((d) => d.type)

/* Simulated OCR adapter: deterministic, seeded. Replace with an approved document-AI service. */
export interface Extracted { docType: string; field: keyof Customer; label: string; value: string; existing: string }
const hash = (s: string) => [...s].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7)
export function simulateExtraction(c: Customer): Extracted[] {
  const h = hash(customerName(c) + c.customerNo)
  const out: Extracted[] = []
  const ex = (docType: string, field: keyof Customer, label: string, seeded: string) =>
    out.push({ docType, field, label, value: String(c[field] || '') || seeded, existing: String(c[field] || '') })
  const has = (t: string) => c.documents.some((d) => d.type === t && d.status !== 'Missing')
  if (c.type === 'Business / Corporate') {
    if (has('Certificate of Incorporation')) {
      ex('Certificate of Incorporation', 'regNo', 'Registration number', `CPR/${2015 + (h % 8)}/${100000 + (h % 899999)}`)
      ex('Certificate of Incorporation', 'businessName', 'Registered business name', 'Registered Business Ltd')
    }
    if (has('KRA PIN Certificate')) ex('KRA PIN Certificate', 'pin', 'KRA PIN', `P${String(100000000 + (h % 899999999)).slice(0, 9)}K`)
    if (has('Audited / Management Accounts')) ex('Audited / Management Accounts', 'monthlyIncome', 'Average monthly revenue (KES)', String(400000 + (h % 600000)))
  } else {
    if (has('National ID / Passport')) {
      ex('National ID / Passport', 'idNumber', 'ID number', String(20000000 + (h % 19999999)))
      ex('National ID / Passport', 'dob', 'Date of birth', `${1975 + (h % 25)}-0${1 + (h % 9)}-1${h % 9}`)
    }
    if (has('KRA PIN Certificate')) ex('KRA PIN Certificate', 'pin', 'KRA PIN', `A${String(100000000 + (h % 899999999)).slice(0, 9)}Z`)
    if (has('Payslip / Proof of Income')) {
      ex('Payslip / Proof of Income', 'employer', 'Employer', 'Employer per payslip')
      ex('Payslip / Proof of Income', 'monthlyIncome', 'Gross monthly income (KES)', String(80000 + (h % 150000)))
    }
  }
  return out
}

/* ---------- credit assessment: transparent, deterministic example rules ---------- */
export const RULES_DOC = [
  'Starting risk score: 25 (0 = lowest risk, 100 = highest).',
  'Debt service ratio (existing monthly debt + new repayment ÷ income): under 30% −8; 30–39% +8; 40–49% +20; 50% or more +35.',
  'Each missing mandatory document +8 (max +32). Each flagged document +6.',
  'Loan-to-value (amount financed ÷ asset price): 90% or more +10; 80–89% +5.',
  'Term over 48 months +5. Less than 2 years in current role/trading +8; 5 years or more −5.',
  'Existing debt above 35% of income +7. A guarantor on facilities above KES 1.5M −5.',
  'Classification: under 35 Low, 35–59 Medium, 60+ High. Incomplete or inconsistent data forces manual review.',
  'Age, gender, nationality, and other protected characteristics are never used.',
]
export function assessCredit(app: LeaseApplication, c: Customer, id: string): CreditAssessment {
  const s = summarize(app.terms)
  const income = c.monthlyIncome
  const repay = s.monthlyEquivalent
  const dsr = income > 0 ? (c.monthlyDebt + repay) / income : 9.99
  const missing = missingDocs(c)
  const flagged = c.documents.filter((d) => d.status === 'Flagged')
  const ltv = app.terms.price > 0 ? s.financed / app.terms.price : 0
  const factors: RiskFactor[] = []
  let score = 25
  const add = (name: string, points: number, detail: string) => {
    score += points
    factors.push({ name, points, effect: points > 0 ? 'raises risk' : points < 0 ? 'lowers risk' : 'neutral', detail })
  }
  const pct = (n: number) => Math.round(n * 100) + '%'
  if (income <= 0) add('Income not declared', 30, 'No monthly income on file — affordability cannot be evaluated.')
  else if (dsr < 0.3) add('Debt service ratio', -8, `DSR ${pct(dsr)} is under 30%.`)
  else if (dsr < 0.4) add('Debt service ratio', 8, `DSR ${pct(dsr)} is moderate (30–39%).`)
  else if (dsr < 0.5) add('Debt service ratio', 20, `DSR ${pct(dsr)} is elevated (40–49%).`)
  else add('Debt service ratio', 35, `DSR ${pct(dsr)} is above 50% of income.`)
  if (missing.length) add('Missing mandatory documents', Math.min(32, missing.length * 8), `Missing: ${missing.join(', ')}.`)
  if (flagged.length) add('Flagged documents', flagged.length * 6, `${flagged.map((d) => d.type).join(', ')} flagged for review.`)
  if (ltv >= 0.9) add('Loan-to-value', 10, `Financing ${pct(ltv)} of asset price (deposit below 10%).`)
  else if (ltv >= 0.8) add('Loan-to-value', 5, `Financing ${pct(ltv)} of asset price.`)
  else add('Loan-to-value', 0, `Financing ${pct(ltv)} of asset price — healthy customer contribution.`)
  if (app.terms.termMonths > 48) add('Long term', 5, `${app.terms.termMonths}-month term exceeds 48 months.`)
  if (c.yearsInRole < 2) add('Stability', 8, `${c.yearsInRole} year(s) in current role/trading is under 2 years.`)
  else if (c.yearsInRole >= 5) add('Stability', -5, `${c.yearsInRole} years in current role/trading.`)
  if (income > 0 && c.monthlyDebt / income > 0.35) add('Existing obligations', 7, `Existing debt is ${pct(c.monthlyDebt / income)} of income.`)
  if (app.terms.guarantor && s.financed > 1_500_000) add('Guarantor provided', -5, 'A guarantor supports a facility above KES 1.5M.')
  score = Math.max(0, Math.min(100, Math.round(score)))
  const risk = score < 35 ? 'Low' : score < 60 ? 'Medium' : 'High'
  const incomplete = missing.length > 0 || income <= 0 || !c.idNumber
  const recommendation: CreditAssessment['recommendation'] =
    risk === 'High' || (incomplete && missing.length >= 2) ? 'Recommend return or decline'
      : risk === 'Medium' || incomplete ? 'Refer for manual review' : 'Recommend approval'
  const required = ensureDocSlots(c.type, c.documents).filter((d) => d.required)
  const docCompleteness = Math.round((required.filter((d) => d.status !== 'Missing').length / required.length) * 100)
  const nextAction =
    recommendation === 'Recommend approval' ? 'Send for approval — documentation and affordability meet the example thresholds.'
      : missing.length ? `Request missing documents (${missing.length}) and re-run the assessment.`
        : recommendation === 'Refer for manual review' ? 'Route to a senior approver for manual review with the explanation attached.'
          : 'Return to the maker to restructure the lease (larger deposit or longer term) or decline.'
  return {
    id, appId: app.id, runAt: new Date().toISOString(), score, risk, monthlyRepayment: repay, dsr,
    affordability: dsr < 0.4 ? 'Comfortable' : dsr < 0.5 ? 'Stretched' : 'Not affordable',
    docCompleteness, missing,
    stability: c.type === 'Business / Corporate' ? `${c.yearsInRole} years trading` : `${c.yearsInRole} years in role · ${c.employmentType}`,
    recommendation, factors, nextAction,
  }
}

/* ---------- approval routing (illustrative thresholds) ---------- */
export function routeFor(app: LeaseApplication, a?: CreditAssessment) {
  const f = financedAmount(app.terms)
  if (a?.risk === 'High') return 'Senior Credit Committee review (high risk)'
  if (f > 5_000_000) return 'Approving Manager + Credit Committee (financed amount above KES 5M)'
  if (a?.risk === 'Medium') return 'Approving Manager with credit analyst note (medium risk)'
  return 'Approving Manager — standard route (low risk, within delegated limit)'
}

/* ---------- workflow transitions & permissions ---------- */
export const STATUSES: Status[] = ['Draft', 'Submitted', 'Verification Pending', 'Credit Review', 'Awaiting Approval', 'Returned for Correction', 'Approved', 'Rejected', 'Contract Pending', 'Ready for Activation', 'Active']
const TRANSITIONS: Record<Status, Status[]> = {
  'Draft': ['Submitted', 'Credit Review', 'Awaiting Approval'],
  'Submitted': ['Verification Pending', 'Credit Review', 'Returned for Correction'],
  'Verification Pending': ['Credit Review', 'Awaiting Approval', 'Returned for Correction'],
  'Credit Review': ['Awaiting Approval', 'Returned for Correction', 'Verification Pending', 'Rejected'],
  'Awaiting Approval': ['Approved', 'Rejected', 'Returned for Correction', 'Verification Pending'],
  'Returned for Correction': ['Draft', 'Submitted', 'Awaiting Approval', 'Verification Pending'],
  'Approved': ['Contract Pending'],
  'Contract Pending': ['Ready for Activation', 'Returned for Correction'],
  'Ready for Activation': ['Active'],
  'Rejected': [],
  'Active': [],
}
export interface Guard { assessment?: CreditAssessment; agreementSigned?: boolean; userId?: string; makerId?: string; action?: string }
export function canTransition(from: Status, to: Status, g: Guard = {}): { ok: boolean; reason?: string } {
  if (!TRANSITIONS[from].includes(to)) return { ok: false, reason: `Not allowed: "${from}" cannot move to "${to}".` }
  if (to === 'Awaiting Approval' && !g.assessment) return { ok: false, reason: 'Run the credit assessment before submitting for approval.' }
  if (to === 'Approved' && g.userId && g.userId === g.makerId) return { ok: false, reason: 'Maker-checker rule: you prepared this application, so you cannot approve it.' }
  if (to === 'Active' && !g.agreementSigned) return { ok: false, reason: 'Activation requires an approved application and a signed (demo) agreement.' }
  return { ok: true }
}
export type Perm = 'create' | 'assess' | 'submit' | 'decide' | 'override' | 'contract' | 'sign' | 'activate' | 'reset'
const PERMS: Record<Role, Perm[]> = {
  maker: ['create', 'assess', 'submit', 'contract'],
  analyst: ['assess', 'submit', 'override'],
  checker: ['decide', 'override'],
  ops: ['contract', 'sign', 'activate'],
  admin: ['create', 'assess', 'submit', 'decide', 'override', 'contract', 'sign', 'activate', 'reset'],
}
export const can = (role: Role, p: Perm) => PERMS[role].includes(p)
export const ROLE_LABEL: Record<Role, string> = {
  maker: 'Leasing Officer / Maker', analyst: 'Credit Analyst', checker: 'Approving Manager / Checker',
  ops: 'Operations Officer', admin: 'Administrator / Supervisor',
}

/* ---------- dashboard metrics ---------- */
export function dashboardMetrics(apps: LeaseApplication[], leases: ActiveLease[], assessments: CreditAssessment[]) {
  const count = (...s: Status[]) => apps.filter((a) => s.includes(a.status)).length
  const risks = { Low: 0, Medium: 0, High: 0, Unassessed: 0 }
  apps.forEach((a) => {
    const as = assessments.find((x) => x.appId === a.id)
    risks[as ? as.risk : 'Unassessed']++
  })
  const outstanding = leases.reduce((s, l) => s + leaseOutstanding(l), 0)
  return {
    total: apps.length,
    verification: count('Submitted', 'Verification Pending'),
    credit: count('Credit Review'),
    approvals: count('Awaiting Approval'),
    approved: count('Approved', 'Contract Pending', 'Ready for Activation', 'Active'),
    active: leases.length,
    attention: count('Returned for Correction', 'Verification Pending') + apps.filter((a) => a.priority === 'High' && !['Active', 'Rejected'].includes(a.status)).length,
    portfolio: outstanding,
    financedTotal: leases.reduce((s, l) => s + l.financed, 0),
    pipeline: [
      ['Draft', count('Draft')], ['Verification', count('Submitted', 'Verification Pending', 'Returned for Correction')],
      ['Credit review', count('Credit Review')], ['Approval', count('Awaiting Approval')],
      ['Contract', count('Approved', 'Contract Pending', 'Ready for Activation')], ['Active', count('Active')],
    ] as [string, number][],
    risks,
  }
}
export const leaseOutstanding = (l: ActiveLease) => {
  const paid = l.payments.length
  return paid >= l.schedule.length ? 0 : paid === 0 ? l.financed : l.schedule[paid - 1].closing
}
export const nextPaymentDate = (l: ActiveLease) => l.schedule[l.payments.length]?.date
