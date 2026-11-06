import React from 'react'
import { Plus, ArrowRight, AlertTriangle, ListChecks, GitCompare } from 'lucide-react'
import { actions, useStore } from '../store'
import { customerName, dashboardMetrics, fmtDateTime, fmtMoney, fmtNum } from '../engine'
import { TREND } from '../seed'
import { Badge, BarChart, Btn, Card, Donut, DemoTag, PageHeader, StatusBadge, TrendChart, cx } from '../ui'

export function Dashboard() {
  const s = useStore()
  const m = dashboardMetrics(s.apps, s.leases, s.assessments)
  const name = (id: string) => customerName(s.customers.find((c) => c.id === id))
  const trend = [...TREND, { m: 'Jul', apps: m.total, approved: m.approved }]

  const tasks = s.apps.filter((a) => !['Active', 'Rejected'].includes(a.status)).map((a) => {
    const map: Record<string, [string, string]> = {
      'Draft': ['Complete assessment and submit', 'new-lease'], 'Credit Review': ['Review credit assessment', 'assessment'], 'Verification Pending': ['Collect missing documents', 'new-lease'],
      'Awaiting Approval': ['Approve or decline', 'workbench'], 'Approved': ['Generate lease agreement', 'contracts'], 'Contract Pending': ['Review and sign agreement', 'contracts'],
      'Ready for Activation': ['Activate lease', 'leases'], 'Returned for Correction': ['Correct and resubmit', 'new-lease'], 'Submitted': ['Verify submission', 'workbench'],
    }
    return { a, label: map[a.status]?.[0] ?? 'Review', route: map[a.status]?.[1] ?? 'applications' }
  })
  const alerts = s.apps.filter((a) => a.status === 'Returned for Correction' || a.status === 'Verification Pending' || (a.priority === 'High' && !['Active', 'Rejected'].includes(a.status)))

  const kpis: [string, number, string][] = [
    ['Awaiting verification', m.verification, 'applications'], ['Awaiting credit assessment', m.credit, 'applications'], ['Pending approvals', m.approvals, 'workbench'],
    ['Approved applications', m.approved, 'applications'], ['Active leases', m.active, 'leases'], ['Requiring attention', m.attention, 'applications'],
  ]

  return (
    <div>
      <PageHeader
        title="Smart Leasing Command Center"
        sub="One application. One intelligent workflow. Faster leasing decisions."
        tag={<DemoTag />}
        actions={<>
          <Btn onClick={() => actions.go('before-after')}><GitCompare className="size-4" />Why Smart LeasePac?</Btn>
          <Btn variant="primary" guide="start" onClick={() => { actions.setLeaseDraft(null); actions.go('new-lease') }}><Plus className="size-4" />Start New Lease Application</Btn>
        </>}
      />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_2fr]">
        <div className="flex flex-col justify-between rounded-lg bg-navy p-5 text-white">
          <div>
            <div className="text-xs text-[#a9c3dc]">Illustrative lease portfolio (outstanding)</div>
            <div className="mt-1 text-3xl font-semibold tabular-nums">{fmtMoney(m.portfolio)}</div>
            <div className="mt-1 text-xs text-[#a9c3dc]">{m.active} active leases · {fmtMoney(m.financedTotal)} originally financed</div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/15 pt-4">
            <div><div className="text-2xl font-semibold tabular-nums">{m.total}</div><div className="text-xs text-[#a9c3dc]">Total lease applications</div></div>
            <div><div className="text-2xl font-semibold">4.2 days</div><div className="text-xs text-[#a9c3dc]">Avg. processing time <Badge t="warn">illustrative</Badge></div></div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
          {kpis.map(([k, v, r]) => (
            <button key={k} onClick={() => actions.go(r)} className="group flex flex-col justify-between gap-1 bg-white p-4 text-left transition-colors duration-150 hover:bg-teal-soft">
              <span className={cx('text-2xl font-semibold tabular-nums', k === 'Requiring attention' && v > 0 ? 'text-bad' : 'text-navy')}>{v}</span>
              <span className="text-xs text-muted">{k}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Applications &amp; approvals by month" action={<DemoTag />} className="lg:col-span-2"><TrendChart data={trend} /></Card>
        <Card title="Risk distribution"><Donut parts={[
          { label: 'Low risk', value: m.risks.Low, color: '#1b7f47' }, { label: 'Medium risk', value: m.risks.Medium, color: '#d9a21b' },
          { label: 'High risk', value: m.risks.High, color: '#b3261e' }, { label: 'Not yet assessed', value: m.risks.Unassessed, color: '#b6c3d1' },
        ]} /></Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Application pipeline"><BarChart data={m.pipeline} /></Card>
        <Card title={<span className="flex items-center gap-1.5"><AlertTriangle className="size-4 text-bad" />Priority alerts</span>} pad={false}>
          {alerts.length === 0 ? <p className="p-4 text-sm text-muted">No applications need attention.</p> : (
            <ul className="divide-y divide-line">
              {alerts.map((a) => (
                <li key={a.id}><button onClick={() => actions.go('applications')} className="flex w-full items-start justify-between gap-2 px-4 py-2.5 text-left hover:bg-canvas">
                  <span className="min-w-0 text-[13px]"><b className="block truncate text-ink">{name(a.customerId)}</b><span className="text-muted">{a.ref} · {a.status === 'Returned for Correction' ? 'Returned for correction' : a.status === 'Verification Pending' ? 'Documents outstanding' : 'High priority'}</span></span>
                  <StatusBadge s={a.status} />
                </button></li>
              ))}
            </ul>
          )}
        </Card>
        <Card title={<span className="flex items-center gap-1.5"><ListChecks className="size-4 text-teal" />Task queue</span>} pad={false}>
          <ul className="divide-y divide-line">
            {tasks.slice(0, 6).map(({ a, label, route }) => (
              <li key={a.id}><button onClick={() => (route === 'new-lease' ? (actions.setLeaseDraft({ appId: a.id }), actions.go(route)) : actions.go(route))} className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-canvas">
                <span className="min-w-0 text-[13px]"><b className="block truncate text-ink">{label}</b><span className="text-muted">{name(a.customerId)} · {a.ref}</span></span>
                <ArrowRight className="size-4 shrink-0 text-muted" />
              </button></li>
            ))}
            {tasks.length === 0 && <li className="p-4 text-sm text-muted">Queue is clear.</li>}
          </ul>
        </Card>
      </div>

      <Card title="Recent activity" className="mt-4" pad={false} action={<span className="text-xs text-muted">Audit trail · {fmtNum(s.audit.length)} events</span>}>
        <ul className="divide-y divide-line">
          {s.audit.slice(0, 7).map((e) => (
            <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 px-4 py-2 text-[13px]">
              <span className="w-28 shrink-0 text-xs tabular-nums text-muted">{fmtDateTime(e.at)}</span>
              <span className="font-medium text-ink">{e.action}</span><span className="font-mono text-xs text-muted">{e.ref}</span>
              <span className="min-w-0 flex-1 truncate text-muted">{e.detail}</span><span className="text-xs text-muted">{e.by}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
