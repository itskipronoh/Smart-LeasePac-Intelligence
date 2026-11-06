import React, { useRef, useState } from 'react'
import { FileText, Upload, ScanSearch, ShieldCheck, Paperclip } from 'lucide-react'
import type { Customer, CustomerDocument } from './types'
import { customerName, ensureDocSlots, fmtDate, simulateExtraction, type Extracted } from './engine'
import { Badge, Btn, Modal, Notice, Simulated, StatusBadge, toast, inputCls } from './ui'

export function Documents({ customer, onChange }: { customer: Customer; onChange: (c: Customer) => void }) {
  const docs = ensureDocSlots(customer.type, customer.documents)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [extract, setExtract] = useState<Extracted[] | null>(null)
  const [vals, setVals] = useState<Record<string, string>>({})
  const fileRef = useRef<HTMLInputElement>(null)
  const target = useRef<string>('')
  const missing = docs.filter((d) => d.required && d.status === 'Missing')
  const uploaded = docs.filter((d) => d.status !== 'Missing')

  const patch = (next: CustomerDocument[]) => onChange({ ...customer, documents: next })
  const upload = (d: CustomerDocument, fileName: string) => {
    setBusyId(d.id)
    setTimeout(() => {
      patch(docs.map((x) => (x.id === d.id ? { ...x, fileName, status: 'Uploaded', uploadedAt: new Date().toISOString() } : x)))
      setBusyId(null)
      toast(`${d.type} uploaded`)
    }, 600)
  }
  const sample = (d: CustomerDocument) => upload(d, `${(customerName(customer) || 'customer').toLowerCase().replace(/[^a-z]+/g, '_')}_${d.type.toLowerCase().replace(/[^a-z]+/g, '_')}.pdf`)
  const sampleAll = () => {
    setBusyId('all')
    setTimeout(() => {
      const slug = (customerName(customer) || 'customer').toLowerCase().replace(/[^a-z]+/g, '_')
      patch(docs.map((x) => (x.required && x.status === 'Missing' ? { ...x, fileName: `${slug}_${x.type.toLowerCase().replace(/[^a-z]+/g, '_')}.pdf`, status: 'Uploaded', uploadedAt: new Date().toISOString() } : x)))
      setBusyId(null); toast('Sample documents attached')
    }, 700)
  }
  const verify = () => {
    if (!uploaded.length) { toast('Upload at least one document first.', 'bad'); return }
    setVerifying(true)
    setTimeout(() => {
      patch(docs.map((d) => (d.status === 'Uploaded' ? { ...d, status: 'Verified' } : d)))
      setVerifying(false); toast('Simulated AI verification complete — documents readable and consistent')
    }, 1100)
  }
  const openExtract = () => {
    if (!uploaded.length) { toast('Upload documents before extracting details.', 'bad'); return }
    const ex = simulateExtraction({ ...customer, documents: docs })
    setVals(Object.fromEntries(ex.map((e) => [e.field, e.value])))
    setExtract(ex)
  }
  const accept = () => {
    if (!extract) return
    const next: Customer = { ...customer, documents: docs.map((d) => (d.status === 'Uploaded' ? { ...d, status: 'Verified' as const } : d)) }
    extract.forEach((e) => {
      const v = vals[e.field] ?? e.value
      ;(next as unknown as Record<string, unknown>)[e.field] = typeof customer[e.field] === 'number' ? Number(v) || 0 : v
    })
    onChange(next); setExtract(null); toast('Verified details applied to the customer record')
  }

  return (
    <div className="space-y-3">
      <input ref={fileRef} type="file" className="sr-only" aria-label="Choose a file to upload" onChange={(e) => {
        const f = e.target.files?.[0]; const d = docs.find((x) => x.id === target.current)
        if (f && d) upload(d, f.name); e.target.value = ''
      }} />
      {missing.length > 0
        ? <Notice t="warn" title={`${missing.length} mandatory document${missing.length > 1 ? 's' : ''} missing`}>{missing.map((d) => d.type).join(' · ')}. Missing documents reduce readiness in the credit assessment.</Notice>
        : <Notice t="ok" title="All mandatory documents are on file" />}
      <div className="flex flex-wrap gap-2">
        <Btn size="sm" onClick={sampleAll} busy={busyId === 'all'}><Paperclip className="size-3.5" />Attach all sample documents</Btn>
        <Btn size="sm" onClick={verify} busy={verifying}><ShieldCheck className="size-3.5" />Run AI Verification</Btn>
        <Btn size="sm" variant="primary" onClick={openExtract}><ScanSearch className="size-3.5" />AI Extract Details</Btn>
        <Simulated>Simulated AI — no real OCR connected</Simulated>
      </div>
      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full min-w-[620px] text-left text-[13px]">
          <thead><tr className="border-b border-line bg-canvas text-xs text-muted"><th className="px-3 py-2 font-medium">Document</th><th className="px-3 py-2 font-medium">File</th><th className="px-3 py-2 font-medium">Uploaded</th><th className="px-3 py-2 font-medium">Status</th><th className="px-3 py-2"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody className="divide-y divide-line">
            {docs.map((d) => (
              <tr key={d.id}>
                <td className="px-3 py-2"><span className="flex items-center gap-2 font-medium"><FileText className="size-4 text-muted" />{d.type}{!d.required && <Badge>Optional</Badge>}</span></td>
                <td className="px-3 py-2 font-mono text-xs text-muted">{d.fileName ?? '—'}</td>
                <td className="px-3 py-2 text-muted">{fmtDate(d.uploadedAt)}</td>
                <td className="px-3 py-2"><StatusBadge s={d.status} /></td>
                <td className="px-3 py-2 text-right">
                  <span className="inline-flex gap-1.5">
                    <Btn size="sm" busy={busyId === d.id} onClick={() => { target.current = d.id; fileRef.current?.click() }}><Upload className="size-3.5" />{d.status === 'Missing' ? 'Upload' : 'Replace'}</Btn>
                    {d.status === 'Missing' && <Btn size="sm" variant="ghost" onClick={() => sample(d)} disabled={busyId === d.id}>Use sample</Btn>}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {extract && (
        <Modal title="AI Extract Details — review before accepting" onClose={() => setExtract(null)}
          footer={<><Btn onClick={() => setExtract(null)}>Discard</Btn><Btn variant="primary" onClick={accept}>Accept verified details</Btn></>}>
          <div className="space-y-3">
            <Notice t="info" title="Simulated AI Extraction">Deterministic sample output for the prototype. Existing values are kept; blanks are filled from the documents. Correct any value before accepting — nothing is saved until you do.</Notice>
            {extract.length === 0 && <p className="text-sm text-muted">No extractable fields for the uploaded documents.</p>}
            <div className="space-y-2.5">
              {extract.map((e) => (
                <div key={e.field} className="grid items-center gap-2 sm:grid-cols-[1fr_1.2fr_auto]">
                  <div><label htmlFor={'ex-' + e.field} className="text-xs font-medium text-navy-2">{e.label}</label><div className="text-[11px] text-muted">from {e.docType}</div></div>
                  <input id={'ex-' + e.field} value={vals[e.field] ?? ''} onChange={(ev) => setVals({ ...vals, [e.field]: ev.target.value })} className={inputCls()} />
                  {e.existing ? (vals[e.field] === e.existing ? <Badge t="ok">Matches record</Badge> : <Badge t="warn">Differs from record</Badge>) : <Badge t="teal">New — fills blank</Badge>}
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
