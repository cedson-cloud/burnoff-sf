'use client'

import { scoreListing } from '@/lib/score'
import { Listing, Settings } from '@/lib/types'
import ListingCard from './ListingCard'

export default function RankView({
  listings, settings, pendingIds, onOpen, onToggleParking,
}: {
  listings: Listing[]
  settings: Settings
  pendingIds: Set<string>
  onOpen: (l: Listing) => void
  onToggleParking: () => void
}) {
  const c = settings.criteria
  const scored = listings
    .map(l => ({ l, s: scoreListing(l, c) }))
    .sort((a, b) => b.s.total - a.s.total || a.l.name.localeCompare(b.l.name))

  const active = scored.filter(x => x.l.status !== 'Passed')
  const passed = scored.filter(x => x.l.status === 'Passed')

  return (
    <div>
      <label className="mb-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
        <span className="font-medium text-slate-700">Count parking in all-in</span>
        <input
          type="checkbox"
          checked={c.includeParking}
          onChange={onToggleParking}
          className="h-5 w-5 accent-slate-900"
        />
      </label>

      {active.length === 0 && (
        <p className="py-16 text-center text-sm text-slate-400">
          No listings yet. Tap <span className="font-semibold">+ Add</span>, paste a listing page, and go.
        </p>
      )}

      <ul className="space-y-3">
        {active.map(({ l, s }, i) => (
          <li key={l.id} data-tour={i === 0 ? 'top-listing' : undefined}>
            <ListingCard listing={l} score={s} criteria={c} pending={pendingIds.has(l.id)} onOpen={() => onOpen(l)} />
          </li>
        ))}
      </ul>

      {passed.length > 0 && (
        <>
          <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-slate-400">Passed</h2>
          <ul className="space-y-3 opacity-60">
            {passed.map(({ l, s }) => (
              <li key={l.id}>
                <ListingCard listing={l} score={s} criteria={c} pending={pendingIds.has(l.id)} onOpen={() => onOpen(l)} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
