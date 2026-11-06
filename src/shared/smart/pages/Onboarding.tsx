import React, { useMemo, useState } from 'react'
import { Check, User, Users, Building2, UsersRound } from 'lucide-react'
import { actions, getState, useStore } from '../store'
import { customerName, missingDocs } from '../engine'
import type { Customer, CustomerType } from '../types'
import { Btn, Card, Notice, NumField, PageHeader, SelectField, StatusBadge, TextField, cx, report, toast, KV } from '../ui'
import { Documents } from '../Documents'

const STEPS = ['Customer Type', 'Details', 'Contacts', 'Documents', 'Review']
const TYPES: [CustomerType, string, React.ElementType][] = [
  ['Individual', 'One person applying in their own name', User], ['Joint Account', 'Two people sharing responsibility', Users],
  ['Group', 'Chama, SACCO or registered group', UsersRound], ['Business / Corporate', 'Registered company or partnership', Building2],
]
const COUNTIES = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Uasin Gishu', 'Kiambu', 'Machakos', 'Trans Nzoia', 'Kajiado', 'Nyeri']

export function validate(c: Customer, step: number): Record<string, string> {
  const e: Record<string, string> = {}
  const biz = c.type === 'Business / Corporate'
  if (step === 1) {
    if (biz) {
      if (!c.businessName.trim()) e.businessName = 'Enter the registered business name.'
      if (!c.regNo.trim()) e.regNo = 'Enter the registration number.'
      if (!/^[AP]\d{9}[A-Z]$/i.test(c.pin)) e.pin = 'KRA PIN must look like P051234567K (letter, 9 digits, letter).'
      if (!c.industry) e.industry = 'Select an industry.'
    } else {
      if (!c.firstName.trim()) e.firstName = 'First name is required.'
      if (!c.lastName.trim()) e.lastName = 'Last name is required.'
      if (!c.dob) e.dob = 'Date of birth is required.'
      else if (new Date(c.dob) > new Date()) e.dob = 'Date of birth cannot be in the future.'
      if (!c.gender) e.gender = 'Select a gender.'
      if (!c.idNumber.trim()) e.idNumber = 'Enter the ID or passport number.'
      else if (c.idType === 'National ID' && !/^\d{7,8}$/.test(c.idNumber)) e.idNumber = 'National ID must be 7–8 digits.'
      if (!c.occupation.trim()) e.occupation = 'Occupation is required.'
      if (!c.employmentType) e.employmentType = 'Select an employment type.'
    }
    if (!(c.monthlyIncome > 0)) e.monthlyIncome = 'Declared monthly income must be greater than 0.'
    if (c.monthlyDebt < 0) e.monthlyDebt = 'Obligations cannot be negative.'
  }
  if (step === 2) {
    if (!/^\S+@\S+\.\S+$/.test(c.email)) e.email = 'Enter a valid email, e.g. name@company.co.ke.'
    if (!/^(\+254|0)[17]\d{8}$/.test(c.mobile.replace(/\s/g, ''))) e.mobile = 'Use a Kenyan mobile: +2547XXXXXXXX or 07XXXXXXXX.'
    if (!c.physicalAddress.trim()) e.physicalAddress = 'Physical address is required.'
    if (!c.county) e.county = 'Select a county.'
    if (!c.city.trim()) e.city = 'City or town is required.'
  }
  return e
}

export function Onboarding({ legacy }: { legacy?: boolean }) {
  const s = useStore()
  const c = s.onboardDraft ?? null
  const step = s.onboardStep
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [tried, setTried] = useState(false)
  const [done, setDone] = useState<Customer | null>(null)

  const set = <K extends keyof Customer>(k: K) => (v: Customer[K]) => {
    if (!c) return
    const next = { ...c, [k]: v }
    actions.setOnboard(next)
    if (tried) setErrors(validate(next, step))
  }
  const all = useMemo(() => (c ? { ...validate(c, 1), ...validate(c, 2) } : {}), [c])
  if (done) {
    const fromLease = getState().leaseDraft?.customerId === '__new__'
    return (
      <div>
        <PageHeader title="Customer submitted for verification" />
        <Card><div className="space-y-3">
          <Notice t="ok" title={`${customerName(done)} (${done.customerNo}) is now in the directory`}>{missingDocs(done).length ? `Missing documents are flagged: ${missingDocs(done).join(', ')}.` : 'All mandatory documents are on file.'} A second user must approve the customer (maker-checker).</Notice>
          <div className="flex flex-wrap gap-2">
            <Btn variant="primary" onClick={() => { actions.setLeaseDraft({ customerId: done.id }); actions.go('new-lease') }}>Start lease for this customer</Btn>
            <Btn onClick={() => actions.go('approve-customer')}>Go to Approve Customer</Btn>
            <Btn onClick={() => { setDone(null); actions.startOnboarding() }}>Capture another</Btn>
          </div>
        </div></Card>
      </div>
    )
  }
  if (!c) {
    return (
      <div>
        <PageHeader title={legacy ? 'Capture Customer' : 'Smart Onboarding'} sub="A guided five-step journey that reuses existing directory data and flags missing information immediately." />
        {legacy && <div className="mb-4"><Notice t="info" title="Original LeasePac function — enhanced">The classic Directory Information form is replaced by this guided flow. The same fields are captured, with validation and document assistance.</Notice></div>}
        <Card><div className="flex flex-wrap items-center justify-between gap-3">
          <div><div className="font-semibold text-navy">Capture a new customer</div><p className="text-sm text-muted">Individual, joint, group or business — about two minutes with sample data.</p></div>
          <Btn variant="primary" onClick={() => actions.startOnboarding()}>Begin onboarding</Btn>
        </div></Card>
      </div>
    )
  }

  const biz = c.type === 'Business / Corporate'
  const err = (k: string) => errors[k]
  const goto = (n: number) => { actions.setOnboard(c, n); setErrors({}); setTried(false) }
  const next = () => {
    const e = validate(c, step)
    if (Object.keys(e).length) { setErrors(e); setTried(true); toast(`Fix ${Object.keys(e).length} field${Object.keys(e).length > 1 ? 's' : ''} before continuing.`, 'bad'); return }
    goto(step + 1)
  }
  const reqCount = biz ? 6 : 8
  const filled = Object.keys(all).length
  const docsOk = 4 - missingDocs(c).length
  const pct = Math.max(0, Math.min(100, Math.round(((reqCount + 5 - Object.keys(all).length) + docsOk) / (reqCount + 5 + 4) * 100)))

  const submit = () => {
    const e = { ...validate(c, 1), ...validate(c, 2) }
    if (Object.keys(e).length) { toast('Required details are incomplete — return to the highlighted step.', 'bad'); setErrors(e); setTried(true); goto(Object.keys(validate(c, 1)).length ? 1 : 2); return }
    const r = actions.saveCustomer(c, 'Pending Verification')
    if (report(r, 'Customer submitted for verification')) { setDone(c); actions.setOnboard(null, 0) }
  }

  return (
    <div>
      <PageHeader title={legacy ? 'Capture Customer' : 'Smart Onboarding'} sub={`${c.customerNo} · ${customerName(c) === 'Unnamed customer' ? 'New customer' : customerName(c)}`}
        actions={<Btn onClick={() => { const r = actions.saveCustomer(c, 'Draft'); report(r, 'Draft saved — find it in Directory') }}>Save Draft</Btn>} />
      {legacy && <div className="mb-4"><Notice t="info" title="Original LeasePac function — enhanced">Replaces the single long Directory Information form with a guided flow that reuses captured data.</Notice></div>}

      <ol className="mb-5 flex flex-wrap gap-2" aria-label="Onboarding steps">
        {STEPS.map((n, i) => (
          <li key={n}>
            <button onClick={() => i <= step && goto(i)} disabled={i > step} aria-current={i === step ? 'step' : undefined}
              className={cx('flex h-9 items-center gap-2 rounded-md border px-3 text-sm transition-colors duration-150', i === step ? 'border-teal bg-teal text-white' : i < step ? 'border-teal/40 bg-teal-soft text-navy' : 'border-line bg-white text-muted')}>
              <span className={cx('grid size-5 place-items-center rounded-full text-[11px] font-semibold', i === step ? 'bg-white text-teal' : i < step ? 'bg-teal text-white' : 'bg-canvas')}>{i < step ? <Check className="size-3" /> : i + 1}</span>{n}
            </button>
          </li>
        ))}
        <li className="ml-auto flex items-center gap-2 text-xs text-muted" aria-label={`Completion ${pct}%`}>Completion<span className="h-2 w-28 overflow-hidden rounded-full bg-line"><span className="block h-full bg-teal transition-[width] duration-300 ease-out" style={{ width: pct + '%' }} /></span><b className="text-navy">{pct}%</b></li>
      </ol>

      {step === 0 && (
        <Card title="What type of customer is this?">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="radiogroup" aria-label="Customer type">
            {TYPES.map(([t, d, Icon]) => (
              <button key={t} role="radio" aria-checked={c.type === t} onClick={() => actions.setOnboard({ ...c, type: t })}
                className={cx('flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors duration-150', c.type === t ? 'border-teal bg-teal-soft' : 'border-line bg-white hover:bg-canvas')}>
                <Icon className="size-6 text-teal" /><span className="font-semibold text-navy">{t}</span><span className="text-xs text-muted">{d}</span>
              </button>
            ))}
          </div>
          <ReuseLookup onPick={(x) => { actions.setOnboard(JSON.parse(JSON.stringify(x))); toast(`Loaded ${customerName(x)} — nothing needs retyping`) }} />
        </Card>
      )}

      {step === 1 && (
        <Card title={biz ? 'Business details' : 'Personal details'}>
          {biz ? (
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="Registered business name" required value={c.businessName} onChange={set('businessName')} error={err('businessName')} />
              <TextField label="Registration number" required value={c.regNo} onChange={set('regNo')} error={err('regNo')} placeholder="CPR/2016/482913" />
              <TextField label="KRA PIN / tax identifier" required value={c.pin} onChange={set('pin')} error={err('pin')} placeholder="P051234567K" />
              <SelectField label="Industry" required value={c.industry} onChange={set('industry')} options={['Agribusiness', 'Agriculture', 'Construction supplies', 'Transport & logistics', 'Healthcare', 'Manufacturing', 'Retail & wholesale', 'ICT services']} error={err('industry')} />
              <TextField label="Business sector" value={c.sector} onChange={set('sector')} />
              <TextField label="Authorized representatives" value={c.representatives} onChange={set('representatives')} hint="Names and roles, separated by commas" />
              <NumField label="Years trading" value={c.yearsInRole} onChange={set('yearsInRole')} />
              <NumField label="Average monthly business income (KES)" required value={c.monthlyIncome} onChange={set('monthlyIncome')} error={err('monthlyIncome')} />
              <NumField label="Existing monthly obligations (KES)" value={c.monthlyDebt} onChange={set('monthlyDebt')} error={err('monthlyDebt')} />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              <TextField label="First name" required value={c.firstName} onChange={set('firstName')} error={err('firstName')} />
              <TextField label="Middle name" value={c.middleName} onChange={set('middleName')} />
              <TextField label="Last name" required value={c.lastName} onChange={set('lastName')} error={err('lastName')} />
              <TextField label="Date of birth" required type="date" value={c.dob} onChange={set('dob')} error={err('dob')} />
              <SelectField label="Gender" required value={c.gender} onChange={set('gender')} options={['Female', 'Male']} error={err('gender')} />
              <TextField label="Customer number" value={c.customerNo} onChange={set('customerNo')} />
              <SelectField label="Identification type" value={c.idType} onChange={set('idType')} options={['National ID', 'Passport', 'Alien ID']} />
              <TextField label="ID / Passport number" required value={c.idNumber} onChange={set('idNumber')} error={err('idNumber')} />
              <TextField label="Nationality" value={c.nationality} onChange={set('nationality')} />
              <TextField label="Occupation" required value={c.occupation} onChange={set('occupation')} error={err('occupation')} />
              <TextField label="Employer" value={c.employer} onChange={set('employer')} />
              <SelectField label="Employment type" required value={c.employmentType} onChange={set('employmentType')} options={['Permanent', 'Contract', 'Self-employed', 'Business owner']} error={err('employmentType')} />
              <NumField label="Years in current role" value={c.yearsInRole} onChange={set('yearsInRole')} />
              <NumField label="Monthly income (KES)" required value={c.monthlyIncome} onChange={set('monthlyIncome')} error={err('monthlyIncome')} />
              <NumField label="Existing monthly obligations (KES)" value={c.monthlyDebt} onChange={set('monthlyDebt')} error={err('monthlyDebt')} hint="Loans, credit cards, other leases" />
            </div>
          )}
          {!biz && <p className="mt-3 text-xs text-muted">Gender, date of birth and nationality are captured for KYC records only — the credit rules never use them.</p>}
        </Card>
      )}

      {step === 2 && (
        <Card title="Contacts and addresses">
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Email" required type="email" value={c.email} onChange={set('email')} error={err('email')} />
            <TextField label="Mobile number" required value={c.mobile} onChange={set('mobile')} error={err('mobile')} placeholder="+254 7XX XXX XXX" />
            <TextField label="Alternative contact" value={c.altContact} onChange={set('altContact')} hint="Next of kin or finance contact" />
            <TextField label="Postal address" value={c.postalAddress} onChange={set('postalAddress')} />
            <TextField label="Physical address" required value={c.physicalAddress} onChange={set('physicalAddress')} error={err('physicalAddress')} className="md:col-span-2" />
            <SelectField label="County" required value={c.county} onChange={set('county')} options={COUNTIES} error={err('county')} />
            <TextField label="City / town" required value={c.city} onChange={set('city')} error={err('city')} />
            <TextField label="Country" value={c.country} onChange={set('country')} />
          </div>
        </Card>
      )}

      {step === 3 && <Card title="Documents"><Documents customer={c} onChange={(n) => actions.setOnboard(n)} /></Card>}

      {step === 4 && (
        <div className="space-y-4">
          <Card title="Review customer information">
            {Object.keys(all).length > 0 && <div className="mb-4"><Notice t="bad" title={`${Object.keys(all).length} required field(s) incomplete`}>{Object.values(all).join(' ')}</Notice></div>}
            <KV cols={3} items={[
              ['Type', c.type], [biz ? 'Business' : 'Name', customerName(c)], ['Customer no.', c.customerNo],
              [biz ? 'Registration' : c.idType, biz ? c.regNo : c.idNumber], ['KRA PIN', c.pin], [biz ? 'Industry' : 'Occupation', biz ? c.industry : `${c.occupation}${c.employer ? ' · ' + c.employer : ''}`],
              ['Monthly income', 'KES ' + c.monthlyIncome.toLocaleString('en-KE')], ['Monthly obligations', 'KES ' + c.monthlyDebt.toLocaleString('en-KE')], ['Email', c.email],
              ['Mobile', c.mobile], ['Address', `${c.physicalAddress}, ${c.city}, ${c.county}`], ['Documents', <span key="d" className="flex items-center gap-2">{4 - missingDocs(c).length}/4 mandatory {missingDocs(c).length > 0 && <StatusBadge s="Missing" />}</span>],
            ]} />
          </Card>
          {missingDocs(c).length > 0 && <Notice t="warn" title="Missing documents will be flagged">{missingDocs(c).join(', ')}. You can still submit; the application will show these as outstanding requirements.</Notice>}
        </div>
      )}

      <div className="mt-5 flex flex-wrap justify-between gap-2">
        <Btn onClick={() => goto(Math.max(0, step - 1))} disabled={step === 0}>Back</Btn>
        <div className="flex gap-2">
          {step < 3 && <Btn variant="primary" onClick={next}>Continue</Btn>}
          {step === 3 && <Btn variant="primary" onClick={next}>Review Details</Btn>}
          {step === 4 && <Btn variant="primary" onClick={submit}>Submit for Verification</Btn>}
        </div>
      </div>
    </div>
  )
}

function ReuseLookup({ onPick }: { onPick: (c: Customer) => void }) {
  const s = useStore()
  const [q, setQ] = useState('')
  const hits = q.trim().length >= 3 ? s.customers.filter((x) => [x.idNumber, x.pin, x.regNo, x.customerNo, customerName(x)].some((v) => v.toLowerCase().includes(q.toLowerCase()))) : []
  return (
    <div className="mt-5 rounded-md border border-dashed border-teal/50 bg-teal-soft/50 p-4">
      <label htmlFor="reuse" className="text-sm font-semibold text-navy">Already in the directory?</label>
      <p className="text-xs text-muted">Search by name, ID, PIN or customer number to reuse captured information instead of retyping it.</p>
      <input id="reuse" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. 27845612 or Kijani" className="mt-2 h-9 w-full max-w-md rounded-md border border-line bg-white px-2.5 text-sm" />
      {q.trim().length >= 3 && (hits.length === 0 ? <p className="mt-2 text-xs text-muted">No match — continue to capture a new customer.</p> : (
        <ul className="mt-2 space-y-1">{hits.slice(0, 3).map((h) => <li key={h.id} className="flex items-center justify-between gap-2 rounded bg-white px-3 py-2 text-sm"><span>{customerName(h)} <span className="text-muted">· {h.customerNo}</span></span><Btn size="sm" onClick={() => onPick(h)}>Reuse record</Btn></li>)}</ul>
      ))}
    </div>
  )
}
