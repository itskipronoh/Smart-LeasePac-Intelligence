import React from 'react'
import { ArrowRight, X, Check } from 'lucide-react'
import { actions } from '../store'
import { Badge, Btn, Card, DemoTag, Notice, PageHeader, Table, Td } from '../ui'

const BEFORE = ['Capture Customer, Approve Customer, Image Uploader and Customer Details are separate screens', 'Customer details re-keyed for each new lease', 'Missing fields discovered late, at approval', 'Documents uploaded as images with no extraction or checks', 'Credit assessment and affordability worked out off-system', 'Approvals coordinated by hand between users', 'Agreement drafted manually from application data', 'Progress known only by asking staff']
const AFTER = [['Guided onboarding', 'Five steps, one flow, progress always visible'], ['Reusable customer information', 'Select from the directory; nothing retyped'], ['Immediate missing-data validation', 'Precise inline errors and missing-document alerts'], ['Assisted document processing', 'Simulated AI extraction, reviewed by the user'], ['Explainable risk assessment', 'Transparent rules, score and top factors'], ['Centralized approval queue', 'Role-aware workbench with maker-checker'], ['Automated contract preparation', 'Draft agreement populated from approved data'], ['End-to-end progress tracking', 'One status from draft to active lease']]
const TABLE: [string, string, string][] = [
  ['Data capture', 'Long single-page forms; re-entry per application', 'Guided steps; reuse directory records; inline validation'],
  ['Document handling', 'Separate image uploader, manual checking', 'Checklist with status, missing alerts, assisted extraction'],
  ['Credit assessment', 'Manual affordability working', 'Rule-based score with explanation; human override audited'],
  ['Approvals', 'Hand-offs between separate screens', 'Central queue, routing guidance, maker-checker enforced'],
  ['Agreement preparation', 'Manual drafting', 'Draft generated from approved application, PDF export'],
  ['Workflow visibility', 'Ask the officer or search modules', 'Dashboard, pipeline and status tracker'],
  ['User experience', 'Menu-driven, many separate screens', 'One intelligent workflow with next-action guidance'],
]
const IMPACT: [string, string][] = [
  ['Average application processing time', 'Elapsed time from capture to activation, per application'],
  ['Manual data-entry effort', 'Fields keyed per application vs. reused or extracted'],
  ['Document rework frequency', 'Share of applications returned for missing or incorrect documents'],
  ['Approval turnaround time', 'Submission to decision, by risk route'],
  ['Application completion rate', 'Started applications reaching submission'],
  ['Customer status inquiries', 'Calls and messages asking for progress'],
  ['Contract preparation time', 'Approval to a reviewed draft agreement'],
]

export function BeforeAfter() {
  return (
    <div>
      <PageHeader title="Why Smart LeasePac?" sub="An intelligent layer on today's LeasePac — same business identity, fewer separate steps."
        actions={<Btn variant="primary" onClick={() => { actions.toggleGuide(true); actions.setLeaseDraft(null); actions.go('new-lease') }}>Try Improved Workflow <ArrowRight className="size-4" /></Btn>} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={<span className="flex items-center gap-2">Before <Badge>Current LeasePac</Badge></span>}>
          <img src="https://cdn.magicpatterns.com/uploads/iKMtKZCBno39fN6ksquSx2/image.png" alt="Existing LeasePac Directory Information form" className="w-full rounded border border-line" />
          <p className="mt-2 text-xs text-muted">Screenshot of the existing Directory Information screen.</p>
          <h3 className="mb-1.5 mt-4 text-sm font-semibold text-navy">Traditional process <span className="font-normal text-muted">(our interpretation, not a measured study)</span></h3>
          <ul className="space-y-1.5 text-[13px]">{BEFORE.map((b) => <li key={b} className="flex gap-2"><X className="mt-0.5 size-4 shrink-0 text-bad" />{b}</li>)}</ul>
        </Card>
        <Card title={<span className="flex items-center gap-2">After <Badge t="teal">Smart Leasing</Badge></span>} className="border-teal">
          <ul className="space-y-3">{AFTER.map(([t, d]) => <li key={t} className="flex gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-ok" /><span className="text-sm"><b className="text-navy">{t}.</b> <span className="text-muted">{d}</span></span></li>)}</ul>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Btn onClick={() => actions.go('portal')}>Customer view</Btn><Btn onClick={() => actions.go('workbench')}>Staff view</Btn>
          </div>
        </Card>
      </div>

      <Card title="Side-by-side comparison" className="mt-4" pad={false}>
        <Table head={['Area', 'Before — current LeasePac', 'After — Smart LeasePac']}>
          {TABLE.map(([a, b, c]) => <tr key={a}><Td className="font-medium text-navy">{a}</Td><Td className="text-muted">{b}</Td><Td>{c}</Td></tr>)}
        </Table>
      </Card>

      <Card title="Business impact — proposed measurement targets" className="mt-4" action={<DemoTag>Illustrative targets</DemoTag>} pad={false}>
        <div className="p-4 pb-0"><Notice t="warn" title="Not measured results">No percentages are claimed. These are the metrics we propose to baseline and track in a pilot; targets would be set after the baseline.</Notice></div>
        <Table head={['Metric', 'How it would be measured', 'Baseline', 'Target']}>
          {IMPACT.map(([m, h]) => <tr key={m}><Td className="font-medium text-navy">{m}</Td><Td className="text-muted">{h}</Td><Td><Badge>To be measured</Badge></Td><Td><Badge t="teal">Reduce — set after baseline</Badge></Td></tr>)}
        </Table>
      </Card>

      <Card title="Human oversight &amp; integration readiness" className="mt-4">
        <div className="grid gap-4 text-[13px] sm:grid-cols-2">
          <p><b className="text-navy">Human control.</b> Recommendations never authorize a lease. Approvers must give reasons to reject, return or override, and the maker cannot approve their own work. Every action is audited.</p>
          <p><b className="text-navy">Replaceable adapters.</b> Identity checks, OCR, credit bureau, messaging, e-signature and LeasePac APIs are simulated behind service boundaries and can be swapped for approved services.</p>
        </div>
      </Card>
    </div>
  )
}
