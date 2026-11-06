import type {
  ActiveLease, ApprovalDecision, AuditEvent, CreditAssessment, Customer, CustomerDocument, DemoUser,
  LeaseAgreement, LeaseApplication, Status, Terms,
} from './types'
import { assessCredit, buildSchedule, ensureDocSlots } from './engine'

export const USERS: DemoUser[] = [
  { id: 'u-maker', name: 'Faith Achieng', role: 'maker', title: 'Leasing Officer' },
  { id: 'u-analyst', name: 'David Kiptoo', role: 'analyst', title: 'Credit Analyst' },
  { id: 'u-checker', name: 'Mary Wambui', role: 'checker', title: 'Approving Manager' },
  { id: 'u-ops', name: 'Peter Mutua', role: 'ops', title: 'Operations Officer' },
  { id: 'u-admin', name: 'Samuel Otieno', role: 'admin', title: 'Supervisor' },
]

export const blankCustomer = (): Customer => ({
  id: 'cust-' + Math.random().toString(36).slice(2, 8),
  customerNo: 'CUST-' + (100300 + Math.floor(Math.random() * 600)),
  type: 'Individual', firstName: '', middleName: '', lastName: '', dob: '', gender: '', idType: 'National ID', idNumber: '',
  nationality: 'Kenyan', businessName: '', regNo: '', pin: '', industry: '', sector: '', representatives: '',
  occupation: '', employer: '', employmentType: '', yearsInRole: 0, monthlyIncome: 0, monthlyDebt: 0,
  email: '', mobile: '', altContact: '', physicalAddress: '', postalAddress: '', county: '', city: '', country: 'Kenya',
  documents: [], status: 'Draft', createdAt: new Date().toISOString(), createdBy: 'u-maker',
})

const doc = (type: string, status: CustomerDocument['status'], req = true, date = '2026-06-24'): CustomerDocument => ({
  id: 'doc-' + type.replace(/\W/g, '').slice(0, 6) + Math.random().toString(36).slice(2, 5), type, required: req, status,
  fileName: status === 'Missing' ? undefined : type.toLowerCase().replace(/[^a-z]+/g, '_') + '.pdf',
  uploadedAt: status === 'Missing' ? undefined : date + 'T09:30:00Z',
})
const cust = (p: Partial<Customer>, docs: CustomerDocument[]): Customer => {
  const c = { ...blankCustomer(), ...p, status: 'Verified' as const, createdAt: '2026-06-20T08:00:00Z' }
  c.documents = ensureDocSlots(c.type, docs)
  return c
}
const IND = ['National ID / Passport', 'KRA PIN Certificate', 'Bank Statements (6 months)', 'Payslip / Proof of Income']
const BUS = ['Certificate of Incorporation', 'KRA PIN Certificate', 'Bank Statements (6 months)', 'Audited / Management Accounts']

const terms = (t: Partial<Terms>): Terms => ({
  price: 0, deposit: 0, termMonths: 36, ratePct: 14, frequency: 'Monthly', startDate: '2026-08-01', residualPct: 0, arrangementFeePct: 1, guarantor: false, ...t,
})

export interface Store {
  customers: Customer[]; apps: LeaseApplication[]; assessments: CreditAssessment[]
  agreements: LeaseAgreement[]; leases: ActiveLease[]; audit: AuditEvent[]
}

export function seedData(): Store {
  const customers: Customer[] = [
    cust({
      id: 'cust-grace', customerNo: 'CUST-100201', firstName: 'Grace', middleName: 'Wanjiru', lastName: 'Njoroge', dob: '1986-03-14', gender: 'Female',
      idNumber: '27845612', pin: 'A012345678K', occupation: 'Finance Manager', employer: 'Savannah Foods Ltd', employmentType: 'Permanent', yearsInRole: 9,
      monthlyIncome: 650000, monthlyDebt: 40000, email: 'grace.njoroge@example.co.ke', mobile: '+254722000114', physicalAddress: 'Westlands, Rhapta Rd, Nairobi',
      postalAddress: 'P.O. Box 4410-00100', county: 'Nairobi', city: 'Nairobi',
    }, IND.map((t) => doc(t, 'Verified'))),
    cust({
      id: 'cust-kijani', customerNo: 'CUST-100202', type: 'Business / Corporate', businessName: 'Kijani Fresh Produce Ltd', regNo: 'CPR/2016/482913', pin: 'P051234567K',
      industry: 'Agribusiness', sector: 'Horticulture exports', representatives: 'Joseph Mutiso (Director), Esther Nyambura (Finance Director)',
      yearsInRole: 3, monthlyIncome: 1100000, monthlyDebt: 260000, email: 'finance@kijanifresh.example.co.ke', mobile: '+254733000221',
      physicalAddress: 'Naivasha Industrial Park, Plot 18', postalAddress: 'P.O. Box 912-20117', county: 'Nakuru', city: 'Naivasha',
    }, BUS.map((t, i) => doc(t, i === 0 || i === 1 ? 'Verified' : 'Uploaded'))),
    { ...cust({
      id: 'cust-brian', customerNo: 'CUST-100203', firstName: 'Brian', middleName: 'Otieno', lastName: 'Odhiambo', dob: '1992-11-02', gender: 'Male',
      idNumber: '31220987', pin: '', occupation: 'IT Consultant', employer: 'Self-employed', employmentType: 'Self-employed', yearsInRole: 1,
      monthlyIncome: 120000, monthlyDebt: 35000, email: 'brian.odhiambo@example.co.ke', mobile: '+254711000378', physicalAddress: 'Kilimani, Argwings Kodhek Rd',
      postalAddress: 'P.O. Box 77-00621', county: 'Nairobi', city: 'Nairobi',
    }, [doc(IND[0], 'Verified'), doc(IND[2], 'Uploaded')]), status: 'Pending Verification' },
    cust({
      id: 'cust-mwangi', customerNo: 'CUST-100180', type: 'Business / Corporate', businessName: 'Mwangi Hardware & Building Ltd', regNo: 'CPR/2009/117204', pin: 'P004455667M',
      industry: 'Construction supplies', sector: 'Wholesale & retail', representatives: 'Stephen Mwangi (MD)', yearsInRole: 11, monthlyIncome: 1600000, monthlyDebt: 180000,
      email: 'accounts@mwangihardware.example.co.ke', mobile: '+254720000550', physicalAddress: 'Industrial Area, Lunga Lunga Rd', postalAddress: 'P.O. Box 30211-00100', county: 'Nairobi', city: 'Nairobi',
    }, BUS.map((t) => doc(t, 'Verified'))),
    cust({
      id: 'cust-zawadi', customerNo: 'CUST-100141', type: 'Business / Corporate', businessName: 'Zawadi Organic Farm Supplies Ltd', regNo: 'CPR/2014/330918', pin: 'P055671234L',
      industry: 'Agriculture', sector: 'Farm inputs', representatives: 'Zawadi Kerubo (Director)', yearsInRole: 8, monthlyIncome: 980000, monthlyDebt: 90000,
      email: 'info@zawadiorganic.example.co.ke', mobile: '+254701000642', physicalAddress: 'Kitale-Eldoret Rd', postalAddress: 'P.O. Box 301-30200', county: 'Trans Nzoia', city: 'Kitale',
    }, BUS.map((t) => doc(t, 'Verified'))),
    cust({
      id: 'cust-alice', customerNo: 'CUST-100150', firstName: 'Alice', middleName: 'Chebet', lastName: 'Rotich', dob: '1980-07-21', gender: 'Female', idNumber: '22110456',
      pin: 'A009988776B', occupation: 'Dentist', employer: 'Rotich Dental Clinic', employmentType: 'Self-employed', yearsInRole: 12, monthlyIncome: 520000, monthlyDebt: 45000,
      email: 'dr.rotich@example.co.ke', mobile: '+254712000703', physicalAddress: 'Uasin Gishu Rd, Eldoret', postalAddress: 'P.O. Box 55-30100', county: 'Uasin Gishu', city: 'Eldoret',
    }, IND.map((t) => doc(t, 'Verified'))),
    cust({
      id: 'cust-peter', customerNo: 'CUST-100160', firstName: 'Peter', middleName: 'Kamau', lastName: 'Mutahi', dob: '1990-01-30', gender: 'Male', idNumber: '29876543',
      pin: 'A003322110C', occupation: 'Driver', employer: 'Self-employed', employmentType: 'Self-employed', yearsInRole: 1, monthlyIncome: 95000, monthlyDebt: 60000,
      email: 'peter.mutahi@example.co.ke', mobile: '+254725000812', physicalAddress: 'Thika Town', postalAddress: 'P.O. Box 12-01000', county: 'Kiambu', city: 'Thika',
    }, IND.map((t) => doc(t, 'Verified'))),
  ]

  const mkApp = (n: number, customerId: string, cat: string, desc: string, supplier: string, t: Partial<Terms>, status: Status, extra: Partial<LeaseApplication> = {}): LeaseApplication => ({
    id: 'app-' + n, ref: 'LA-2026-0' + n, customerId, asset: { category: cat, description: desc, supplier, supplierPin: 'P05' + (1000000 + n * 137) + 'Q' },
    terms: terms(t), status, priority: 'Normal', assignedTo: 'u-maker', makerId: 'u-maker', makerName: 'Faith Achieng',
    createdAt: '2026-07-0' + (n % 9 + 1) + 'T09:00:00Z', submittedAt: undefined, makerNotes: '', decisions: [], ...extra,
  })
  const dec = (by: string, role: string, action: ApprovalDecision['action'], reason: string, at: string): ApprovalDecision => ({ id: 'd-' + Math.random().toString(36).slice(2, 7), at, by, role, action, reason })

  const apps: LeaseApplication[] = [
    mkApp(141, 'cust-grace', 'Motor vehicle', 'Toyota Hilux Double Cab 2.8 GD-6 4x4 (2026)', 'Toyota Kenya (CFAO Motors)', { price: 4800000, deposit: 1200000, termMonths: 48, ratePct: 14 }, 'Draft', {
      makerNotes: 'Existing customer with a clean record. Vehicle for field supervision of agribusiness contracts. Deposit of 25% provided.' }),
    mkApp(142, 'cust-kijani', 'Commercial vehicle', 'Isuzu FRR Refrigerated Truck, 8-tonne', 'Isuzu East Africa', { price: 7500000, deposit: 1125000, termMonths: 60, ratePct: 15 }, 'Credit Review', {
      submittedAt: '2026-07-08T10:00:00Z', makerNotes: 'Expanding cold-chain for export routes. Director guarantee available. Accounts are management accounts, not audited.' }),
    mkApp(143, 'cust-brian', 'Equipment', 'Workstations (6) and large-format printer', 'Datatech Solutions Ltd', { price: 1800000, deposit: 180000, termMonths: 36, ratePct: 16 }, 'Verification Pending', {
      priority: 'High', submittedAt: '2026-07-10T14:20:00Z', makerNotes: 'Customer has not yet supplied KRA PIN or proof of income. Follow up before assessment.' }),
    mkApp(138, 'cust-mwangi', 'Commercial vehicle', 'Isuzu FTR Tipper Truck', 'Isuzu East Africa', { price: 6200000, deposit: 1860000, termMonths: 48, ratePct: 14.5, guarantor: true }, 'Awaiting Approval', {
      submittedAt: '2026-07-05T11:45:00Z', assignedTo: 'u-checker', makerNotes: 'Long-standing customer, fleet expansion for the Athi River project.' }),
    mkApp(121, 'cust-zawadi', 'Agricultural machinery', 'John Deere 5075E Tractor with implements', 'Equity Agri Machinery', { price: 3900000, deposit: 780000, termMonths: 36, ratePct: 13.5, startDate: '2025-11-15' }, 'Active', { submittedAt: '2025-10-20T09:00:00Z' }),
    mkApp(119, 'cust-alice', 'Medical equipment', 'Digital panoramic dental X-ray system', 'MedTech Kenya', { price: 2400000, deposit: 480000, termMonths: 24, ratePct: 14, startDate: '2026-01-20' }, 'Active', { submittedAt: '2025-12-28T09:00:00Z' }),
    mkApp(130, 'cust-peter', 'Motor vehicle', 'Toyota Probox 2022', 'Car & General (Kenya)', { price: 1900000, deposit: 100000, termMonths: 60, ratePct: 16 }, 'Rejected', {
      submittedAt: '2026-06-18T09:00:00Z', makerNotes: 'High existing obligations.' }),
  ]

  const assessments: CreditAssessment[] = []
  const audit: AuditEvent[] = []
  const ev = (at: string, by: string, role: string, ref: string, action: string, detail: string): AuditEvent => ({ id: 'ev-' + Math.random().toString(36).slice(2, 8), at, by, role, entity: 'Application', ref, action, detail })
  apps.forEach((a) => {
    if (['Credit Review', 'Awaiting Approval', 'Active', 'Rejected'].includes(a.status) ) {
      const as = assessCredit(a, customers.find((c) => c.id === a.customerId)!, 'ca-' + a.id)
      as.runAt = a.submittedAt || a.createdAt
      assessments.push(as)
    }
    if (a.submittedAt) {
      a.decisions.push(dec(a.makerName, 'Leasing Officer', 'Submitted', 'Application submitted with documents.', a.submittedAt))
      audit.push(ev(a.submittedAt, a.makerName, 'Leasing Officer', a.ref, 'Submitted', 'Application submitted'))
    }
  })
  const get = (id: string) => apps.find((a) => a.id === id)!
  get('app-121').decisions.push(dec('Mary Wambui', 'Approving Manager', 'Approved', 'Strong financials. Approved within delegated limit.', '2025-11-02T10:00:00Z'))
  get('app-119').decisions.push(dec('Mary Wambui', 'Approving Manager', 'Approved', 'Approved.', '2026-01-08T10:00:00Z'))
  get('app-130').decisions.push(dec('Mary Wambui', 'Approving Manager', 'Rejected', 'Debt service ratio exceeds policy; customer advised to reapply with larger deposit.', '2026-06-20T15:00:00Z'))
  get('app-130').priority = 'Low'

  const agreements: LeaseAgreement[] = []
  const leases: ActiveLease[] = []
  ;[['app-121', 8, 'LP-LS-2025-0121'], ['app-119', 5, 'LP-LS-2026-0119']].forEach(([id, paid, acct]) => {
    const a = get(id as string)
    const schedule = buildSchedule(a.terms)
    agreements.push({ id: 'agr-' + id, ref: 'AGR-' + a.ref, appId: a.id, version: 1, status: 'Signed (Demo)', generatedAt: a.terms.startDate + 'T08:00:00Z', generatedBy: 'Peter Mutua', signedAt: a.terms.startDate + 'T12:00:00Z' })
    leases.push({
      id: 'lease-' + id, accountNo: acct as string, appId: a.id, customerId: a.customerId, activatedAt: a.terms.startDate + 'T13:00:00Z', activatedBy: 'Peter Mutua',
      financed: a.terms.price - a.terms.deposit, installment: schedule[0].installment, schedule,
      payments: schedule.slice(0, paid as number).map((r, i) => ({ date: r.date, amount: r.installment, ref: (i % 2 ? 'BNK-TRF-' : 'MPESA-') + (4400 + i * 17) + ' (demo)', channel: i % 2 ? 'Bank transfer' : 'M-PESA Paybill' })),
      status: 'Current',
    })
    audit.push(ev(a.terms.startDate + 'T13:00:00Z', 'Peter Mutua', 'Operations Officer', a.ref, 'Lease activated', `Account ${acct} opened`))
  })
  audit.sort((x, y) => y.at.localeCompare(x.at))
  return { customers, apps, assessments, agreements, leases, audit }
}

export const TREND = [
  { m: 'Feb', apps: 6, approved: 4 }, { m: 'Mar', apps: 8, approved: 5 }, { m: 'Apr', apps: 7, approved: 6 },
  { m: 'May', apps: 9, approved: 6 }, { m: 'Jun', apps: 11, approved: 8 },
]
