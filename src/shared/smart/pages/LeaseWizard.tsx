import React, { useEffect, useState } from 'react'
import { Check, UserPlus } from 'lucide-react'
import { actions, useStore } from '../store'
import { customerName, fmtMoney, summarize, missingDocs, fmtDate } from '../engine'
import type { LeaseApplication, Terms } from '../types'
import { Btn, Card, Modal, Notice, NumField, PageHeader, SelectField, StatusBadge, TextField, KV, report, toast, cx, Simulated, Field, inputCls } from '../ui'
import { Documents } from '../Documents'
import { ScheduleTable } from '../Schedule'
import { AssessmentView } from './Assessment'
import { CustomerSummary } from './Directory'
import { downloadQuotePdf } from '../pdf'

const STEPS = ['Customer & documents', 'Asset & supplier', 'Financing & quote', 'Assess & submit']
const CATS = ['Motor vehicle', 'Commercial vehicle', 'Agricultural machinery', 'Equipment', 'Medical equipment', 'ICT hardware']
const today = () => new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10)
const EDITABLE = ['Draft', 'Returned for Correction', 'Verification Pending', 'Credit Review']

const blank = (customerId: string): LeaseApplication => ({
  id: 'app-' + Math.random().toString(36).slice(2, 7), ref: '', customerId,
  asset: { category: '', description: '', supplier: '', supplierPin: '' },
  terms: { price: 0, deposit: 0, termMonths: 36, ratePct: 14, frequency: 'Monthly', startDate: today(), residualPct: 0, arrangementFeePct: 1, guarantor: false },
  status: 'Draft', priority: 'Normal', assignedTo: '', makerId: '', makerName: '', createdAt: new Date().toISOString(), makerNotes: '', decisions: [],
})

export function LeaseWizard() {
  const s = useStore()
  const draft = s.leaseDraft
  const existing = draft?.appId ? s.apps.find((a) => a.id === draft.appId) : undefined
  const [app, setApp] = useState<LeaseApplication>(() => existing ?? blank(draft?.customerId && draft.customerId !== '__new__' ? draft.customerId : ''))
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [quote, setQuote] = useState(false)
  const [compare, setCompare] = useState(false)
  const [b, setB] = useState<Partial<Terms>>({ termMonths: 48, deposit: 0 })

  useEffect(() => { if (existing && existing.id !== app.id) setApp(existing) }, [existing?.id])
  const saved = s.apps.find((a) => a.id === app.id)
  const locked = !!saved && !EDITABLE.includes(saved.status)
  const customer = s.customers.find((c) => c.id === app.customerId)
  const t = app.terms
  const sum = summarize(t)
  const upT = (p: Partial<Terms>) => setApp({ ...app, terms: { ...t, ...p } })
  const upA = (p: Partial<LeaseApplication['asset']>) => setApp({ ...app, asset: { ...app.asset, ...p } })

  const check = (n: number) => {
    const e: Record<string, string> = {}
    if (n === 0 && !app.customerId) e.customerId = 'Select a customer or create a new one.'
    if (n === 1) {
      if (!app.asset.category) e.category = 'Select an asset category.'
      if (!app.asset.description.trim()) e.description = 'Describe the asset (make, model, year).'
      if (!app.asset.supplier.trim()) e.supplier = 'Enter the supplier name.'
    }
    if (n === 2) {
      if (!(t.price > 0)) e.price = 'Asset purchase value must be greater than 0.'
      if (t.deposit < 0 || t.deposit >= t.price) e.deposit = 'Deposit must be at least 0 and below the asset price.'
      else if (t.price > 0 && t.deposit / t.price < 0.1) e.deposit = 'Minimum customer contribution is 10% in this prototype (' + fmtMoney(t.price * 0.1) + ').'
      if (!(t.ratePct >= 0 && t.ratePct <= 40)) e.ratePct = 'Rate must be between 0% and 40%.'
      if (!t.startDate) e.startDate = 'Choose a commencement date.'
      if (t.residualPct < 0 || t.residualPct > 40) e.residualPct = 'Residual value must be 0–40% of price.'
    }
    return e
  }
  const go = (n: number) => {
    if (n > step) {
      for (let i = step; i < n; i++) { const e = check(i); if (Object.keys(e).length) { setErrors(e); setStep(i); toast('Complete the highlighted fields first.', 'bad'); return } }
    }
    setErrors({}); setStep(n)
  }
  const persist = (): boolean => {
    for (let i = 0; i < 3; i++) { const e = check(i); if (Object.keys(e).length) { setErrors(e); setStep(i); toast('Complete the highlighted fields before saving.', 'bad'); return false } }
    const toSave = { ...app, ref: app.ref || 'LA-2026-0' + (150 + s.apps.length) }
    const r = actions.saveApplication(toSave)
    if (!r.ok) { toast((r as { error: string }).error, 'bad'); return false }
    setApp(toSave); actions.setLeaseDraft({ appId: toSave.id }); return true
  }
  const customerMissing = customer ? missingDocs(customer) : []

  return (
    <div>
      <PageHeader title={saved ? `Lease application ${saved.ref}` : 'New lease application'} sub="One guided workflow: customer, documents, financing, assessment and submission."
        tag={saved ? <StatusBadge s={saved.status} /> : undefined}
        actions={<Btn onClick={() => { if (persist()) toast('Application saved') }} disabled={locked}>Save Application</Btn>} />
      {locked && <div className="mb-4"><Notice t="info" title={`This application is ${saved!.status}`}>Editing is locked while it is in this stage. Use the Approval Workbench or Contract Generation to continue.</Notice></div>}

      <ol className="mb-5 flex flex-wrap gap-2" aria-label="Lease application steps">
        {STEPS.map((n, i) => (
          <li key={n}><button onClick={() => go(i)} aria-current={i === step ? 'step' : undefined}
            className={cx('flex h-9 items-center gap-2 rounded-md border px-3 text-sm transition-colors duration-150', i === step ? 'border-teal bg-teal text-white' : i < step ? 'border-teal/40 bg-teal-soft text-navy' : 'border-line bg-white text-muted')}>
            <span className={cx('grid size-5 place-items-center rounded-full text-[11px] font-semibold', i === step ? 'bg-white text-teal' : i < step ? 'bg-teal text-white' : 'bg-canvas')}>{i < step ? <Check className="size-3" /> : i + 1}</span>{n}
          </button></li>
        ))}
      </ol>

      {step === 0 && (
        <div className="space-y-4">
          <Card title="Customer">
            <div className="flex flex-wrap items-end gap-3">
              <Field className="min-w-64 flex-1 max-w-lg" label="Select existing customer" required error={errors.customerId}>
                {(a) => <select {...a} value={app.customerId} onChange={(e) => setApp({ ...app, customerId: e.target.value })} className={inputCls(errors.customerId)}><option value="">Choose from directory…</option>{s.customers.map((c) => <option key={c.id} value={c.id}>{customerName(c)} — {c.customerNo}</option>)}</select>}
              </Field>
              <Btn onClick={() => { actions.setLeaseDraft({ customerId: '__new__' }); actions.startOnboarding(); actions.go('onboarding') }}><UserPlus className="size-4" />Create new customer</Btn>
            </div>
            <div className="mt-2 text-xs text-muted">Reuse of directory records means no re-typing: details below come straight from the customer record.</div>
            <div className="mt-2 flex flex-wrap gap-1.5">{s.customers.map((c) => <button key={c.id} onClick={() => setApp({ ...app, customerId: c.id })} className={cx('rounded-full border px-2.5 py-1 text-xs transition-colors duration-150', app.customerId === c.id ? 'border-teal bg-teal-soft text-navy' : 'border-line bg-white text-muted hover:bg-canvas')}>{customerName(c)}</button>)}</div>
          </Card>
          {customer && (
            <>
              <Card title={customerName(customer)} action={<StatusBadge s={customer.status} />}>
                <CustomerSummary c={customer} />
                {customer.status !== 'Verified' && <div className="mt-3"><Notice t="warn" title="Customer awaiting directory approval">The lease can be prepared, but verification must complete before activation in a real deployment.</Notice></div>}
              </Card>
              <Card title="Documents — assisted verification"><Documents customer={customer} onChange={(n) => actions.updateCustomer(n)} /></Card>
            </>
          )}
        </div>
      )}

      {step === 1 && (
        <Card title="Asset and supplier">
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField label="Asset category" required value={app.asset.category} onChange={(v) => upA({ category: v })} options={CATS} error={errors.category} />
            <TextField label="Asset description" required value={app.asset.description} onChange={(v) => upA({ description: v })} error={errors.description} placeholder="Toyota Hilux Double Cab 2.8 GD-6 (2026)" />
            <TextField label="Supplier / dealer" required value={app.asset.supplier} onChange={(v) => upA({ supplier: v })} error={errors.supplier} />
            <TextField label="Supplier KRA PIN" value={app.asset.supplierPin} onChange={(v) => upA({ supplierPin: v })} />
            <div className="md:col-span-2"><label htmlFor="mn" className="mb-1 block text-xs font-medium text-navy-2">Maker's notes</label><textarea id="mn" rows={3} value={app.makerNotes} onChange={(e) => setApp({ ...app, makerNotes: e.target.value })} className="w-full rounded-md border border-line p-2.5 text-sm" placeholder="Context for the approver" /></div>
          </div>
        </Card>
      )}

      {step === 2 && (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
          <Card title="Financing terms">
            <div className="grid gap-4 sm:grid-cols-2">
              <NumField label="Asset purchase value (KES)" required value={t.price} onChange={(v) => upT({ price: v })} error={errors.price} />
              <NumField label="Customer contribution / deposit (KES)" required value={t.deposit} onChange={(v) => upT({ deposit: v })} error={errors.deposit} hint={t.price ? `${((t.deposit / t.price) * 100).toFixed(1)}% of price` : undefined} />
              <SelectField label="Lease duration" value={String(t.termMonths)} onChange={(v) => upT({ termMonths: Number(v) })} options={['12', '24', '36', '48', '60', '72']} />
              <NumField label="Annual financing rate (%)" step={0.25} value={t.ratePct} onChange={(v) => upT({ ratePct: v })} error={errors.ratePct} />
              <SelectField label="Payment frequency" value={t.frequency} onChange={(v) => upT({ frequency: v as Terms['frequency'] })} options={['Monthly', 'Quarterly']} />
              <TextField label="Proposed commencement" type="date" value={t.startDate} onChange={(v) => upT({ startDate: v })} error={errors.startDate} />
              <NumField label="Residual value (% of price)" value={t.residualPct} onChange={(v) => upT({ residualPct: v })} error={errors.residualPct} />
              <NumField label="Arrangement fee (% of financed)" step={0.25} value={t.arrangementFeePct} onChange={(v) => upT({ arrangementFeePct: v })} hint="Configured charge, paid upfront" />
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={t.guarantor} onChange={(e) => upT({ guarantor: e.target.checked })} className="size-4 accent-teal" />Guarantor / collateral provided</label>
            {sum.financed > 1_500_000 && !t.guarantor && <p className="mt-1 text-xs text-warn">Facilities above KES 1.5M normally require a guarantor or collateral.</p>}
          </Card>
          <div className="space-y-4">
            <Card title="Quotation preview" action={<Simulated>Prototype estimate</Simulated>}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[['Amount financed', fmtMoney(sum.financed)], [`${t.frequency} installment`, fmtMoney(sum.installment)], ['Total installments', fmtMoney(sum.total)], ['Total financing cost', fmtMoney(sum.cost)], ['Arrangement fee', fmtMoney(sum.fee)], ['Total expected payments', fmtMoney(sum.expectedPayments)]].map(([k, v], i) => (
                  <div key={k} className={cx('rounded-md p-3', i === 1 ? 'bg-navy text-white sm:col-span-1' : 'bg-canvas')}><div className={cx('text-[11px]', i === 1 ? 'text-[#a9c3dc]' : 'text-muted')}>{k}</div><div className="text-[15px] font-semibold tabular-nums">{v}</div></div>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-muted">Reducing-balance annuity model with the residual settled in the final installment. Illustrative — requires alignment with actual LeasePac product rules.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Btn variant="primary" guide="quote" disabled={locked} onClick={() => { if (persist()) { actions.markQuoted(app.id); setQuote(true) } }}>Generate Quote</Btn>
                <Btn onClick={() => setCompare(!compare)}>{compare ? 'Hide comparison' : 'Compare scenarios'}</Btn>
              </div>
            </Card>
            {compare && <Compare a={t} b={b} setB={setB} />}
          </div>
          <div className="lg:col-span-2"><Card title="Repayment schedule"><ScheduleTable rows={sum.schedule} /></Card></div>
        </div>
      )}

      {step === 3 && (
        saved ? <AssessmentView app={saved} sendLabel="Submit for Approval" /> : (
          <Card><Notice t="info" title="Save the application first">Credit assessment uses the saved application and customer record.</Notice><div className="mt-3"><Btn variant="primary" onClick={() => persist()}>Save Application</Btn></div></Card>
        )
      )}

      <div className="mt-5 flex flex-wrap justify-between gap-2">
        <Btn onClick={() => go(Math.max(0, step - 1))} disabled={step === 0}>Back</Btn>
        <div className="flex gap-2">
          {step === 2 && <Btn disabled={locked} onClick={() => { if (persist()) { go(3) } }}>Run Credit Assessment</Btn>}
          {step < 3 && <Btn variant="primary" onClick={() => go(step + 1)}>Continue</Btn>}
        </div>
      </div>
      {step === 0 && customerMissing.length > 0 && <p className="mt-2 text-right text-xs text-warn">{customerMissing.length} mandatory document(s) missing — they will lower readiness in the assessment.</p>}

      {quote && customer && (
        <Modal title={`Lease quotation — ${app.ref || 'draft'}`} onClose={() => setQuote(false)} wide footer={<><Btn onClick={() => setQuote(false)}>Close</Btn><Btn variant="primary" onClick={() => downloadQuotePdf(app, customer)}>Download quote (PDF)</Btn></>}>
          <div className="space-y-4">
            <Notice t="warn" title="Prototype estimate">Not an offer. Requires alignment with actual LeasePac product rules.</Notice>
            <KV cols={3} items={[['Customer', customerName(customer)], ['Asset', app.asset.description], ['Commencement', fmtDate(t.startDate)], ['Asset price', fmtMoney(t.price)], ['Deposit', fmtMoney(t.deposit)], ['Amount financed', fmtMoney(sum.financed)], ['Installment', fmtMoney(sum.installment)], ['Total cost of financing', fmtMoney(sum.cost)], ['Total expected payments', fmtMoney(sum.expectedPayments)]]} />
            <ScheduleTable rows={sum.schedule} limit={6} />
          </div>
        </Modal>
      )}
    </div>
  )
}

function Compare({ a, b, setB }: { a: Terms; b: Partial<Terms>; setB: (p: Partial<Terms>) => void }) {
  const tb: Terms = { ...a, ...b, deposit: b.deposit && b.deposit > 0 ? b.deposit : a.deposit * 1.4 }
  const A = summarize(a), B = summarize(tb)
  const rows: [string, string, string][] = [
    ['Deposit', fmtMoney(a.deposit), fmtMoney(tb.deposit)], ['Duration', a.termMonths + ' months', tb.termMonths + ' months'], ['Rate', a.ratePct + '%', tb.ratePct + '%'],
    ['Amount financed', fmtMoney(A.financed), fmtMoney(B.financed)], ['Installment', fmtMoney(A.installment), fmtMoney(B.installment)], ['Total financing cost', fmtMoney(A.cost), fmtMoney(B.cost)], ['Total expected payments', fmtMoney(A.expectedPayments), fmtMoney(B.expectedPayments)],
  ]
  return (
    <Card title="Compare scenarios">
      <div className="mb-3 grid grid-cols-3 gap-3">
        <NumField label="B: deposit (KES)" value={Math.round(tb.deposit)} onChange={(v) => setB({ ...b, deposit: v })} />
        <SelectField label="B: duration" value={String(tb.termMonths)} onChange={(v) => setB({ ...b, termMonths: Number(v) })} options={['12', '24', '36', '48', '60', '72']} />
        <NumField label="B: rate (%)" step={0.25} value={tb.ratePct} onChange={(v) => setB({ ...b, ratePct: v })} />
      </div>
      <table className="w-full text-left text-[13px]"><thead className="text-xs text-muted"><tr><th className="py-1 font-medium">Metric</th><th className="font-medium">A · Current</th><th className="font-medium">B · Alternative</th></tr></thead>
        <tbody className="divide-y divide-line">{rows.map(([k, x, y]) => <tr key={k}><td className="py-1.5 text-muted">{k}</td><td className="tabular-nums">{x}</td><td className="font-medium tabular-nums">{y}</td></tr>)}</tbody></table>
      <p className="mt-2 text-xs text-muted">{B.installment < A.installment ? 'B lowers the installment' : 'B raises the installment'} and {B.cost < A.cost ? 'reduces' : 'increases'} total financing cost by {fmtMoney(Math.abs(B.cost - A.cost))}.</p>
      <div className="mt-2"><Btn size="sm" onClick={() => toast('Scenario B is for comparison only — edit terms on the left to adopt it.', 'info')}>How do I adopt B?</Btn></div>
    </Card>
  )
}
