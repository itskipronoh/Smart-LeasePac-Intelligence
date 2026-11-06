import { useSyncExternalStore } from 'react'
import type { AuditEvent, Customer, LeaseApplication, Role, ApprovalDecision } from './types'
import { USERS, seedData, blankCustomer, type Store } from './seed'
import {
  assessCredit, can, canTransition, customerName, ensureDocSlots, summarize, uid, ROLE_LABEL, routeFor, type Perm,
} from './engine'
import type { Status } from './types'

/* Browser-local demo store. Persists to localStorage; no backend, no production LeasePac data. */
export interface Route { name: string; id?: string }
export interface AppState extends Store {
  userId: string
  route: Route
  onboardDraft: Customer | null
  onboardStep: number
  leaseDraft: { appId?: string; customerId?: string } | null
  guideDone: string[]
  guideOn: boolean
}
const KEY = 'smart-leasepac-demo-v1'
const fresh = (): AppState => ({ ...seedData(), userId: 'u-maker', route: { name: 'dashboard' }, onboardDraft: null, onboardStep: 0, leaseDraft: null, guideDone: [], guideOn: false })
function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...JSON.parse(raw), route: { name: 'dashboard' } }
  } catch { /* storage unavailable */ }
  return fresh()
}
let state: AppState = load()
const listeners = new Set<() => void>()
function set(next: Partial<AppState>) {
  state = { ...state, ...next }
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* ignore */ }
  listeners.forEach((l) => l())
}
export const getState = () => state
export function useStore(): AppState {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb) }, () => state)
}
export const currentUser = (s = state) => USERS.find((u) => u.id === s.userId) ?? USERS[0]
export type Result = { ok: true; id?: string } | { ok: false; error: string }
const fail = (error: string): Result => ({ ok: false, error })

function logEvent(entity: string, ref: string, action: string, detail: string): AuditEvent {
  const u = currentUser()
  return { id: uid('ev'), at: new Date().toISOString(), by: u.name, role: ROLE_LABEL[u.role], entity, ref, action, detail }
}
const guide = (k: string) => state.guideDone.includes(k) ? state.guideDone : [...state.guideDone, k]
const needs = (p: Perm): Result | null =>
  can(currentUser().role, p) ? null : fail(`Your current role (${ROLE_LABEL[currentUser().role]}) is not permitted to do this. Switch role in the top bar.`)
const decisionOf = (action: ApprovalDecision['action'], reason: string): ApprovalDecision => {
  const u = currentUser()
  return { id: uid('d'), at: new Date().toISOString(), by: u.name, role: ROLE_LABEL[u.role], action, reason }
}

export const actions = {
  go(name: string, id?: string) { set({ route: { name, id }, guideDone: name === 'dashboard' && state.guideDone.includes('activate') ? guide('dashboard') : state.guideDone }); window.scrollTo?.(0, 0) },
  setUser(userId: string) { set({ userId }) },
  toggleGuide(on?: boolean) { set({ guideOn: on ?? !state.guideOn }) },
  setOnboard(draft: Customer | null, step = state.onboardStep) { set({ onboardDraft: draft, onboardStep: step }) },
  startOnboarding(c?: Customer) { set({ onboardDraft: c ? JSON.parse(JSON.stringify(c)) : { ...blankCustomer(), createdBy: state.userId }, onboardStep: 0 }) },
  setLeaseDraft(d: AppState['leaseDraft']) { set({ leaseDraft: d }) },
  reset() { const f = fresh(); set({ ...f, userId: state.userId, route: { name: 'dashboard' }, guideOn: state.guideOn }) },

  saveCustomer(c: Customer, status: Customer['status']): Result {
    const p = needs('create'); if (p) return p
    const saved: Customer = { ...c, status, documents: ensureDocSlots(c.type, c.documents) }
    const exists = state.customers.some((x) => x.id === c.id)
    set({
      customers: exists ? state.customers.map((x) => (x.id === c.id ? saved : x)) : [saved, ...state.customers],
      audit: [logEvent('Customer', c.customerNo, status === 'Draft' ? 'Draft saved' : 'Submitted for verification', customerName(saved)), ...state.audit],
    })
    return { ok: true, id: c.id }
  },
  updateCustomer(c: Customer) { set({ customers: state.customers.map((x) => (x.id === c.id ? c : x)) }) },
  verifyCustomer(id: string): Result {
    const c = state.customers.find((x) => x.id === id); if (!c) return fail('Customer not found')
    if (currentUser().role === 'maker' && c.createdBy === currentUser().id) return fail('Maker-checker rule: you captured this customer, so another user must approve it.')
    set({
      customers: state.customers.map((x) => (x.id === id ? { ...x, status: 'Verified', documents: x.documents.map((d) => (d.status === 'Uploaded' ? { ...d, status: 'Verified' } : d)) } : x)),
      audit: [logEvent('Customer', c.customerNo, 'Customer approved', customerName(c)), ...state.audit],
    })
    return { ok: true }
  },

  saveApplication(app: LeaseApplication): Result {
    const p = needs('create'); if (p) return p
    const exists = state.apps.some((a) => a.id === app.id)
    const u = currentUser()
    const toSave = exists ? app : { ...app, makerId: u.id, makerName: u.name, assignedTo: u.id }
    set({
      apps: exists ? state.apps.map((a) => (a.id === app.id ? toSave : a)) : [toSave, ...state.apps],
      audit: [logEvent('Application', app.ref, exists ? 'Application updated' : 'Application created', 'Saved as ' + app.status), ...state.audit],
      guideDone: exists ? state.guideDone : guide('start'),
    })
    return { ok: true, id: app.id }
  },
  markQuoted(appId: string) {
    const a = state.apps.find((x) => x.id === appId); if (!a) return
    set({ apps: state.apps.map((x) => (x.id === appId ? { ...x, quotedAt: new Date().toISOString() } : x)), audit: [logEvent('Application', a.ref, 'Quotation generated', 'Prototype estimate'), ...state.audit], guideDone: guide('quote') })
  },
  runAssessment(appId: string): Result {
    const p = needs('assess'); if (p) return p
    const a = state.apps.find((x) => x.id === appId); if (!a) return fail('Application not found')
    const c = state.customers.find((x) => x.id === a.customerId); if (!c) return fail('Customer not found')
    const as = assessCredit(a, c, uid('ca'))
    const nextStatus: Status | null = ['Draft', 'Submitted', 'Verification Pending'].includes(a.status) ? 'Credit Review' : null
    set({
      assessments: [as, ...state.assessments.filter((x) => x.appId !== appId)],
      apps: state.apps.map((x) => (x.id === appId && nextStatus && canTransition(x.status, nextStatus).ok ? { ...x, status: nextStatus } : x)),
      audit: [logEvent('Credit assessment', a.ref, 'Assessment run', `Risk ${as.score}/100 (${as.risk}) — ${as.recommendation}`), ...state.audit],
      guideDone: guide('assess'),
    })
    return { ok: true }
  },
  overrideAssessment(appId: string, decision: string, reason: string): Result {
    const p = needs('override'); if (p) return p
    if (reason.trim().length < 10) return fail('A documented reason of at least 10 characters is required to override.')
    const a = state.apps.find((x) => x.id === appId)!
    const u = currentUser()
    set({
      assessments: state.assessments.map((x) => (x.appId === appId ? { ...x, override: { by: u.name, at: new Date().toISOString(), reason, decision } } : x)),
      apps: state.apps.map((x) => (x.id === appId ? { ...x, decisions: [decisionOf('Override', `${decision}: ${reason}`), ...x.decisions] } : x)),
      audit: [logEvent('Credit assessment', a.ref, 'Recommendation overridden', `${decision} — ${reason}`), ...state.audit],
    })
    return { ok: true }
  },
  requestInfo(appId: string, note: string): Result {
    const a = state.apps.find((x) => x.id === appId)!
    const to: Status = 'Verification Pending'
    const g = canTransition(a.status, to); if (!g.ok) return fail(g.reason!)
    set({
      apps: state.apps.map((x) => (x.id === appId ? { ...x, status: to, priority: 'High', decisions: [decisionOf('Documents Requested', note), ...x.decisions] } : x)),
      audit: [logEvent('Application', a.ref, 'Additional information requested', note), ...state.audit],
    })
    return { ok: true }
  },
  submitForApproval(appId: string): Result {
    const p = needs('submit'); if (p) return p
    const a = state.apps.find((x) => x.id === appId); if (!a) return fail('Application not found')
    const as = state.assessments.find((x) => x.appId === appId)
    const g = canTransition(a.status, 'Awaiting Approval', { assessment: as }); if (!g.ok) return fail(g.reason!)
    set({
      apps: state.apps.map((x) => (x.id === appId ? { ...x, status: 'Awaiting Approval', submittedAt: x.submittedAt ?? new Date().toISOString(), assignedTo: 'u-checker', decisions: [decisionOf('Submitted', `Submitted for approval. Route: ${routeFor(a, as)}`), ...x.decisions] } : x)),
      audit: [logEvent('Application', a.ref, 'Submitted for approval', routeFor(a, as)), ...state.audit],
      guideDone: guide('submit'),
    })
    return { ok: true }
  },
  decide(appId: string, action: 'Approved' | 'Rejected' | 'Returned for Correction' | 'Documents Requested', reason: string): Result {
    const p = needs('decide'); if (p) return p
    const a = state.apps.find((x) => x.id === appId); if (!a) return fail('Application not found')
    if (action !== 'Approved' && reason.trim().length < 5) return fail('A reason is required to reject, return, or request documents.')
    const as = state.assessments.find((x) => x.appId === appId)
    if (action === 'Approved' && as && as.recommendation !== 'Recommend approval' && !as.override && reason.trim().length < 10)
      return fail('The recommendation is not "Recommend approval". Document your reason (min 10 characters) to approve against it — this is recorded as an override.')
    const to: Status = action === 'Approved' ? 'Approved' : action === 'Rejected' ? 'Rejected' : action === 'Returned for Correction' ? 'Returned for Correction' : 'Verification Pending'
    const g = canTransition(a.status, to, { userId: currentUser().id, makerId: a.makerId }); if (!g.ok) return fail(g.reason!)
    const overriding = action === 'Approved' && as && as.recommendation !== 'Recommend approval'
    set({
      apps: state.apps.map((x) => (x.id === appId ? { ...x, status: to, priority: action === 'Documents Requested' ? 'High' : x.priority, decisions: [decisionOf(action, reason || 'Approved per delegated authority.'), ...x.decisions] } : x)),
      assessments: overriding ? state.assessments.map((x) => (x.appId === appId ? { ...x, override: { by: currentUser().name, at: new Date().toISOString(), reason, decision: 'Approved against recommendation' } } : x)) : state.assessments,
      audit: [logEvent('Application', a.ref, action, reason || 'No comment'), ...state.audit],
      guideDone: action === 'Approved' ? guide('approve') : state.guideDone,
    })
    return { ok: true }
  },
  generateAgreement(appId: string): Result {
    const p = needs('contract'); if (p) return p
    const a = state.apps.find((x) => x.id === appId); if (!a) return fail('Application not found')
    const ex = state.agreements.find((g) => g.appId === appId)
    if (!ex) { const t = canTransition(a.status, 'Contract Pending'); if (!t.ok) return fail('An agreement can only be generated for an approved application.') }
    const u = currentUser()
    const next = ex
      ? { ...ex, version: ex.version + 1, status: 'Draft' as const, generatedAt: new Date().toISOString(), generatedBy: u.name, reviewedBy: undefined, signedAt: undefined }
      : { id: uid('agr'), ref: 'AGR-' + a.ref, appId, version: 1, status: 'Draft' as const, generatedAt: new Date().toISOString(), generatedBy: u.name }
    set({
      agreements: ex ? state.agreements.map((g) => (g.appId === appId ? next : g)) : [next, ...state.agreements],
      apps: state.apps.map((x) => (x.id === appId ? { ...x, status: 'Contract Pending' } : x)),
      audit: [logEvent('Agreement', next.ref, 'Draft generated', `Version ${next.version} from approved application data`), ...state.audit],
      guideDone: guide('contract'),
    })
    return { ok: true }
  },
  agreementAction(appId: string, act: 'review' | 'sign' | 'return', reason = ''): Result {
    const a = state.apps.find((x) => x.id === appId); const ag = state.agreements.find((g) => g.appId === appId)
    if (!a || !ag) return fail('Generate the agreement first.')
    const u = currentUser()
    if (act === 'sign') {
      const p = needs('sign'); if (p) return p
      if (ag.status !== 'Reviewed') return fail('Mark the contract as reviewed before recording the demo signature.')
      const g = canTransition(a.status, 'Ready for Activation'); if (!g.ok) return fail(g.reason!)
      set({ agreements: state.agreements.map((x) => (x.appId === appId ? { ...x, status: 'Signed (Demo)', signedAt: new Date().toISOString() } : x)), apps: state.apps.map((x) => (x.id === appId ? { ...x, status: 'Ready for Activation' } : x)), audit: [logEvent('Agreement', ag.ref, 'Marked signed (demo)', 'No e-signature service connected'), ...state.audit] })
    } else if (act === 'review') {
      const p = needs('contract'); if (p) return p
      set({ agreements: state.agreements.map((x) => (x.appId === appId ? { ...x, status: 'Reviewed', reviewedBy: u.name } : x)), audit: [logEvent('Agreement', ag.ref, 'Marked reviewed', u.name), ...state.audit] })
    } else {
      const p = needs('contract'); if (p) return p
      if (reason.trim().length < 5) return fail('A reason is required to return for correction.')
      set({ apps: state.apps.map((x) => (x.id === appId ? { ...x, status: 'Returned for Correction', decisions: [decisionOf('Returned for Correction', 'Contract: ' + reason), ...x.decisions] } : x)), audit: [logEvent('Agreement', ag.ref, 'Returned for correction', reason), ...state.audit] })
    }
    return { ok: true }
  },
  activateLease(appId: string): Result {
    const p = needs('activate'); if (p) return p
    const a = state.apps.find((x) => x.id === appId); const ag = state.agreements.find((g) => g.appId === appId)
    if (!a) return fail('Application not found')
    const g = canTransition(a.status, 'Active', { agreementSigned: ag?.status === 'Signed (Demo)' }); if (!g.ok) return fail(g.reason!)
    const s = summarize(a.terms)
    const n = state.leases.length + 1
    const lease = {
      id: uid('lease'), accountNo: `LP-LS-2026-${String(200 + n).padStart(4, '0')}`, appId, customerId: a.customerId,
      activatedAt: new Date().toISOString(), activatedBy: currentUser().name, financed: s.financed, installment: s.installment, schedule: s.schedule, payments: [], status: 'Current' as const,
    }
    set({
      leases: [lease, ...state.leases],
      apps: state.apps.map((x) => (x.id === appId ? { ...x, status: 'Active' } : x)),
      audit: [logEvent('Lease', lease.accountNo, 'Lease activated', `${a.ref} moved into the active portfolio (demo — no funds posted)`), ...state.audit],
      guideDone: guide('activate'),
    })
    return { ok: true, id: lease.id }
  },
  markPdf() { set({ guideDone: guide('pdf') }) },
}
export type { Role }
