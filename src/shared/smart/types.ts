export type Role = 'maker' | 'analyst' | 'checker' | 'ops' | 'admin'
export interface DemoUser { id: string; name: string; role: Role; title: string }

export type CustomerType = 'Individual' | 'Joint Account' | 'Group' | 'Business / Corporate'
export type DocStatus = 'Missing' | 'Uploaded' | 'Verified' | 'Flagged'

export interface CustomerDocument {
  id: string
  type: string
  required: boolean
  fileName?: string
  uploadedAt?: string
  status: DocStatus
  note?: string
}

export interface Customer {
  id: string
  customerNo: string
  type: CustomerType
  firstName: string; middleName: string; lastName: string
  dob: string; gender: string; idType: string; idNumber: string; nationality: string
  businessName: string; regNo: string; pin: string; industry: string; sector: string
  representatives: string
  occupation: string; employer: string; employmentType: string; yearsInRole: number
  monthlyIncome: number; monthlyDebt: number
  email: string; mobile: string; altContact: string
  physicalAddress: string; postalAddress: string; county: string; city: string; country: string
  documents: CustomerDocument[]
  status: 'Draft' | 'Pending Verification' | 'Verified'
  createdAt: string
  createdBy: string
}

export type Status =
  | 'Draft' | 'Submitted' | 'Verification Pending' | 'Credit Review' | 'Awaiting Approval'
  | 'Returned for Correction' | 'Approved' | 'Rejected' | 'Contract Pending'
  | 'Ready for Activation' | 'Active'

export type Frequency = 'Monthly' | 'Quarterly'
export interface LeaseAsset {
  category: string; description: string; supplier: string; supplierPin: string
}
export interface Terms {
  price: number; deposit: number; termMonths: number; ratePct: number
  frequency: Frequency; startDate: string; residualPct: number; arrangementFeePct: number
  guarantor: boolean
}
export interface RepaymentInstallment {
  period: number; date: string; opening: number; installment: number
  charge: number; principal: number; closing: number
}
export interface ApprovalDecision {
  id: string; at: string; by: string; role: string
  action: 'Approved' | 'Rejected' | 'Returned for Correction' | 'Documents Requested' | 'Override' | 'Submitted' | 'Note'
  reason: string
}
export interface LeaseApplication {
  id: string; ref: string; customerId: string; asset: LeaseAsset; terms: Terms
  status: Status; priority: 'High' | 'Normal' | 'Low'
  assignedTo: string; makerId: string; makerName: string
  createdAt: string; submittedAt?: string
  makerNotes: string
  decisions: ApprovalDecision[]
  quotedAt?: string
}

export interface RiskFactor {
  name: string; points: number; effect: 'raises risk' | 'lowers risk' | 'neutral'; detail: string
}
export interface CreditAssessment {
  id: string; appId: string; runAt: string
  score: number; risk: 'Low' | 'Medium' | 'High'
  monthlyRepayment: number; dsr: number
  affordability: 'Comfortable' | 'Stretched' | 'Not affordable'
  docCompleteness: number
  stability: string
  recommendation: 'Recommend approval' | 'Refer for manual review' | 'Recommend return or decline'
  factors: RiskFactor[]
  missing: string[]
  nextAction: string
  override?: { by: string; at: string; reason: string; decision: string }
}

export interface LeaseAgreement {
  id: string; ref: string; appId: string; version: number
  status: 'Draft' | 'Reviewed' | 'Signed (Demo)'
  generatedAt: string; generatedBy: string
  reviewedBy?: string; signedAt?: string
}
export interface Payment { date: string; amount: number; ref: string; channel: string }
export interface ActiveLease {
  id: string; accountNo: string; appId: string; customerId: string
  activatedAt: string; activatedBy: string
  financed: number; installment: number
  schedule: RepaymentInstallment[]; payments: Payment[]
  status: 'Current' | 'In Arrears'
}
export interface AuditEvent {
  id: string; at: string; by: string; role: string; entity: string; ref: string; action: string; detail: string
}
