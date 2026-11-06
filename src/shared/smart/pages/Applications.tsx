import React, { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { actions, useStore } from '../store'
import { customerName, fmtDate, fmtMoney, summarize, STATUSES } from '../engine'
import { Btn, Card, Empty, PageHeader, StatusBadge, Table, Td, inputCls } from '../ui'

export function Applications() {
  const s = useStore()
  const [q, setQ] = useState('')
  const [st, setSt] = useState('')
  const rows = s.apps.filter((a) => (!q || [a.ref, customerName(s.customers.find((c) => c.id === a.customerId)), a.asset.description].some((v) => v.toLowerCase().includes(q.toLowerCase()))) && (!st || a.status === st))
  const open = (id: string, status: string) => {
    if (['Draft', 'Returned for Correction', 'Verification Pending', 'Credit Review'].includes(status)) { actions.setLeaseDraft({ appId: id }); actions.go('new-lease') }
    else actions.go('workbench', id)
  }
  return (
    <div>
      <PageHeader title="Lease Applications" sub="Every application, from draft to active lease, in one list."
        actions={<Btn variant="primary" onClick={() => { actions.setLeaseDraft(null); actions.go('new-lease') }}><Plus className="size-4" />Start New Lease Application</Btn>} />
      <Card pad={false}>
        <div className="flex flex-wrap gap-2 border-b border-line p-3">
          <div className="relative min-w-52 flex-1"><Search className="absolute left-2.5 top-2.5 size-4 text-muted" aria-hidden /><input aria-label="Search applications" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reference, customer or asset" className={inputCls() + ' pl-8'} /></div>
          <select aria-label="Status" value={st} onChange={(e) => setSt(e.target.value)} className={inputCls() + ' !w-auto'}><option value="">All statuses</option>{STATUSES.map((x) => <option key={x}>{x}</option>)}</select>
        </div>
        <Table head={['Reference', 'Customer', 'Asset', 'Amount financed', 'Term', 'Status', 'Created', '']}
          empty={rows.length === 0 ? <Empty title="No applications found" action={<Btn onClick={() => { setQ(''); setSt('') }}>Clear filters</Btn>} /> : null}>
          {rows.map((a) => (
            <tr key={a.id} className="hover:bg-canvas">
              <Td className="font-mono text-xs font-semibold">{a.ref}</Td><Td className="font-medium">{customerName(s.customers.find((c) => c.id === a.customerId))}</Td>
              <Td className="max-w-52 truncate text-muted">{a.asset.description}</Td><Td className="tabular-nums">{fmtMoney(summarize(a.terms).financed)}</Td><Td>{a.terms.termMonths} mo</Td>
              <Td><StatusBadge s={a.status} /></Td><Td className="text-muted">{fmtDate(a.createdAt)}</Td>
              <Td className="text-right"><Btn size="sm" onClick={() => open(a.id, a.status)}>Open</Btn></Td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  )
}
