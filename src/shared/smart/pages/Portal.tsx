import React, { useState } from 'react'
import { Check, Circle, Search } from 'lucide-react'
import { useStore } from '../store'
import { customerName, ensureDocSlots, fmtDate, fmtMoney, summarize } from '../engine'
import type { Status } from '../types'
import { Btn, Card, DemoTag, Notice, PageHeader, StatusBadge, cx, inputCls, Simulated } from '../ui'

const STAGES = ['Application received', 'Documents checked', 'Under review', 'Decision', 'Agreement', 'Lease active']
const PLAIN: Record<Status, { stage: number; msg: string; next: string }> = {
  'Draft': { stage: 0, msg: 'We are preparing your application.', next: 'Your leasing officer will confirm your details with you.' },
  'Submitted': { stage: 0, msg: 'We have received your application.', next: 'We will check your documents next.' },
  'Verification Pending': { stage: 1, msg: 'We need a few more documents before we can continue.', next: 'Send the documents listed below to your leasing officer.' },
  'Credit Review': { stage: 2, msg: 'We are reviewing your financial information.', next: 'No action needed from you right now.' },
  'Awaiting Approval': { stage: 3, msg: 'Your application is with a manager for a final decision.', next: 'We will contact you as soon as a decision is made.' },
  'Returned for Correction': { stage: 1, msg: 'We need you to correct or confirm some information.', next: 'Your leasing officer will call you to update the details.' },
  'Approved': { stage: 4, msg: 'Good news — your lease has been approved.', next: 'We are preparing your agreement.' },
  'Rejected': { stage: 3, msg: 'We are unable to proceed with this application as submitted.', next: 'Speak to your leasing officer about other options, such as a larger deposit.' },
  'Contract Pending': { stage: 4, msg: 'Your lease agreement is being prepared for you to review and sign.', next: 'You will be invited to review and sign the agreement.' },
  'Ready for Activation': { stage: 4, msg: 'Your agreement is signed and your lease is being set up.', next: 'We will confirm the start date and your first payment.' },
  'Active': { stage: 5, msg: 'Your lease is active.', next: 'Your next payment date is shown in your lease schedule.' },
}

export function Portal() {
  const s = useStore()
  const [q, setQ] = useState('LA-2026-0143')
  const [shown, setShown] = useState('LA-2026-0143')
  const app = s.apps.find((a) => a.ref.toLowerCase() === shown.trim().toLowerCase())
  const c = s.customers.find((x) => x.id === app?.customerId)
  const p = app ? PLAIN[app.status] : null
  const docs = c ? ensureDocSlots(c.type, c.documents).filter((d) => d.required) : []
  const outstanding = docs.filter((d) => d.status === 'Missing')
  return (
    <div>
      <PageHeader title="Customer status tracker" tag={<DemoTag />} sub="What your customer sees: plain-language progress, no internal system jargon, no account or sensitive data needed for the demo." />
      <Card>
        <form onSubmit={(e) => { e.preventDefault(); setShown(q) }} className="flex flex-wrap items-end gap-2">
          <div className="min-w-56 flex-1 max-w-md"><label htmlFor="refq" className="mb-1 block text-xs font-medium text-navy-2">Application reference</label>
            <div className="relative"><Search className="absolute left-2.5 top-2.5 size-4 text-muted" aria-hidden /><input id="refq" value={q} onChange={(e) => setQ(e.target.value)} className={inputCls() + ' pl-8'} /></div></div>
          <Btn variant="primary" type="submit">Check status</Btn>
        </form>
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted">Demo references: {s.apps.slice(0, 8).map((a) => <button key={a.id} onClick={() => { setQ(a.ref); setShown(a.ref) }} className="rounded border border-line px-1.5 py-0.5 font-mono hover:bg-canvas">{a.ref}</button>)}</div>
      </Card>
      {!app || !p ? <div className="mt-4"><Notice t="warn" title="Reference not found">Check the reference and try again, or pick one of the demo references above.</Notice></div> : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2"><div><div className="text-xs text-muted">Hello {c?.type === 'Business / Corporate' ? customerName(c) : c?.firstName}</div><h2 className="text-lg font-semibold text-navy">{p.msg}</h2></div><StatusBadge s={app.status} /></div>
            <ol className="mt-5 grid grid-cols-3 gap-y-5 sm:grid-cols-6" aria-label="Progress">
              {STAGES.map((n, i) => (
                <li key={n} className="flex flex-col items-center gap-1.5 text-center">
                  <span className={cx('grid size-8 place-items-center rounded-full text-xs font-semibold', i < p.stage || app.status === 'Active' ? 'bg-teal text-white' : i === p.stage ? 'border-2 border-teal bg-white text-teal' : 'bg-canvas text-muted')}>{i < p.stage || app.status === 'Active' ? <Check className="size-4" /> : i + 1}</span>
                  <span className={cx('text-[11px] leading-tight', i <= p.stage ? 'font-medium text-ink' : 'text-muted')}>{n}</span>
                </li>
              ))}
            </ol>
            <div className="mt-5 rounded-md bg-teal-soft p-3 text-sm"><b className="text-navy">Next step: </b>{p.next}</div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-xs text-muted">Asset</dt><dd className="font-medium">{app.asset.description}</dd></div><div><dt className="text-xs text-muted">Amount financed</dt><dd className="font-medium">{fmtMoney(summarize(app.terms).financed)}</dd></div><div><dt className="text-xs text-muted">Application date</dt><dd className="font-medium">{fmtDate(app.createdAt)}</dd></div></dl>
          </Card>
          <div className="space-y-4">
            <Card title="Outstanding requirements">
              {outstanding.length === 0 && !['Returned for Correction', 'Verification Pending'].includes(app.status) ? <p className="flex items-center gap-2 text-sm text-ok"><Check className="size-4" />Nothing outstanding.</p> : (
                <ul className="space-y-1.5 text-sm">{outstanding.map((d) => <li key={d.id} className="flex gap-2 text-bad"><Circle className="mt-1 size-3" />Please send your {d.type.toLowerCase()}.</li>)}{outstanding.length === 0 && <li className="text-muted">Your officer will contact you about the correction.</li>}</ul>
              )}
            </Card>
            <Card title="Submitted documents">
              <ul className="space-y-1.5 text-sm">{docs.map((d) => <li key={d.id} className="flex items-center justify-between"><span>{d.type}</span><span className={cx('text-xs font-medium', d.status === 'Missing' ? 'text-bad' : 'text-ok')}>{d.status === 'Missing' ? 'Needed' : 'Received'}</span></li>)}</ul>
            </Card>
            <p className="text-xs text-muted">Status messages are shown by SMS/email in a real deployment. <Simulated>Messaging simulated</Simulated></p>
          </div>
        </div>
      )}
    </div>
  )
}
