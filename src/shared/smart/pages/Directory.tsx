import React, { useState } from 'react'
import { Search, Pencil, Plus } from 'lucide-react'
import { actions, useStore } from '../store'
import { customerName, fmtMoney, missingDocs } from '../engine'
import type { Customer } from '../types'
import { Btn, Card, Drawer, Empty, Notice, PageHeader, StatusBadge, Table, Td, KV, report, inputCls, toast } from '../ui'
import { Documents } from '../Documents'

export function Directory({ mode }: { mode: 'details' | 'edit' }) {
  const s = useStore()
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const list = s.customers.filter((c) =>
    (!q || [customerName(c), c.customerNo, c.idNumber, c.pin, c.regNo].some((v) => v.toLowerCase().includes(q.toLowerCase()))) && (!type || c.type === type) && (!status || c.status === status))
  const sel = s.customers.find((c) => c.id === open)
  const edit = (c: Customer) => { actions.startOnboarding(c); actions.go('onboarding') }

  return (
    <div>
      <PageHeader title={mode === 'edit' ? 'Re-Edit Directory Details' : 'Directory — Customer Details'}
        sub={mode === 'edit' ? 'Open an existing record in the guided editor. Changes are saved back to the same customer.' : 'Search the customer directory. Records captured once are reused across leasing applications.'}
        actions={<Btn variant="primary" onClick={() => { actions.startOnboarding(); actions.go('onboarding') }}><Plus className="size-4" />Capture Customer</Btn>} />
      <Card pad={false}>
        <div className="flex flex-wrap gap-2 border-b border-line p-3">
          <div className="relative min-w-52 flex-1"><Search className="absolute left-2.5 top-2.5 size-4 text-muted" aria-hidden /><input aria-label="Search customers" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, ID, PIN, customer no." className={inputCls() + ' pl-8'} /></div>
          <select aria-label="Filter by type" value={type} onChange={(e) => setType(e.target.value)} className={inputCls() + ' !w-auto'}><option value="">All types</option>{['Individual', 'Joint Account', 'Group', 'Business / Corporate'].map((t) => <option key={t}>{t}</option>)}</select>
          <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls() + ' !w-auto'}><option value="">All statuses</option>{['Draft', 'Pending Verification', 'Verified'].map((t) => <option key={t}>{t}</option>)}</select>
        </div>
        <Table head={['Customer', 'Customer no.', 'Type', 'Identifier', 'Income / month', 'Documents', 'Status', '']}
          empty={list.length === 0 ? <Empty title="No customers match" action={<Btn onClick={() => { setQ(''); setType(''); setStatus('') }}>Clear filters</Btn>}>Try a different search, or capture a new customer.</Empty> : null}>
          {list.map((c) => (
            <tr key={c.id} className="hover:bg-canvas">
              <Td><button onClick={() => setOpen(c.id)} className="font-medium text-navy-2 underline-offset-2 hover:underline">{customerName(c)}</button></Td>
              <Td className="font-mono text-xs">{c.customerNo}</Td><Td>{c.type}</Td><Td className="font-mono text-xs">{c.type === 'Business / Corporate' ? c.regNo : c.idNumber}</Td>
              <Td className="tabular-nums">{fmtMoney(c.monthlyIncome)}</Td>
              <Td>{missingDocs(c).length ? <StatusBadge s="Missing" /> : <span className="text-ok">Complete</span>}{missingDocs(c).length > 0 && <span className="ml-1.5 text-xs text-muted">{missingDocs(c).length} missing</span>}</Td>
              <Td><StatusBadge s={c.status} /></Td>
              <Td className="text-right"><Btn size="sm" onClick={() => (mode === 'edit' ? edit(c) : setOpen(c.id))}>{mode === 'edit' ? <><Pencil className="size-3.5" />Edit</> : 'View'}</Btn></Td>
            </tr>
          ))}
        </Table>
      </Card>
      {sel && (
        <Drawer title={customerName(sel)} sub={<div className="mt-1 flex gap-2"><StatusBadge s={sel.status} /><span className="text-xs text-muted">{sel.customerNo} · {sel.type}</span></div>} onClose={() => setOpen(null)}
          footer={<div className="flex flex-wrap gap-2"><Btn onClick={() => edit(sel)}><Pencil className="size-3.5" />Re-edit details</Btn><Btn variant="primary" onClick={() => { actions.setLeaseDraft({ customerId: sel.id }); actions.go('new-lease') }}>Start lease application</Btn></div>}>
          <CustomerSummary c={sel} />
          <h3 className="mb-2 mt-5 text-sm font-semibold text-navy">Documents</h3>
          <Documents customer={sel} onChange={(n) => actions.updateCustomer(n)} />
        </Drawer>
      )}
    </div>
  )
}

export function CustomerSummary({ c }: { c: Customer }) {
  const biz = c.type === 'Business / Corporate'
  return (
    <KV items={[
      biz ? ['Registration no.', c.regNo] : [c.idType, c.idNumber], ['KRA PIN', c.pin || 'Not provided'],
      biz ? ['Industry', `${c.industry}${c.sector ? ' · ' + c.sector : ''}`] : ['Occupation', `${c.occupation} · ${c.employer}`],
      biz ? ['Representatives', c.representatives] : ['Employment', `${c.employmentType}, ${c.yearsInRole} yrs`],
      ['Monthly income', fmtMoney(c.monthlyIncome)], ['Monthly obligations', fmtMoney(c.monthlyDebt)], ['Email', c.email], ['Mobile', c.mobile],
      ['Address', `${c.physicalAddress}, ${c.city}, ${c.county}`], ['Postal', c.postalAddress],
    ]} />
  )
}

export function ApproveCustomer({ details }: { details?: boolean }) {
  const s = useStore()
  const pending = s.customers.filter((c) => c.status === 'Pending Verification')
  const [open, setOpen] = useState<string | null>(null)
  const sel = s.customers.find((c) => c.id === open)
  return (
    <div>
      <PageHeader title={details ? 'Approve Customer Details' : 'Approve Customer'} sub="Checker step for new and amended directory records. The user who captured a customer cannot approve it." />
      <Card pad={false}>
        <Table head={['Customer', 'Customer no.', 'Type', 'Captured by', 'Documents', 'Status', '']}
          empty={pending.length === 0 ? <Empty title="Nothing waiting for approval">Customers submitted from Smart Onboarding appear here.</Empty> : null}>
          {pending.map((c) => (
            <tr key={c.id}>
              <Td className="font-medium">{customerName(c)}</Td><Td className="font-mono text-xs">{c.customerNo}</Td><Td>{c.type}</Td><Td>{c.createdBy === 'u-maker' ? 'Faith Achieng' : c.createdBy}</Td>
              <Td>{missingDocs(c).length ? <span className="text-bad">{missingDocs(c).length} missing</span> : <span className="text-ok">Complete</span>}</Td><Td><StatusBadge s={c.status} /></Td>
              <Td className="text-right"><Btn size="sm" onClick={() => setOpen(c.id)}>Review</Btn></Td>
            </tr>
          ))}
        </Table>
      </Card>
      {sel && (
        <Drawer title={customerName(sel)} onClose={() => setOpen(null)}
          footer={<div className="flex gap-2"><Btn variant="ok" onClick={() => { if (report(actions.verifyCustomer(sel.id), 'Customer approved and added to the directory')) setOpen(null) }}>Approve customer</Btn><Btn onClick={() => toast('Use Re-Edit Directory Details to correct this record.', 'info')}>Return for correction</Btn></div>}>
          {missingDocs(sel).length > 0 && <div className="mb-4"><Notice t="warn" title="Missing mandatory documents">{missingDocs(sel).join(', ')}</Notice></div>}
          <CustomerSummary c={sel} />
        </Drawer>
      )}
    </div>
  )
}

export function ImageUploader() {
  const s = useStore()
  const [id, setId] = useState(s.customers[0]?.id ?? '')
  const c = s.customers.find((x) => x.id === id)
  return (
    <div>
      <PageHeader title="Image Uploader" sub="Attach and verify customer documents. Uploads here update the same record used by credit assessment and contracts." />
      <Card>
        <label htmlFor="cu" className="mb-1 block text-xs font-medium text-navy-2">Customer</label>
        <select id="cu" value={id} onChange={(e) => setId(e.target.value)} className={inputCls() + ' mb-4 max-w-md'}>{s.customers.map((x) => <option key={x.id} value={x.id}>{customerName(x)} — {x.customerNo}</option>)}</select>
        {c ? <Documents customer={c} onChange={(n) => actions.updateCustomer(n)} /> : <Empty title="No customers in the directory" />}
      </Card>
    </div>
  )
}
