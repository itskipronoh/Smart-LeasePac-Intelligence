import React, { useEffect, useState } from 'react'
import {
  LayoutDashboard, FolderTree, ChevronDown, ChevronRight, Menu, Sparkles, RotateCcw, Play, X, ArrowRight, Check, Users2,
} from 'lucide-react'
import { actions, currentUser, useStore } from './store'
import { USERS } from './seed'
import { ROLE_LABEL } from './engine'
import { Badge, Btn, DemoTag, Toaster, cx, toast } from './ui'
import { Dashboard } from './pages/Dashboard'
import { Onboarding } from './pages/Onboarding'
import { Directory, ApproveCustomer, ImageUploader } from './pages/Directory'
import { Applications } from './pages/Applications'
import { LeaseWizard } from './pages/LeaseWizard'
import { Assessment } from './pages/Assessment'
import { Workbench } from './pages/Workbench'
import { Contracts } from './pages/Contracts'
import { ActiveLeases } from './pages/ActiveLeases'
import { BeforeAfter } from './pages/BeforeAfter'
import { Portal } from './pages/Portal'

type Item = { label: string; route: string; id?: string }
const DIRECTORY: Item[] = [
  { label: 'Capture Customer', route: 'capture' }, { label: 'Approve Customer', route: 'approve-customer' }, { label: 'Image Uploader', route: 'uploader' },
  { label: 'Customer Details', route: 'directory' }, { label: 'Approve Customer Details', route: 'approve-details' }, { label: 'Re-Edit Directory Details', route: 're-edit' },
]
const SMART: Item[] = [
  { label: 'Smart Onboarding', route: 'onboarding' }, { label: 'Lease Applications', route: 'applications' }, { label: 'AI Credit Assessment', route: 'assessment' },
  { label: 'Approval Workbench', route: 'workbench' }, { label: 'Contract Generation', route: 'contracts' }, { label: 'Active Leases', route: 'leases' },
]
const OTHER = ['LeaseHire', 'Fixed Deposit', 'Premium Finance', 'Document Manager', 'Journals', 'Supervisors', 'General Ledger', 'System Setup', 'Module Management', 'System Reports', 'Fixed Assets', 'Collateral Management', 'MOD Transactions', 'Receipts']

const GUIDE = [
  { key: 'start', role: 'maker', route: 'new-lease', text: 'As Leasing Officer, start a new lease application.' },
  { key: 'quote', role: 'maker', route: 'new-lease', text: 'Pick a customer, run the simulated AI document check, set the financing and generate the quotation.' },
  { key: 'assess', role: 'maker', route: 'new-lease', text: 'Run the credit assessment and read “How was this calculated?”.' },
  { key: 'submit', role: 'maker', route: 'new-lease', text: 'Submit the application for approval.' },
  { key: 'approve', role: 'checker', route: 'workbench', text: 'Switch to the Approving Manager, open the request and approve it.' },
  { key: 'contract', role: 'ops', route: 'contracts', text: 'As Operations, generate the lease agreement from the approved data.' },
  { key: 'pdf', role: 'ops', route: 'contracts', text: 'Download the agreement as a PDF.' },
  { key: 'activate', role: 'ops', route: 'leases', text: 'Review the contract, mark it signed (demo), then confirm the checklist and activate.' },
  { key: 'dashboard', role: 'ops', route: 'dashboard', text: 'Return to the dashboard — counts and portfolio value have updated.' },
]

export function App() {
  const s = useStore()
  const [menu, setMenu] = useState(false)
  const [open, setOpen] = useState(true)
  const user = currentUser(s)
  const next = GUIDE.find((g) => !s.guideDone.includes(g.key))

  useEffect(() => {
    document.body.dataset.guideOn = s.guideOn ? '1' : '0'
    if (!s.guideOn || !next) return
    const mark = () => document.querySelectorAll('[data-guide]').forEach((el) => {
      const k = el.getAttribute('data-guide')
      const on = k === next.key || (k === 'role' && user.role !== next.role) || (k === 'dashboard' && next.key === 'dashboard')
      el.setAttribute('data-guide-active', on && (k === 'role' || user.role === next.role) ? '1' : '0')
    })
    mark()
    const t = setInterval(mark, 400)
    return () => clearInterval(t)
  }, [s.guideOn, next?.key, user.role])

  const R = s.route
  const page = (() => {
    switch (R.name) {
      case 'dashboard': return <Dashboard />
      case 'capture': return <Onboarding legacy />
      case 'onboarding': return <Onboarding />
      case 'directory': return <Directory mode="details" />
      case 're-edit': return <Directory mode="edit" />
      case 'approve-customer': return <ApproveCustomer />
      case 'approve-details': return <ApproveCustomer details />
      case 'uploader': return <ImageUploader />
      case 'applications': return <Applications />
      case 'new-lease': return <LeaseWizard />
      case 'assessment': return <Assessment />
      case 'workbench': return <Workbench />
      case 'contracts': return <Contracts />
      case 'leases': return <ActiveLeases />
      case 'before-after': return <BeforeAfter />
      case 'portal': return <Portal />
      default: return <Dashboard />
    }
  })()
  const activeKey = R.name === 'reference' ? 'ref:' + R.id : R.name === 'new-lease' ? 'applications' : R.name

  const NavBtn = ({ it, sub }: { it: Item; sub?: boolean }) => (
    <button
      onClick={() => { actions.go(it.route, it.id); setMenu(false) }}
      data-guide={it.route === 'dashboard' ? 'dashboard' : undefined}
      aria-current={activeKey === it.route ? 'page' : undefined}
      className={cx('flex w-full items-center rounded px-2.5 py-1.5 text-left text-[13px] transition-colors duration-150', sub && 'pl-6', activeKey === it.route ? 'bg-white font-semibold text-navy' : 'text-[#dbe9f5] hover:bg-white/10')}
    >{it.label}</button>
  )

  const sidebar = (
    <nav aria-label="Main navigation" className="flex h-full w-64 flex-col gap-1 overflow-y-auto bg-navy px-2.5 py-3">
      <NavBtn it={{ label: 'Overview Dashboard', route: 'dashboard' }} />
      <div className="mx-1 mt-3 rounded-md border border-teal bg-teal/20 p-1.5">
        <div className="flex items-center gap-1.5 px-1.5 pb-1 pt-0.5 text-[11px] font-semibold text-white"><Sparkles className="size-3.5" />Smart Leasing <Badge t="teal" className="!bg-teal !text-white">NEW</Badge></div>
        {SMART.map((i) => <React.Fragment key={i.route}>{NavBtn({ it: i })}</React.Fragment>)}
      </div>
    </nav>
  )

  return (
    <div className="flex h-screen min-h-0 flex-col bg-canvas text-ink">
      <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 bg-navy px-3 py-2 text-white">
        <button className="rounded p-1.5 hover:bg-white/10 lg:hidden" onClick={() => setMenu(true)} aria-label="Open navigation"><Menu className="size-5" /></button>
        <button onClick={() => actions.go('dashboard')} className="flex items-baseline gap-2 text-left">
          <span className="text-lg font-semibold leading-none">Smart Lease<span className="text-[#5fd0d0]">Pac</span></span>
          <span className="hidden text-xs text-[#a9c3dc] md:inline">Intelligent Leasing &amp; Workflow Automation</span>
        </button>
        <DemoTag />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-[#a9c3dc]">
            <Users2 className="size-4" /><span className="sr-only sm:not-sr-only">Demo role</span>
            <select value={s.userId} data-guide="role" onChange={(e) => { actions.setUser(e.target.value); toast(`Now acting as ${ROLE_LABEL[USERS.find((u) => u.id === e.target.value)!.role]}`, 'info') }}
              className="h-8 max-w-48 rounded border border-white/30 bg-navy-2 px-2 text-xs text-white">
              {USERS.map((u) => <option key={u.id} value={u.id}>{u.name} — {ROLE_LABEL[u.role]}</option>)}
            </select>
          </label>
          <Btn size="sm" variant="primary" onClick={() => { actions.toggleGuide(true); if (next) { actions.go(next.route) } }}><Play className="size-3.5" />Start Hackathon Demo</Btn>
          <Btn size="sm" className="!border-white/30 !bg-transparent !text-white hover:!bg-white/10" onClick={() => { actions.reset(); toast('Demo data restored to seeded records', 'info') }}><RotateCcw className="size-3.5" />Reset Demo</Btn>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <div className="hidden lg:block">{sidebar}</div>
        {menu && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-navy/50" onClick={() => setMenu(false)} />
            <div className="relative h-full w-64"><button onClick={() => setMenu(false)} aria-label="Close navigation" className="absolute right-2 top-2 z-10 rounded p-1 text-white hover:bg-white/10"><X className="size-4" /></button>{sidebar}</div>
          </div>
        )}
        <main className="min-w-0 flex-1 overflow-y-auto" id="main">
          <div className="mx-auto max-w-[1280px] p-4 md:p-6" key={R.name + (R.id ?? '')}>
            <div className="rise">{page}</div>
          </div>
        </main>
      </div>
      {s.guideOn && (
        <div className="fixed bottom-4 left-4 z-40 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-teal bg-white p-3 shadow-xl lg:left-72" role="region" aria-label="Guided demo">
          <div className="flex items-center justify-between"><span className="text-xs font-semibold text-teal">Hackathon demo · {s.guideDone.filter((k) => GUIDE.some((g) => g.key === k)).length}/{GUIDE.length}</span><button onClick={() => actions.toggleGuide(false)} aria-label="Close guide" className="rounded p-0.5 text-muted hover:bg-canvas"><X className="size-4" /></button></div>
          <div className="mt-1 flex gap-1" aria-hidden>{GUIDE.map((g) => <i key={g.key} className={cx('h-1 flex-1 rounded', s.guideDone.includes(g.key) ? 'bg-teal' : 'bg-line')} />)}</div>
          {next ? (
            <>
              <p className="mt-2 text-sm text-ink">{next.text}</p>
              <p className="mt-1 text-xs text-muted">Role needed: {ROLE_LABEL[next.role as keyof typeof ROLE_LABEL]}{user.role !== next.role && ' — switch it in the top bar'}</p>
              <div className="mt-2 flex gap-2">
                <Btn size="sm" variant="primary" onClick={() => { if (user.role !== next.role) actions.setUser(USERS.find((u) => u.role === next.role)!.id); actions.go(next.route) }}>Take me there <ArrowRight className="size-3.5" /></Btn>
              </div>
            </>
          ) : <p className="mt-2 flex items-center gap-1.5 text-sm text-ok"><Check className="size-4" />Demo complete — the lease is in the Active portfolio.</p>}
        </div>
      )}
      <Toaster />
    </div>
  )
}
