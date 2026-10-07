'use client'

import { isPastDue } from '@/lib/tours'
import { Listing, Settings } from '@/lib/types'

export default function WeekView({
  listings, settings, onOpen,
}: {
  listings: Listing[]
  settings: Settings
  onOpen: (l: Listing) => void
}) {
  const c = settings.criteria
  const booked = listings.filter(l => l.status === 'Tour booked' || (l.tourAt && l.status !== 'Passed'))

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Array.from({ length: 7 }, (_, i) => new Date(today.getTime() + i * 86400000))
  const weekEnd = today.getTime() + 7 * 86400000

  const withTime = booked
    .map(l => ({ l, t: Date.parse(l.tourAt) }))
    .filter(x => !isNaN(x.t))
    .sort((a, b) => a.t - b.t)
  const unscheduled = booked.filter(l => isNaN(Date.parse(l.tourAt)))
  const later = withTime.filter(x => x.t >= weekEnd)
  const pastDue = withTime.filter(x => isPastDue(x.l, today.getTime()))

  return (
    <div className="space-y-3">
      {pastDue.length > 0 && (
        <section className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5">
          <h2 className="text-sm font-semibold text-amber-900">
            Past due <span className="font-normal text-amber-700">({pastDue.length})</span>
          </h2>
          <p className="text-xs text-amber-700">Still “Tour booked.” Mark it Toured or Passed, or reschedule.</p>
          <ul className="mt-1.5 space-y-1">
            {pastDue.map(({ l, t }) => (
              <li key={l.id}>
                <button
                  onClick={() => onOpen(l)}
                  className="flex w-full items-center gap-2 rounded-lg bg-white px-2.5 py-2 text-left active:bg-amber-100"
                >
                  <span className="flex-none text-xs font-bold tabular-nums text-amber-800">
                    {new Date(t).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{l.name || 'Untitled'}</span>
                  {l.hood && <span className="flex-none text-xs text-slate-400">{l.hood}</span>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {days.map(d => {
        const dayStart = d.getTime()
        const dayEnd = dayStart + 86400000
        const tours = withTime.filter(x => x.t >= dayStart && x.t < dayEnd)
        const isBlocked = d.getDay() === c.blockedDay && !!c.blockedDayLabel
        return (
          <section
            key={dayStart}
            className={`rounded-xl border px-3 py-2.5 ${isBlocked ? 'border-slate-200 bg-slate-50' : 'border-slate-200 bg-white'}`}
          >
            <div className="flex items-baseline gap-2">
              <h2 className="text-sm font-semibold">
                {d.toLocaleDateString(undefined, { weekday: 'long' })}
              </h2>
              <span className="text-xs text-slate-400">
                {d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
              {isBlocked && (
                <span className="ml-auto rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                  {c.blockedDayLabel}
                </span>
              )}
            </div>
            {tours.length === 0 ? (
              <p className="mt-1 text-xs text-slate-300">{isBlocked ? 'Blocked, no tours' : 'Free'}</p>
            ) : (
              <ul className="mt-1.5 space-y-1">
                {tours.map(({ l, t }) => (
                  <li key={l.id}>
                    <button
                      onClick={() => onOpen(l)}
                      className="flex w-full items-center gap-2 rounded-lg bg-violet-50 px-2.5 py-2 text-left active:bg-violet-100"
                    >
                      <span className="flex-none text-xs font-bold tabular-nums text-violet-700">
                        {new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{l.name || 'Untitled'}</span>
                      {l.hood && <span className="flex-none text-xs text-slate-400">{l.hood}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}

      {later.length > 0 && (
        <Bucket title="Beyond this week" items={later.map(x => x.l)} onOpen={onOpen} />
      )}
      {unscheduled.length > 0 && (
        <Bucket title="Tour booked, no time set" items={unscheduled} onOpen={onOpen} />
      )}
    </div>
  )
}

function Bucket({ title, items, onOpen }: { title: string; items: Listing[]; onOpen: (l: Listing) => void }) {
  return (
    <section>
      <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      <ul className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {items.map(l => (
          <li key={l.id} className="border-b border-slate-100 last:border-0">
            <button onClick={() => onOpen(l)} className="flex w-full items-center px-3 py-2.5 text-left text-sm font-medium active:bg-slate-50">
              <span className="min-w-0 flex-1 truncate">{l.name || 'Untitled'}</span>
              {l.tourAt && <span className="ml-2 flex-none text-xs text-slate-400">{l.tourAt}</span>}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
