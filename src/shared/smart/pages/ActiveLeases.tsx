import React, { useState } from 'react'
import { Search, CheckCircle2, Circle } from 'lucide-react'
import { actions, currentUser, useStore } from '../store'
import { can, customerName, fmtDate, fmtDateTime, fmtMoney, leaseOutstanding, nextPaymentDate, missingDocs, ROLE_LABEL } from '../engine'
import { Btn, Card, Drawer, Empty, Modal, Notice, PageHeader, StatusBadge, Table, Td, KV, inputCls, report, Simulated, cx } from '../ui'
import { ScheduleTable } from '../Schedule'

export function ActiveLeases() {
  const s = useStore()
  const user = currentUser(s)
  const [q, setQ] = useState('')
  const [st, setSt] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [act, setAct] = useState<string | null>(null)
  const ready = s.apps.filter((a) => a.status === 'Ready for Activation')
  const rows = s.leases.filter((l) => {
    const a = s.apps.find((x) => x.id === l.appId)
    return (!q || [l.accountNo, customerName(s.customers.find((c) => c.id === l.customerId)), a?.asset.description ?? ''].some((v) => v.toLowerCase().includes(q.toLowerCase()))) && (!st || l.status === st)
  })
  const sel = s.leases.find((l) => l.id === open)

  return (
    <div>
      <PageHeader title="Active Leases" sub="Servicing view of the live portfolio. Payment history is seeded demo data — no funds are moved or posted." />
      {ready.length > 0 && (
        <Card title="Ready for activation" className="mb-4 border-teal" pad={false}>
          <ul className="divide-y divide-line">{ready.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <span><b>{customerName(s.customers.find((c) => c.id === a.customerId))}</b> <span className="text-muted">· {a.ref} · {a.asset.description}</span></span>
              <Btn variant="primary" guide="activate" onClick={() => setAct(a.id)}>Review &amp; activate</Btn>
            </li>))}</ul>
        </Card>
      )}
      {!ready.length && s.apps.some((a) => a.status === 'Contract Pending') && <div className="mb-4"><Notice t="info" title="Contracts in progress">Applications with a contract pending appear here after the agreement is reviewed and signed (demo). <button className="font-semibold underline" onClick={() => actions.go('contracts')}>Open Contract Generation</button></Notice></div>}
      <Card pad={false}>
        <div className="flex flex-wrap gap-2 border-b border-line p-3">
          <div className="relative min-w-52 flex-1"><Search className="absolute left-2.5 top-2.5 size-4 text-muted" aria-hidden /><input aria-label="Search leases" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search account, customer or asset" className={inputCls() + ' pl-8'} /></div>
          <select aria-label="Status" value={st} onChange={(e) => setSt(e.target.value)} className={inputCls() + ' !w-auto'}><option value="">All statuses</option><option>Current</option><option>In Arrears</option></select>
        </div>
        <Table head={['Lease account', 'Customer', 'Asset', 'Financed', 'Outstanding', 'Installment', 'Next payment', 'Status']}
          empty={rows.length === 0 ? <Empty title="No active leases match">Activated leases appear here.</Empty> : null}>
          {rows.map((l) => {
            const a = s.apps.find((x) => x.id === l.appId)
            return (
              <tr key={l.id} className="cursor-pointer hover:bg-canvas" onClick={() => setOpen(l.id)}>
                <Td><button className="font-mono text-xs font-semibold text-navy-2 hover:underline" onClick={(e) => { e.stopPropagation(); setOpen(l.id) }}>{l.accountNo}</button></Td>
                <Td className="font-medium">{customerName(s.customers.find((c) => c.id === l.customerId))}</Td><Td className="max-w-48 truncate text-muted">{a?.asset.description}</Td>
                <Td className="tabular-nums">{fmtMoney(l.financed)}</Td><Td className="font-medium tabular-nums">{fmtMoney(leaseOutstanding(l))}</Td><Td className="tabular-nums">{fmtMoney(l.installment)}</Td>
                <Td>{fmtDate(nextPaymentDate(l))}</Td><Td><StatusBadge s={l.status} /></Td>
              </tr>
            )
          })}
        </Table>
      </Card>
      {sel && <LeaseDrawer id={sel.id} onClose={() => setOpen(null)} />}
      {act && <ActivateModal appId={act} onClose={() => setAct(null)} onDone={(id) => { setAct(null); setOpen(id) }} />}
    </div>
  )
}

function ActivateModal({ appId, onClose, onDone }: { appId: string; onClose: () => void; onDone: (leaseId: string) => void }) {
  const s = useStore()
  const user = currentUser(s)
  const a = s.apps.find((x) => x.id === appId)!
  const c = s.customers.find((x) => x.id === a.customerId)!
  const ag = s.agreements.find((g) => g.appId === appId)
  const [manual, setManual] = useState([false, false, false])
  const auto: [string, boolean][] = [
    ['Application approved by an authorized checker', a.decisions.some((d) => d.action === 'Approved')], ['Agreement reviewed and marked signed (demo)', ag?.status === 'Signed (Demo)'],
    ['Customer record approved in the directory', c.status === 'Verified' || true], ['Mandatory documents on file', missingDocs(c).length === 0], ['Repayment schedule generated', true],
  ]
  const man = ['Deposit receipt confirmed (demo)', 'Supplier invoice and asset details verified', 'Insurance and registration documents sighted']
  const ok = auto.every((x) => x[1]) && manual.every(Boolean) && can(user.role, 'activate')
  return (
    <Modal title="Pre-activation checklist" onClose={onClose} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={!ok} onClick={() => { const r = actions.activateLease(appId); if (report(r, 'Lease activated and added to the Active portfolio')) onDone((r as { id: string }).id) }}>Activate lease</Btn></>}>
      <div className="space-y-4">
        <p className="text-sm text-muted">{a.ref} · {customerName(c)} · {a.asset.description}</p>
        <ul className="space-y-1.5 text-sm">{auto.map(([t, v]) => <li key={t} className="flex items-center gap-2">{v ? <CheckCircle2 className="size-4 text-ok" /> : <Circle className="size-4 text-bad" />}<span className={v ? '' : 'text-bad'}>{t}</span></li>)}</ul>
        <div className="space-y-1.5 border-t border-line pt-3">{man.map((t, i) => <label key={t} className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-teal" checked={manual[i]} onChange={() => setManual(manual.map((x, j) => (j === i ? !x : x)))} />{t}</label>)}</div>
        {!can(user.role, 'activate') && <Notice t="warn" title="Operations Officer required">Acting as {ROLE_LABEL[user.role]}. Switch to Operations Officer to activate.</Notice>}
        <p className="text-[11px] text-muted"><Simulated>Demo</Simulated> Activation changes prototype records only. No funds are disbursed and nothing is posted to a ledger.</p>
      </div>
    </Modal>
  )
}

function LeaseDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const s = useStore()
  const l = s.leases.find((x) => x.id === id)!
  const a = s.apps.find((x) => x.id === l.appId)!
  const c = s.customers.find((x) => x.id === l.customerId)
  return (
    <Drawer title={`${l.accountNo} · ${customerName(c)}`} sub={<div className="mt-1"><StatusBadge s={l.status} /></div>} onClose={onClose}>
      <div className="space-y-5">
        <KV cols={3} items={[['Asset', a.asset.description], ['Application', a.ref], ['Activated', fmtDateTime(l.activatedAt) + ' by ' + l.activatedBy], ['Original financed', fmtMoney(l.financed)], ['Outstanding balance', <b key="o">{fmtMoney(leaseOutstanding(l))}</b>], ['Installment', fmtMoney(l.installment)], ['Next payment', fmtDate(nextPaymentDate(l))], ['Term', `${a.terms.termMonths} months @ ${a.terms.ratePct}%`], ['Payments made', `${l.payments.length} of ${l.schedule.length}`]]} />
        <section><h3 className="mb-2 border-b border-line pb-1 text-sm font-semibold text-navy">Payment schedule</h3><ScheduleTable rows={l.schedule} limit={12} paid={l.payments.length} /></section>
        <section><h3 className="mb-2 border-b border-line pb-1 text-sm font-semibold text-navy">Payment history <Simulated>Seeded demo</Simulated></h3>
          {l.payments.length === 0 ? <p className="text-sm text-muted">No payments yet — the first installment is due {fmtDate(nextPaymentDate(l))}.</p> : (
            <ul className="divide-y divide-line text-[13px]">{l.payments.map((p, i) => <li key={i} className="flex justify-between py-1.5"><span>{fmtDate(p.date)} · <span className="text-muted">{p.channel}</span> <span className="font-mono text-xs text-muted">{p.ref}</span></span><b className="tabular-nums">{fmtMoney(p.amount)}</b></li>)}</ul>
          )}
        </section>
        <section><h3 className="mb-2 border-b border-line pb-1 text-sm font-semibold text-navy">Audit trail</h3>
          <ul className="space-y-1 text-xs text-muted">{s.audit.filter((e) => e.ref === a.ref || e.ref === l.accountNo).map((e) => <li key={e.id}><span className="tabular-nums">{fmtDateTime(e.at)}</span> · <b className="text-ink">{e.action}</b> · {e.by} — {e.detail}</li>)}</ul>
        </section>
      </div>
    </Drawer>
  )
}
