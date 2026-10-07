'use client'

import { num } from '@/lib/score'
import { isPastDue } from '@/lib/tours'
import { Listing, Settings } from '@/lib/types'

const DAY = 24 * 60 * 60 * 1000

export default function NowView({
  listings, onOpen,
}: {
  listings: Listing[]
  settings: Settings
  onOpen: (l: Listing) => void
}) {
  const now = Date.now()
  const active = listings.filter(l => l.status !== 'Passed' && l.status !== 'Approved')

  const feesPaid = listings.reduce((a, l) => a + (num(l.feesPaid) ?? 0), 0)

  const pastDue = active.filter(l => isPastDue(l, now)).length

  const queues: { title: string; hint?: string; items: Listing[] }[] = [
    {
      title: 'Tours booked',
      hint: pastDue > 0 ? `${pastDue} past due, update them` : undefined,
      items: active
        .filter(l => l.status === 'Tour booked')
        .sort((a, b) => (Date.parse(a.tourAt) || Infinity) - (Date.parse(b.tourAt) || Infinity)),
    },
    {
      title: 'Message not sent',
      hint: 'still a Lead, open and hit Sent it',
      items: active.filter(l => l.status === 'Lead'),
    },
    {
      title: 'Quiet 24h+',
      hint: 'nudge them',
      items: active
        .filter(l => l.status === 'Inquired' && l.inquiredAt > 0 && now - l.inquiredAt > DAY)
        .sort((a, b) => a.inquiredAt - b.inquiredAt),
    },
    {
      title: 'Replied, no time booked',
      items: active.filter(l => l.status === 'Replied'),
    },
    {
      title: 'Toured / applied',
      items: active.filter(l => l.status === 'Toured' || l.status === 'Applied'),
    },
    {
      title: 'Sent, waiting (under 24h)',
      items: active
        .filter(l => l.status === 'Inquired' && (l.inquiredAt === 0 || now - l.inquiredAt <= DAY))
        .sort((a, b) => a.inquiredAt - b.inquiredAt),
    },
  ]

  const empty = queues.every(q => q.items.length === 0)

  return (
    <div className="space-y-5">
      {feesPaid > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
          Fees paid so far: <span className="font-bold tabular-nums">${feesPaid}</span>
        </div>
      )}

      {empty && <p className="py-16 text-center text-sm text-slate-400">Nothing needs action right now.</p>}

      {queues.map(q =>
        q.items.length === 0 ? null : (
          <section key={q.title}>
            <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {q.title} <span className="text-slate-400">({q.items.length})</span>
              {q.hint && <span className="ml-1 font-normal normal-case text-slate-400">· {q.hint}</span>}
            </h2>
            <ul className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              {q.items.map(l => (
                <li key={l.id} className="border-b border-slate-100 last:border-0">
                  <button onClick={() => onOpen(l)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left active:bg-slate-50">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{l.name || 'Untitled'}</div>
                      <div className="truncate text-xs text-slate-500">
                        {rowDetail(q.title, l, now)}
                      </div>
                    </div>
                    {q.title === 'Tours booked' && isPastDue(l, now) && (
                      <span className="flex-none rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                        Past due
                      </span>
                    )}
                    <span className="flex-none text-slate-300">›</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ),
      )}
    </div>
  )
}

function rowDetail(queueTitle: string, l: Listing, now: number): string {
  if (queueTitle === 'Tours booked' && l.tourAt) {
    const d = new Date(l.tourAt)
    const when = isNaN(d.getTime())
      ? l.tourAt
      : d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    return [when, l.askAbout && `ask: ${l.askAbout}`].filter(Boolean).join(' · ')
  }
  if (queueTitle.startsWith('Quiet') && l.inquiredAt > 0) {
    const h = Math.round((now - l.inquiredAt) / 3600000)
    return `sent ${h}h ago${l.contact ? ` · ${l.contact}` : ''}`
  }
  if (queueTitle.startsWith('Sent') && l.inquiredAt > 0) {
    const h = Math.max(1, Math.round((now - l.inquiredAt) / 3600000))
    return `sent ${h}h ago`
  }
  return [l.nextAction && `→ ${l.nextAction}`, l.hood].filter(Boolean).join(' · ') || l.hood || ''
}
