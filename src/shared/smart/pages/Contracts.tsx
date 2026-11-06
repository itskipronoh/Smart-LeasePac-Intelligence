import React, { useEffect, useState } from 'react'
import { Download, FileCheck2 } from 'lucide-react'
import { actions, currentUser, useStore } from '../store'
import { customerName, fmtDate, fmtDateTime, fmtMoney, ROLE_LABEL } from '../engine'
import { Btn, Card, Empty, Modal, Notice, PageHeader, StatusBadge, KV, inputCls, report, useBusy, Simulated, toast } from '../ui'
import { LESSOR, agreementClauses, downloadAgreementPdf } from '../pdf'
import { ScheduleTable } from '../Schedule'

const ELIGIBLE = ['Approved', 'Contract Pending', 'Ready for Activation', 'Active']

export function Contracts() {
  const s = useStore()
  const user = currentUser(s)
  const list = s.apps.filter((a) => ELIGIBLE.includes(a.status))
  const [id, setId] = useState(list[0]?.id ?? '')
  const [preview, setPreview] = useState(true)
  const [ret, setRet] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, run] = useBusy(900)
  useEffect(() => { if (!list.find((a) => a.id === id) && list[0]) setId(list[0].id) }, [list.length])
  const app = s.apps.find((a) => a.id === id)
  const c = s.customers.find((x) => x.id === app?.customerId)
  const ag = s.agreements.find((g) => g.appId === id)

  if (!app || !c) return (
    <div><PageHeader title="Contract Generation" sub="Draft agreements are prepared from approved application data." />
      <Card><Empty title="No approved applications yet" action={<Btn variant="primary" onClick={() => actions.go('workbench')}>Open Approval Workbench</Btn>}>Once an Approving Manager approves an application, “Generate Lease Agreement” becomes available here.</Empty></Card></div>
  )
  const { s: sum, parties, asset, financial } = agreementClauses(app, c)
  const step = !ag ? 0 : ag.status === 'Draft' ? 1 : ag.status === 'Reviewed' ? 2 : 3

  return (
    <div>
      <PageHeader title="Contract Generation" sub="Populated from the approved application. Demonstration agreement only." tag={ag ? <StatusBadge s={ag.status} /> : undefined} />
      <div className="mb-4 max-w-xl">
        <label htmlFor="ctr" className="mb-1 block text-xs font-medium text-navy-2">Approved application</label>
        <select id="ctr" value={id} onChange={(e) => setId(e.target.value)} className={inputCls()}>{list.map((a) => <option key={a.id} value={a.id}>{a.ref} — {customerName(s.customers.find((x) => x.id === a.customerId))} ({a.status})</option>)}</select>
      </div>
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <Card title="Agreement workflow">
            <ol className="space-y-2.5 text-sm">
              {['Generate draft', 'Review contract', 'Record signature (demo)', 'Ready for activation'].map((t, i) => (
                <li key={t} className="flex items-center gap-2.5"><span className={'grid size-5 place-items-center rounded-full text-[11px] font-semibold ' + (i < step ? 'bg-teal text-white' : i === step ? 'border-2 border-teal text-teal' : 'bg-canvas text-muted')}>{i < step ? '✓' : i + 1}</span><span className={i <= step ? 'text-ink' : 'text-muted'}>{t}</span></li>
              ))}
            </ol>
            <div className="mt-4 flex flex-col gap-2">
              {!ag ? <Btn variant="primary" guide="contract" busy={busy} onClick={() => run(() => report(actions.generateAgreement(id), 'Draft agreement generated from approved data'))}><FileCheck2 className="size-4" />Generate Lease Agreement</Btn>
                : <Btn busy={busy} onClick={() => run(() => report(actions.generateAgreement(id), 'New draft version generated'))} disabled={app.status === 'Active'}>Generate Draft (new version)</Btn>}
              <Btn disabled={!ag} onClick={() => setPreview(true)}>Preview Agreement</Btn>
              <Btn variant="primary" guide="pdf" disabled={!ag} onClick={async () => { await downloadAgreementPdf(app, c, ag!); actions.markPdf(); toast('PDF downloaded with ' + customerName(c) + "'s details") }}><Download className="size-4" />Download PDF</Btn>
              <Btn disabled={!ag || ag.status !== 'Draft' || app.status === 'Active'} onClick={() => report(actions.agreementAction(id, 'review'), 'Contract marked reviewed')}>Mark Contract Reviewed</Btn>
              <Btn variant="ok" disabled={!ag || ag.status !== 'Reviewed'} onClick={() => report(actions.agreementAction(id, 'sign'), 'Recorded as signed (demo) — ready for activation')}>Mark Contract Signed (Demo)</Btn>
              <Btn disabled={!ag || ag.status === 'Signed (Demo)'} onClick={() => setRet(true)}>Return for Correction</Btn>
              {app.status === 'Ready for Activation' && <Btn variant="primary" onClick={() => actions.go('leases')}>Continue to activation</Btn>}
            </div>
            <p className="mt-3 text-[11px] text-muted">Acting as {ROLE_LABEL[user.role]}. {user.role === 'checker' && 'Contract actions are for Operations, Leasing Officer or Admin.'} <Simulated>No e-signature service</Simulated></p>
          </Card>
        </div>
        <Card pad={false} title="Agreement preview">
          {!ag || !preview ? <Empty title="No draft yet">Choose “Generate Lease Agreement” to prepare a draft from the approved application.</Empty> : (
            <div className="mx-auto max-w-3xl space-y-5 p-6 text-[13px] leading-6">
              <div className="rounded border border-warn/40 bg-warn-soft px-3 py-1.5 text-xs font-semibold text-warn">DEMONSTRATION AGREEMENT — not legally reviewed, no legal effect</div>
              <div><h2 className="text-lg font-semibold text-navy">LEASE AGREEMENT</h2><div className="font-mono text-xs text-muted">{ag.ref} · Version {ag.version} · {ag.status} · Generated {fmtDateTime(ag.generatedAt)} by {ag.generatedBy}</div></div>
              <Part t="1. Parties" items={[...parties, ['Lessor registration', LESSOR.reg]]} />
              <Part t="2. Leased asset" items={asset} />
              <Part t="3. Financial terms" items={financial} />
              <div><h3 className="mb-1 font-semibold text-navy">4. Repayment schedule</h3><ScheduleTable rows={sum.schedule} limit={6} /></div>
              <div><h3 className="mb-1 font-semibold text-navy">5. Applicable terms</h3><p className="text-muted">Installments fall due on the dates scheduled. Title remains with the Lessor until all sums are paid; the Lessee insures and maintains the asset. Early settlement and default terms follow the lease product rules (to be aligned with LeasePac).</p></div>
              <div><h3 className="mb-3 font-semibold text-navy">6. Signatures</h3>
                <div className="grid gap-6 sm:grid-cols-2">{[['Lessor', LESSOR.name], ['Lessee', customerName(c)]].map(([r, n]) => <div key={r}><div className="h-10 border-b border-ink" />
                  <div className="mt-1 text-xs text-muted">{r}: {n}</div>{ag.status === 'Signed (Demo)' && <div className="text-xs font-medium text-ok">Marked signed (demo) {fmtDate(ag.signedAt)}</div>}</div>)}</div></div>
              <p className="text-xs text-muted">Effective {fmtDate(app.terms.startDate)} · Total scheduled installments {fmtMoney(sum.total)}.</p>
            </div>
          )}
        </Card>
      </div>
      {ret && (
        <Modal title="Return for correction" onClose={() => setRet(false)} footer={<><Btn onClick={() => setRet(false)}>Cancel</Btn><Btn variant="primary" onClick={() => { const r = actions.agreementAction(id, 'return', reason); if (report(r, 'Returned to the maker for correction')) { setRet(false); setReason('') } }}>Return</Btn></>}>
          <textarea aria-label="Reason" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What needs correcting? (required)" className="w-full rounded-md border border-line p-2.5 text-sm" />
        </Modal>
      )}
    </div>
  )
}
const Part = ({ t, items }: { t: string; items: string[][] }) => (
  <div><h3 className="mb-1 font-semibold text-navy">{t}</h3><KV items={items.map(([k, v]) => [k, v] as [string, string])} /></div>
)
