import React, { useState } from 'react'
import type { RepaymentInstallment } from './types'
import { fmtDate, fmtNum } from './engine'
import { Btn } from './ui'

export function ScheduleTable({ rows, limit = 12, paid = 0 }: { rows: RepaymentInstallment[]; limit?: number; paid?: number }) {
  const [all, setAll] = useState(false)
  const shown = all ? rows : rows.slice(0, limit)
  return (
    <div>
      <div className="max-h-96 overflow-auto rounded-md border border-line">
        <table className="w-full min-w-[620px] text-right text-[13px] tabular-nums">
          <thead className="sticky top-0 bg-canvas text-xs text-muted"><tr>
            {['Period', 'Date', 'Opening balance', 'Installment', 'Financing charge', 'Principal', 'Closing balance'].map((h, i) => <th key={h} scope="col" className={'px-3 py-2 font-medium ' + (i < 2 ? 'text-left' : '')}>{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-line">
            {shown.map((r) => (
              <tr key={r.period} className={r.period <= paid ? 'bg-ok-soft/50' : ''}>
                <td className="px-3 py-1.5 text-left">{r.period}</td><td className="px-3 py-1.5 text-left">{fmtDate(r.date)}</td>
                <td className="px-3 py-1.5">{fmtNum(r.opening)}</td><td className="px-3 py-1.5 font-medium">{fmtNum(r.installment)}</td>
                <td className="px-3 py-1.5">{fmtNum(r.charge)}</td><td className="px-3 py-1.5">{fmtNum(r.principal)}</td><td className="px-3 py-1.5">{fmtNum(r.closing)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > limit && <div className="mt-2"><Btn size="sm" variant="ghost" onClick={() => setAll(!all)}>{all ? 'Show first ' + limit : `Show all ${rows.length} periods`}</Btn></div>}
    </div>
  )
}
