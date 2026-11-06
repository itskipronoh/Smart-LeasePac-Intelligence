import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { X, CheckCircle2, AlertTriangle, Info, Loader2 } from 'lucide-react'
import type { Status } from './types'

export const cx = (...a: (string | false | undefined | null)[]) => a.filter(Boolean).join(' ')

/* ---------- buttons ---------- */
type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'ok'; busy?: boolean; size?: 'sm' | 'md'; guide?: string }
export function Btn({ variant = 'secondary', busy, size = 'md', guide, className, children, disabled, ...p }: BtnProps) {
  const base = 'inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap select-none transition-[background-color,transform,opacity] duration-150 ease-out active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100'
  const v = {
    primary: 'bg-teal text-white hover:bg-[#096a6e]',
    secondary: 'bg-white text-ink border border-line hover:bg-canvas',
    ghost: 'text-navy-2 hover:bg-teal-soft',
    danger: 'bg-bad text-white hover:bg-[#962019]',
    ok: 'bg-ok text-white hover:bg-[#166a3b]',
  }[variant]
  return (
    <button {...p} data-guide={guide} disabled={disabled || busy} className={cx(base, v, size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-9 px-3.5 text-sm', className)}>
      {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

/* ---------- badges ---------- */
const tone = {
  neutral: 'bg-canvas text-muted border-line', teal: 'bg-teal-soft text-teal border-teal/30', ok: 'bg-ok-soft text-ok border-ok/30',
  warn: 'bg-warn-soft text-warn border-warn/30', bad: 'bg-bad-soft text-bad border-bad/30', navy: 'bg-navy text-white border-navy',
}
export type Tone = keyof typeof tone
export const Badge = ({ t = 'neutral', children, className }: { t?: Tone; children: React.ReactNode; className?: string }) => (
  <span className={cx('inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium leading-4 whitespace-nowrap', tone[t], className)}>{children}</span>
)
export const statusTone = (s: Status | string): Tone =>
  ({ 'Draft': 'neutral', 'Submitted': 'teal', 'Verification Pending': 'warn', 'Credit Review': 'teal', 'Awaiting Approval': 'warn', 'Returned for Correction': 'bad', 'Approved': 'ok', 'Rejected': 'bad', 'Contract Pending': 'teal', 'Ready for Activation': 'ok', 'Active': 'ok',
    'Verified': 'ok', 'Uploaded': 'teal', 'Missing': 'bad', 'Flagged': 'warn', 'Low': 'ok', 'Medium': 'warn', 'High': 'bad', 'Pending Verification': 'warn', 'Signed (Demo)': 'ok', 'Reviewed': 'teal', 'Current': 'ok', 'In Arrears': 'bad' } as Record<string, Tone>)[s] ?? 'neutral'
export const StatusBadge = ({ s }: { s: string }) => <Badge t={statusTone(s)}>{s}</Badge>

/* ---------- layout ---------- */
export const Card = ({ title, action, children, className, pad = true }: { title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string; pad?: boolean }) => (
  <section className={cx('rounded-lg border border-line bg-white', className)}>
    {title && (
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-navy">{title}</h2>
        {action}
      </header>
    )}
    <div className={pad ? 'p-4' : ''}>{children}</div>
  </section>
)
export const PageHeader = ({ title, sub, actions, tag }: { title: string; sub?: string; actions?: React.ReactNode; tag?: React.ReactNode }) => (
  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
    <div className="min-w-0">
      <div className="flex items-center gap-2"><h1 className="text-xl font-semibold text-navy">{title}</h1>{tag}</div>
      {sub && <p className="mt-0.5 max-w-3xl text-sm text-muted">{sub}</p>}
    </div>
    <div className="flex flex-wrap items-center gap-2">{actions}</div>
  </div>
)
export const Notice = ({ t = 'info', title, children }: { t?: 'info' | 'warn' | 'bad' | 'ok'; title?: string; children?: React.ReactNode }) => {
  const m = { info: ['bg-teal-soft border-teal/30 text-navy', Info], warn: ['bg-warn-soft border-warn/30 text-[#5f3d00]', AlertTriangle], bad: ['bg-bad-soft border-bad/30 text-bad', AlertTriangle], ok: ['bg-ok-soft border-ok/30 text-ok', CheckCircle2] }[t] as [string, typeof Info]
  const Icon = m[1]
  return (
    <div role={t === 'bad' ? 'alert' : 'status'} className={cx('flex gap-2.5 rounded-md border px-3 py-2.5 text-sm', m[0])}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0">{title && <div className="font-semibold">{title}</div>}{children && <div className="text-[13px] leading-5">{children}</div>}</div>
    </div>
  )
}
export const Empty = ({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) => (
  <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
    <div className="text-sm font-semibold text-navy">{title}</div>
    {children && <p className="max-w-sm text-[13px] text-muted">{children}</p>}
    {action}
  </div>
)
export const DemoTag = ({ children = 'Demo Data' }: { children?: React.ReactNode }) => (
  <Badge t="warn" className="uppercase tracking-wide">{children}</Badge>
)
export const Simulated = ({ children = 'Simulated' }: { children?: React.ReactNode }) => (
  <Badge t="navy" className="uppercase tracking-wide">{children}</Badge>
)

/* ---------- form ---------- */
export function Field({ label, error, hint, required, children, className }: { label: string; error?: string; hint?: string; required?: boolean; children: (p: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => React.ReactNode; className?: string }) {
  const id = useRef('f' + Math.random().toString(36).slice(2, 8)).current
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-navy-2">{label}{required && <span className="text-bad" aria-hidden> *</span>}</label>
      {children({ id, 'aria-invalid': !!error, 'aria-describedby': error ? id + '-e' : undefined })}
      {error ? <p id={id + '-e'} className="mt-1 text-xs text-bad">{error}</p> : hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  )
}
export const inputCls = (err?: string) => cx('h-9 w-full rounded-md border bg-white px-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-teal disabled:bg-canvas', err ? 'border-bad' : 'border-line')
export function TextField(p: { label: string; value: string | number; onChange: (v: string) => void; error?: string; hint?: string; required?: boolean; type?: string; placeholder?: string; className?: string; disabled?: boolean }) {
  return (
    <Field label={p.label} error={p.error} hint={p.hint} required={p.required} className={p.className}>
      {(a) => <input {...a} type={p.type ?? 'text'} value={p.value} placeholder={p.placeholder} disabled={p.disabled} onChange={(e) => p.onChange(e.target.value)} className={inputCls(p.error)} />}
    </Field>
  )
}
export function SelectField(p: { label: string; value: string; onChange: (v: string) => void; options: string[]; error?: string; required?: boolean; className?: string; placeholder?: string }) {
  return (
    <Field label={p.label} error={p.error} required={p.required} className={p.className}>
      {(a) => (
        <select {...a} value={p.value} onChange={(e) => p.onChange(e.target.value)} className={inputCls(p.error)}>
          <option value="">{p.placeholder ?? 'Select…'}</option>
          {p.options.map((o) => <option key={o}>{o}</option>)}
        </select>
      )}
    </Field>
  )
}
export const NumField = (p: { label: string; value: number; onChange: (v: number) => void; error?: string; hint?: string; required?: boolean; className?: string; step?: number }) => (
  <Field label={p.label} error={p.error} hint={p.hint} required={p.required} className={p.className}>
    {(a) => <input {...a} type="number" min={0} step={p.step ?? 1} value={Number.isFinite(p.value) ? p.value : ''} onChange={(e) => p.onChange(e.target.value === '' ? 0 : Number(e.target.value))} className={inputCls(p.error)} />}
  </Field>
)

/* ---------- overlays ---------- */
function useEsc(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])
}
export function Modal({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  useEsc(onClose)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-navy/50" onClick={onClose} />
      <div className={cx('rise relative flex max-h-[88vh] w-full flex-col rounded-lg bg-white shadow-xl', wide ? 'max-w-4xl' : 'max-w-lg')}>
        <header className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-base font-semibold text-navy">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-muted hover:bg-canvas"><X className="size-4" /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer>}
      </div>
    </div>
  )
}
export function Drawer({ title, sub, onClose, children, footer }: { title: string; sub?: React.ReactNode; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  useEsc(onClose)
  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-navy/40" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-[720px] flex-col bg-white shadow-xl" style={{ animation: 'rise 200ms cubic-bezier(0.23,1,0.32,1)' }}>
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-3">
          <div className="min-w-0"><h2 className="truncate text-base font-semibold text-navy">{title}</h2>{sub}</div>
          <button onClick={onClose} aria-label="Close panel" className="rounded p-1 text-muted hover:bg-canvas"><X className="size-4" /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <footer className="border-t border-line bg-canvas px-5 py-3">{footer}</footer>}
      </aside>
    </div>
  )
}

/* ---------- toasts ---------- */
interface T { id: number; msg: string; kind: 'ok' | 'bad' | 'info' }
let toasts: T[] = []
const tl = new Set<() => void>()
export function toast(msg: string, kind: T['kind'] = 'ok') {
  const t = { id: Date.now() + Math.random(), msg, kind }
  toasts = [...toasts, t]; tl.forEach((l) => l())
  setTimeout(() => { toasts = toasts.filter((x) => x !== t); tl.forEach((l) => l()) }, 4200)
}
export function Toaster() {
  const list = useSyncExternalStore((cb) => { tl.add(cb); return () => tl.delete(cb) }, () => toasts)
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className={cx('rise pointer-events-auto rounded-md border px-3 py-2.5 text-sm shadow-lg', t.kind === 'ok' ? 'border-ok/40 bg-white text-ok' : t.kind === 'bad' ? 'border-bad/40 bg-white text-bad' : 'border-line bg-white text-navy')}>{t.msg}</div>
      ))}
    </div>
  )
}
export const report = (r: { ok: boolean; error?: string }, okMsg: string) => { if (r.ok) toast(okMsg, 'ok'); else toast((r as { error: string }).error, 'bad'); return r.ok }

/* ---------- tabs / table helpers ---------- */
export const Table = ({ head, children, empty }: { head: string[]; children: React.ReactNode; empty?: React.ReactNode }) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[640px] text-left text-[13px]">
      <thead><tr className="border-b border-line text-xs text-muted">{head.map((h) => <th key={h} scope="col" className="whitespace-nowrap px-3 py-2 font-medium">{h}</th>)}</tr></thead>
      <tbody className="divide-y divide-line">{children}</tbody>
    </table>
    {empty}
  </div>
)
export const Td = ({ children, className }: { children?: React.ReactNode; className?: string }) => <td className={cx('px-3 py-2.5 align-middle', className)}>{children}</td>

export function KV({ items, cols = 2 }: { items: [string, React.ReactNode][]; cols?: 1 | 2 | 3 }) {
  return (
    <dl className={cx('grid gap-x-6 gap-y-2.5 text-sm', cols === 1 ? 'grid-cols-1' : cols === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}>
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0"><dt className="text-xs text-muted">{k}</dt><dd className="break-words font-medium text-ink">{v || '—'}</dd></div>
      ))}
    </dl>
  )
}

/* ---------- charts (dependency-free SVG) ---------- */
export function BarChart({ data, color = '#0b7f84' }: { data: [string, number][]; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d[1]))
  return (
    <ul className="space-y-2.5">
      {data.map(([k, v]) => (
        <li key={k} className="grid grid-cols-[96px_1fr_28px] items-center gap-2 text-xs">
          <span className="truncate text-muted">{k}</span>
          <span className="h-5 rounded-sm bg-canvas"><span className="block h-5 rounded-sm transition-[width] duration-300 ease-out" style={{ width: `${(v / max) * 100}%`, background: color, minWidth: v ? 6 : 0 }} /></span>
          <span className="text-right font-semibold tabular-nums text-navy">{v}</span>
        </li>
      ))}
    </ul>
  )
}
export function TrendChart({ data }: { data: { m: string; apps: number; approved: number }[] }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.apps, d.approved])) * 1.15
  const w = 420, h = 170, pl = 24, pb = 22
  const x = (i: number) => pl + (i * (w - pl - 8)) / (data.length - 1)
  const y = (v: number) => h - pb - (v / max) * (h - pb - 8)
  const line = (k: 'apps' | 'approved') => data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d[k])}`).join(' ')
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Monthly applications and approvals trend">
        {[0, 0.5, 1].map((f) => <line key={f} x1={pl} x2={w - 8} y1={y(max * f / 1.15)} y2={y(max * f / 1.15)} stroke="#d9e1ea" strokeDasharray="3 3" />)}
        <path d={line('apps')} fill="none" stroke="#14406b" strokeWidth="2.5" />
        <path d={line('approved')} fill="none" stroke="#0b7f84" strokeWidth="2.5" strokeDasharray="5 3" />
        {data.map((d, i) => (
          <g key={d.m}>
            <circle cx={x(i)} cy={y(d.apps)} r="3.5" fill="#14406b" /><circle cx={x(i)} cy={y(d.approved)} r="3.5" fill="#0b7f84" />
            <text x={x(i)} y={h - 6} textAnchor="middle" fontSize="10" fill="#55657a">{d.m}</text>
            <text x={x(i)} y={y(d.apps) - 7} textAnchor="middle" fontSize="10" fontWeight="600" fill="#14406b">{d.apps}</text>
          </g>
        ))}
      </svg>
      <div className="mt-1 flex gap-4 text-xs text-muted"><span className="flex items-center gap-1.5"><i className="h-0.5 w-4 bg-navy-2" />Applications</span><span className="flex items-center gap-1.5"><i className="h-0.5 w-4 border-t-2 border-dashed border-teal" />Approved</span></div>
    </div>
  )
}
export function Donut({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1
  let acc = 0
  const r = 40, c = 2 * Math.PI * r
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 100 100" className="size-28 shrink-0 -rotate-90" role="img" aria-label="Risk distribution">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#eef2f7" strokeWidth="14" />
        {parts.map((p) => {
          const len = (p.value / total) * c
          const el = <circle key={p.label} cx="50" cy="50" r={r} fill="none" stroke={p.color} strokeWidth="14" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-acc} />
          acc += len
          return el
        })}
      </svg>
      <ul className="space-y-1.5 text-xs">
        {parts.map((p) => <li key={p.label} className="flex items-center gap-2"><i className="size-2.5 rounded-sm" style={{ background: p.color }} /><span className="text-muted">{p.label}</span><b className="ml-auto pl-3 tabular-nums text-navy">{p.value}</b></li>)}
      </ul>
    </div>
  )
}
export function ScoreGauge({ score, risk }: { score: number; risk: string }) {
  const col = risk === 'Low' ? '#1b7f47' : risk === 'Medium' ? '#9a6200' : '#b3261e'
  return (
    <div className="w-full">
      <div className="flex items-baseline gap-2"><span className="text-4xl font-semibold tabular-nums" style={{ color: col }}>{score}</span><span className="text-sm text-muted">/ 100 risk score</span></div>
      <div className="relative mt-2 h-2.5 rounded-full bg-canvas" role="meter" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} aria-label="Risk score">
        <div className="absolute inset-y-0 left-0 w-[35%] rounded-l-full bg-ok-soft" /><div className="absolute inset-y-0 left-[35%] w-[25%] bg-warn-soft" /><div className="absolute inset-y-0 left-[60%] right-0 rounded-r-full bg-bad-soft" />
        <div className="absolute -top-1 h-4.5 w-1.5 rounded bg-navy transition-[left] duration-300 ease-out" style={{ left: `calc(${score}% - 3px)`, height: 18 }} />
      </div>
      <div className="mt-1 flex text-[10px] text-muted"><span className="w-[35%]">Low</span><span className="w-[25%]">Medium</span><span>High</span></div>
    </div>
  )
}
export const useBusy = (ms = 700) => {
  const [busy, setBusy] = useState(false)
  const run = (fn: () => void) => { setBusy(true); setTimeout(() => { fn(); setBusy(false) }, ms) }
  return [busy, run] as const
}
