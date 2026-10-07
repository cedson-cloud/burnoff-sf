'use client'

import { FactorKey, ScoreResult } from '@/lib/score'
import { Criteria, Listing, ListingStatus } from '@/lib/types'

const SHORT_LABEL: Record<FactorKey, string> = {
  cost: 'Cost', parking: 'Park', commute: 'Comm', size: 'Size', timing: 'Time',
}

const STATUS_STYLE: Record<ListingStatus, string> = {
  'Lead': 'bg-slate-100 text-slate-600',
  'Inquired': 'bg-sky-100 text-sky-700',
  'Replied': 'bg-indigo-100 text-indigo-700',
  'Tour booked': 'bg-violet-100 text-violet-700',
  'Toured': 'bg-amber-100 text-amber-700',
  'Applied': 'bg-orange-100 text-orange-700',
  'Approved': 'bg-emerald-100 text-emerald-700',
  'Passed': 'bg-slate-100 text-slate-400',
}

export default function ListingCard({
  listing: l, score: s, pending, onOpen,
}: {
  listing: Listing
  score: ScoreResult
  criteria: Criteria
  pending: boolean
  onOpen: () => void
}) {
  return (
    <button
      onClick={onOpen}
      className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm active:bg-slate-50"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {pending && <span className="h-2 w-2 flex-none rounded-full bg-amber-400" title="Edit not yet synced" />}
            <span className="truncate font-semibold">{l.name || 'Untitled'}</span>
          </div>
          <div className="mt-0.5 truncate text-xs text-slate-500">
            {[l.hood, s.unit?.label, s.unit?.avail && `avail ${s.unit.avail}`].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div className="flex-none text-right">
          <div className="text-lg font-bold tabular-nums">
            {s.allIn !== null ? `$${Math.round(s.allIn)}` : '?'}
          </div>
          <div className="text-[11px] text-slate-400">all-in / mo</div>
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <span className={`flex-none rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[l.status]}`}>
          {l.status}
        </span>
        {l.nextAction && (
          <span className="min-w-0 truncate text-[11px] text-slate-500">→ {l.nextAction}</span>
        )}
        <span className="ml-auto flex-none text-sm font-bold tabular-nums">{s.total}</span>
      </div>

      {/* Per-factor breakdown: see what drags a score down, and whether it's
          a real measurement or just missing data (hatched = unknown). */}
      <div className="mt-2 flex gap-1">
        {s.factors.map(f => (
          <div key={f.key} className="flex-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${f.unknown ? 'bg-amber-300' : 'bg-slate-700'}`}
                style={{ width: `${(f.points / f.max) * 100}%` }}
              />
            </div>
            <div className={`mt-0.5 text-center text-[10px] ${f.unknown ? 'text-amber-600' : 'text-slate-400'}`}>
              {SHORT_LABEL[f.key]} {Math.round(f.points)}
              {f.unknown && '?'}
            </div>
          </div>
        ))}
      </div>
    </button>
  )
}
