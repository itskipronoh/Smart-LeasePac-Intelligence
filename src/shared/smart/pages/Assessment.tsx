import React, { useState } from 'react'
import { ShieldAlert, Calculator } from 'lucide-react'
import { actions, currentUser, useStore } from '../store'
import { RULES_DOC, can, customerName, fmtMoney, routeFor, summarize } from '../engine'
import type { LeaseApplication } from '../types'
import { Badge, Btn, Card, Empty, Modal, Notice, PageHeader, ScoreGauge, StatusBadge, KV, Simulated, report, useBusy, cx, inputCls } from '../ui'

export function Assessment() {
  const s = useStore()
  const [id, setId] = useState(s.leaseDraft?.appId ?? s.apps.find((a) => a.status === 'Credit Review')?.id ?? s.apps[0]?.id ?? '')
  const app = s.apps.find((a) => a.id === id)
  return (
    <div>
      <PageHeader title="AI Credit Assessment" sub="Transparent, rule-based decision support. A recommendation never authorizes a lease — a human approver always decides." tag={<Simulated>Prototype rules</Simulated>} />
      <div className="mb-4 max-w-xl">
        <label htmlFor="asapp" className="mb-1 block text-xs font-medium text-navy-2">Lease application</label>
        <select id="asapp" className={inputCls()} value={id} onChange={(e) => setId(e.target.value)}>
          {s.apps.map((a) => <option key={a.id} value={a.id}>{a.ref} — {customerName(s.customers.find((c) => c.id === a.customerId))} ({a.status})</option>)}
        </select>
      </div>
      {app ? <AssessmentView app={app} /> : <Empty title="No applications yet" action={<Btn variant="primary" onClick={() => actions.go('new-lease')}>Start New Lease Application</Btn>} />}
    </div>
  )
}

export function AssessmentView({ app, sendLabel = 'Send for Approval' }: { app: LeaseApplication; sendLabel?: string }) {
  const s = useStore()
  const user = currentUser(s)
  const c = s.customers.find((x) => x.id === app.customerId)
  const a = s.assessments.find((x) => x.appId === app.id)
  const sum = summarize(app.terms)
  const [busy, run] = useBusy(900)
  const [explain, setExplain] = useState(false)
  const [info, setInfo] = useState(false)
  const [override, setOverride] = useState(false)
  const [note, setNote] = useState('')
  const [dec, setDec] = useState('Proceed to approval')
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')
  if (!c) return <Notice t="bad" title="Customer record not found" />
  const income = c.monthlyIncome
  const dsr = a?.dsr ?? (income > 0 ? (c.monthlyDebt + sum.monthlyEquivalent) / income : 0)
  const locked = ['Approved', 'Contract Pending', 'Ready for Activation', 'Active', 'Rejected', 'Awaiting Approval'].includes(app.status)
  const tone = a?.risk === 'Low' ? 'ok' : a?.risk === 'Medium' ? 'warn' : 'bad'

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Applicant & request" className="lg:col-span-2">
          <KV cols={3} items={[
            ['Applicant', <span key="n" className="flex items-center gap-2">{customerName(c)}<StatusBadge s={app.status} /></span>], ['Application', app.ref], ['Asset', app.asset.description],
            ['Requested lease value', fmtMoney(sum.financed)], ['Lease period', `${app.terms.termMonths} months`], ['Est. monthly repayment', fmtMoney(sum.monthlyEquivalent)],
            ['Declared monthly income', fmtMoney(income)], ['Existing monthly debt', fmtMoney(c.monthlyDebt)], ['Debt service ratio', <b key="d" className={cx(dsr < 0.4 ? 'text-ok' : dsr < 0.5 ? 'text-warn' : 'text-bad')}>{(dsr * 100).toFixed(0)}%</b>],
            ['Stability', a?.stability ?? `${c.yearsInRole} yrs · ${c.employmentType || 'n/a'}`], ['Document completeness', a ? a.docCompleteness + '%' : 'Run assessment'], ['Affordability', a?.affordability ?? '—'],
          ]} />
        </Card>
        <Card title="Risk score" className="flex flex-col">
          {a ? (
            <div className="space-y-3">
              <ScoreGauge score={a.score} risk={a.risk} />
              <div className="flex items-center gap-2"><Badge t={tone}>{a.risk} risk</Badge><span className="text-sm font-semibold text-navy">{a.recommendation}</span></div>
              {a.override && <Notice t="warn" title="Officer override recorded">{a.override.decision}: “{a.override.reason}” — {a.override.by}</Notice>}
            </div>
          ) : <Empty title="Not assessed yet">Run the assessment to calculate affordability and risk from the application.</Empty>}
        </Card>
      </div>

      {a && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Top risk factors" pad={false}>
            <ul className="divide-y divide-line">
              {[...a.factors].sort((x, y) => Math.abs(y.points) - Math.abs(x.points)).slice(0, 5).map((f) => (
                <li key={f.name} className="flex items-start gap-3 px-4 py-2.5">
                  <span className={cx('mt-0.5 w-10 shrink-0 rounded px-1 py-0.5 text-center text-xs font-semibold tabular-nums', f.points > 0 ? 'bg-bad-soft text-bad' : f.points < 0 ? 'bg-ok-soft text-ok' : 'bg-canvas text-muted')}>{f.points > 0 ? '+' : ''}{f.points}</span>
                  <div className="text-[13px]"><div className="font-medium text-ink">{f.name} <span className="font-normal text-muted">· {f.effect}</span></div><div className="text-muted">{f.detail}</div></div>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Recommended next action">
            <p className="text-sm text-ink">{a.nextAction}</p>
            <p className="mt-2 text-xs text-muted">Suggested route: {routeFor(app, a)}</p>
            {a.missing.length > 0 && <div className="mt-3"><Notice t="warn" title="Missing information">{a.missing.join(' · ')}</Notice></div>}
          </Card>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Btn variant="primary" guide="assess" busy={busy} onClick={() => run(() => report(actions.runAssessment(app.id), 'Assessment complete'))}><Calculator className="size-4" />{a ? 'Re-run Assessment' : 'Run Assessment'}</Btn>
        <Btn disabled={!a} onClick={() => setExplain(true)}>View Explanation</Btn>
        <Btn disabled={!a || locked} onClick={() => setInfo(true)}>Request More Information</Btn>
        <Btn disabled={!a || !can(user.role, 'override')} title={can(user.role, 'override') ? '' : 'Credit Analyst, Approving Manager or Admin only'} onClick={() => setOverride(true)}>Override recommendation</Btn>
        <Btn variant="ok" guide="submit" disabled={!a || locked} onClick={() => report(actions.submitForApproval(app.id), 'Submitted — now awaiting an approver')}>{sendLabel}</Btn>
      </div>
      {!can(user.role, 'submit') && <p className="text-xs text-muted">Your role ({user.name}) cannot submit applications. Switch to Leasing Officer or Credit Analyst.</p>}

      <Notice t="warn" title="Prototype decision-support tool"><ShieldAlert className="mr-1 inline size-3.5" />Uses example rules and synthetic data. No credit bureau, trained model or production credit information is used, and the output is not a credit decision.</Notice>

      {explain && a && (
        <Modal wide title="How was this recommendation calculated?" onClose={() => setExplain(false)} footer={<Btn onClick={() => setExplain(false)}>Close</Btn>}>
          <div className="space-y-4 text-sm">
            <p className="text-muted">Score = 25 starting points + the adjustments below, clamped to 0–100. Higher means higher risk.</p>
            <table className="w-full text-left text-[13px]"><thead className="text-xs text-muted"><tr><th className="py-1">Rule</th><th>Points</th><th>Why</th></tr></thead><tbody className="divide-y divide-line">
              <tr><td className="py-1.5">Starting score</td><td className="tabular-nums">25</td><td className="text-muted">Neutral baseline</td></tr>
              {a.factors.map((f) => <tr key={f.name}><td className="py-1.5 font-medium">{f.name}</td><td className="tabular-nums">{f.points > 0 ? '+' : ''}{f.points}</td><td className="text-muted">{f.detail}</td></tr>)}
              <tr className="font-semibold"><td className="py-1.5">Total</td><td className="tabular-nums">{a.score}</td><td>{a.risk} risk → {a.recommendation}</td></tr>
            </tbody></table>
            <div><h3 className="mb-1 font-semibold text-navy">Documented rules</h3><ul className="list-disc space-y-1 pl-5 text-[13px] text-muted">{RULES_DOC.map((r) => <li key={r}>{r}</li>)}</ul></div>
          </div>
        </Modal>
      )}
      {info && (
        <Modal title="Request more information" onClose={() => setInfo(false)} footer={<><Btn onClick={() => setInfo(false)}>Cancel</Btn><Btn variant="primary" onClick={() => { const r = actions.requestInfo(app.id, note || (a?.missing.length ? 'Please provide: ' + a.missing.join(', ') : 'Additional information required.')); if (report(r, 'Request recorded — customer notified (simulated message)')) setInfo(false) }}>Send request</Btn></>}>
          <p className="mb-2 text-sm text-muted">The application moves to Verification Pending and the customer sees the outstanding items in the status tracker. <Simulated>Message simulated</Simulated></p>
          <textarea aria-label="Request note" rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder={a?.missing.length ? 'Please provide: ' + a.missing.join(', ') : 'What do you need from the customer?'} className="w-full rounded-md border border-line p-2.5 text-sm" />
        </Modal>
      )}
      {override && (
        <Modal title="Override recommendation" onClose={() => setOverride(false)} footer={<><Btn onClick={() => setOverride(false)}>Cancel</Btn><Btn variant="primary" onClick={() => { const r = actions.overrideAssessment(app.id, dec, reason); if (r.ok) { setOverride(false); setReason(''); setErr(''); report(r, 'Override recorded in the audit trail') } else setErr((r as { error: string }).error) }}>Record override</Btn></>}>
          <div className="space-y-3">
            <Notice t="info">Overrides are never silent: your name, the time and your reason are written to the audit trail.</Notice>
            <select aria-label="Override decision" value={dec} onChange={(e) => setDec(e.target.value)} className={inputCls()}>{['Proceed to approval', 'Return to maker', 'Decline'].map((o) => <option key={o}>{o}</option>)}</select>
            <textarea aria-label="Override reason" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Documented reason (required)" className="w-full rounded-md border border-line p-2.5 text-sm" />
            {err && <p role="alert" className="text-xs text-bad">{err}</p>}
          </div>
        </Modal>
      )}
    </div>
  )
}
