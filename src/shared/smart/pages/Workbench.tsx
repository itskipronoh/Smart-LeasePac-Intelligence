import React, { useState } from 'react'
import { Search } from 'lucide-react'
import { actions, currentUser, useStore } from '../store'
import { ROLE_LABEL, can, customerName, fmtDate, fmtDateTime, fmtMoney, routeFor, summarize, STATUSES } from '../engine'
import { USERS } from '../seed'
import { Badge, Btn, Card, Drawer, Empty, Notice, PageHeader, StatusBadge, Table, Td, KV, inputCls, report, cx } from '../ui'
import { CustomerSummary } from './Directory'
import { ScheduleTable } from '../Schedule'

export function Workbench() {
  const s = useStore()
  const user = currentUser(s)
  const [q, setQ] = useState('')
  const [st, setSt] = useState('')
  const [risk, setRisk] = useState('')
  const [pr, setPr] = useState('')
  const [open, setOpen] = useState<string | null>(s.route.id ?? null)
  const rows = s.apps.filter((a) => {
    const c = s.customers.find((x) => x.id === a.customerId)
    const as = s.assessments.find((x) => x.appId === a.id)
    return (!q || [a.ref, customerName(c), a.asset.description].some((v) => v.toLowerCase().includes(q.toLowerCase()))) && (!st || a.status === st) && (!risk || (as?.risk ?? 'Unassessed') === risk) && (!pr || a.priority === pr)
  })
  const sel = s.apps.find((a) => a.id === open)
  const can_ = ['decide'].filter((p) => can(user.role, p as 'decide'))
  return (
    <div>
      <PageHeader title="Approval Workbench" sub="Role-aware queue. AI recommends and routes; only authorized people decide." />
      <div className="mb-4"><Notice t="info" title={`Acting as ${ROLE_LABEL[user.role]} — ${user.name}`}>
        {user.role === 'checker' || user.role === 'admin' ? 'You can approve, reject, return, or request documents. You cannot approve an application you prepared.' : user.role === 'ops' ? 'You can progress approved applications to contract and activation. Approval decisions are hidden for your role.' : user.role === 'analyst' ? 'You can review assessments, record overrides and return requests for more information. Switch to Approving Manager to decide.' : 'You prepare and submit applications. Switch to Approving Manager to see decision actions.'}
      </Notice></div>
      <Card pad={false}>
        <div className="flex flex-wrap gap-2 border-b border-line p-3">
          <div className="relative min-w-52 flex-1"><Search className="absolute left-2.5 top-2.5 size-4 text-muted" aria-hidden /><input aria-label="Search requests" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reference, customer or asset" className={inputCls() + ' pl-8'} /></div>
          <select aria-label="Stage" value={st} onChange={(e) => setSt(e.target.value)} className={inputCls() + ' !w-auto'}><option value="">All stages</option>{STATUSES.map((x) => <option key={x}>{x}</option>)}</select>
          <select aria-label="Risk" value={risk} onChange={(e) => setRisk(e.target.value)} className={inputCls() + ' !w-auto'}><option value="">All risk</option>{['Low', 'Medium', 'High', 'Unassessed'].map((x) => <option key={x}>{x}</option>)}</select>
          <select aria-label="Priority" value={pr} onChange={(e) => setPr(e.target.value)} className={inputCls() + ' !w-auto'}><option value="">All priority</option>{['High', 'Normal', 'Low'].map((x) => <option key={x}>{x}</option>)}</select>
        </div>
        <Table head={['Reference', 'Customer', 'Asset', 'Lease value', 'Risk', 'Stage', 'Submitted', 'Reviewer', 'Priority']}
          empty={rows.length === 0 ? <Empty title="No requests match these filters" action={<Btn onClick={() => { setQ(''); setSt(''); setRisk(''); setPr('') }}>Clear filters</Btn>} /> : null}>
          {rows.map((a) => {
            const as = s.assessments.find((x) => x.appId === a.id)
            return (
              <tr key={a.id} className="cursor-pointer hover:bg-canvas" onClick={() => setOpen(a.id)}>
                <Td><button className="font-mono text-xs font-semibold text-navy-2 underline-offset-2 hover:underline" onClick={(e) => { e.stopPropagation(); setOpen(a.id) }}>{a.ref}</button></Td>
                <Td className="font-medium">{customerName(s.customers.find((c) => c.id === a.customerId))}</Td>
                <Td className="max-w-48 truncate text-muted">{a.asset.description}</Td>
                <Td className="tabular-nums">{fmtMoney(summarize(a.terms).financed)}</Td>
                <Td>{as ? <StatusBadge s={as.risk} /> : <span className="text-xs text-muted">Not assessed</span>}</Td>
                <Td><StatusBadge s={a.status} /></Td><Td className="text-muted">{fmtDate(a.submittedAt)}</Td>
                <Td>{USERS.find((u) => u.id === a.assignedTo)?.name ?? '—'}</Td>
                <Td><Badge t={a.priority === 'High' ? 'bad' : 'neutral'}>{a.priority}</Badge></Td>
              </tr>
            )
          })}
        </Table>
      </Card>
      {sel && <ApprovalDrawer id={sel.id} onClose={() => setOpen(null)} />}
    </div>
  )
}

function ApprovalDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const s = useStore()
  const user = currentUser(s)
  const app = s.apps.find((a) => a.id === id)!
  const c = s.customers.find((x) => x.id === app.customerId)!
  const as = s.assessments.find((x) => x.appId === id)
  const sum = summarize(app.terms)
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')
  const decisionable = app.status === 'Awaiting Approval'
  const isMaker = user.id === app.makerId
  const act = (a: 'Approved' | 'Rejected' | 'Returned for Correction' | 'Documents Requested') => {
    const r = actions.decide(id, a, reason)
    if (r.ok) { setErr(''); setReason(''); report(r, a === 'Approved' ? 'Approved — ready for contract generation' : a + ' — recorded in history') }
    else { setErr((r as { error: string }).error) }
  }
  return (
    <Drawer title={`${app.ref} · ${customerName(c)}`} sub={<div className="mt-1 flex flex-wrap items-center gap-2"><StatusBadge s={app.status} />{as && <StatusBadge s={as.risk} />}<span className="text-xs text-muted">Maker: {app.makerName}</span></div>} onClose={onClose}
      footer={decisionable ? (
        <div className="space-y-2">
          {can(user.role, 'decide') ? (
            <>
              {isMaker && <Notice t="bad" title="Maker-checker control">You prepared this application, so you cannot approve it. Switch to another approver.</Notice>}
              <label htmlFor="reason" className="block text-xs font-medium text-navy-2">Reason {as && as.recommendation !== 'Recommend approval' ? '(required — approving against the recommendation is recorded as an override)' : '(required to reject, return or request documents)'}</label>
              <textarea id="reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-md border border-line bg-white p-2 text-sm" />
              {err && <p role="alert" className="text-xs font-medium text-bad">{err}</p>}
              <div className="flex flex-wrap gap-2">
                <Btn variant="ok" guide="approve" onClick={() => act('Approved')}>Approve</Btn>
                <Btn variant="danger" onClick={() => act('Rejected')}>Reject</Btn>
                <Btn onClick={() => act('Returned for Correction')}>Return for Correction</Btn>
                <Btn onClick={() => act('Documents Requested')}>Request Additional Documents</Btn>
              </div>
            </>
          ) : <Notice t="warn" title="Decision actions hidden for your role">Only the Approving Manager or an Administrator can decide. Switch role in the top bar (demo).</Notice>}
        </div>
      ) : app.status === 'Approved' ? <Btn variant="primary" onClick={() => { onClose(); actions.go('contracts') }}>Go to Contract Generation</Btn> : <p className="text-xs text-muted">No decision is pending at stage “{app.status}”.</p>}>
      <div className="space-y-5">
        {as && <Notice t={as.risk === 'Low' ? 'ok' : as.risk === 'Medium' ? 'warn' : 'bad'} title={`AI recommendation: ${as.recommendation} (risk ${as.score}/100)`}>Suggested route: {routeFor(app, as)}. The recommendation supports — it never replaces — the approver's decision.</Notice>}
        <Section t="Customer details"><CustomerSummary c={c} /></Section>
        <Section t="Credit analysis">
          {as ? <KV cols={3} items={[['Risk score', `${as.score}/100 (${as.risk})`], ['Debt service ratio', (as.dsr * 100).toFixed(0) + '%'], ['Affordability', as.affordability], ['Doc. completeness', as.docCompleteness + '%'], ['Stability', as.stability], ['Assessed', fmtDateTime(as.runAt)]]} /> : <p className="text-sm text-muted">No assessment has been run.</p>}
        </Section>
        {as && <Section t="Risk explanations"><ul className="space-y-1.5 text-[13px]">{as.factors.map((f) => <li key={f.name} className="flex gap-2"><b className={cx('w-9 shrink-0 tabular-nums', f.points > 0 ? 'text-bad' : f.points < 0 ? 'text-ok' : 'text-muted')}>{f.points > 0 ? '+' : ''}{f.points}</b><span><b>{f.name}.</b> <span className="text-muted">{f.detail}</span></span></li>)}</ul>{as.override && <p className="mt-2 text-xs text-warn">Override by {as.override.by}: {as.override.reason}</p>}</Section>}
        <Section t="Supporting documents">
          <ul className="divide-y divide-line text-[13px]">{c.documents.filter((d) => d.required || d.status !== 'Missing').map((d) => <li key={d.id} className="flex items-center justify-between py-1.5"><span>{d.type}<span className="ml-2 font-mono text-xs text-muted">{d.fileName}</span></span><StatusBadge s={d.status} /></li>)}</ul>
        </Section>
        <Section t="Repayment summary">
          <KV cols={3} items={[['Asset', app.asset.description], ['Amount financed', fmtMoney(sum.financed)], ['Installment', fmtMoney(sum.installment) + ' ' + app.terms.frequency.toLowerCase()], ['Term', app.terms.termMonths + ' months @ ' + app.terms.ratePct + '%'], ['Total financing cost', fmtMoney(sum.cost)], ['Deposit', fmtMoney(app.terms.deposit)]]} />
          <div className="mt-3"><ScheduleTable rows={sum.schedule} limit={4} /></div>
        </Section>
        <Section t="Maker's notes"><p className="text-sm text-ink">{app.makerNotes || 'No notes.'}</p></Section>
        <Section t="History of decisions">
          {app.decisions.length === 0 ? <p className="text-sm text-muted">No decisions yet.</p> : (
            <ol className="space-y-2.5 border-l-2 border-line pl-4">{app.decisions.map((d) => <li key={d.id} className="text-[13px]"><div className="font-medium text-ink">{d.action} <span className="font-normal text-muted">· {d.by} ({d.role})</span></div><div className="text-xs text-muted">{fmtDateTime(d.at)}</div><div className="text-muted">{d.reason}</div></li>)}</ol>
          )}
        </Section>
        <Section t="Activity history">
          <ul className="space-y-1 text-xs text-muted">{s.audit.filter((e) => e.ref === app.ref).slice(0, 8).map((e) => <li key={e.id}><span className="tabular-nums">{fmtDateTime(e.at)}</span> · {e.action} · {e.by}</li>)}</ul>
        </Section>
      </div>
    </Drawer>
  )
}
const Section = ({ t, children }: { t: string; children: React.ReactNode }) => <section><h3 className="mb-2 border-b border-line pb-1 text-sm font-semibold text-navy">{t}</h3>{children}</section>
