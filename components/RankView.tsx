'use client'

import { scoreListing } from '@/lib/score'
import { Criteria, Listing, Settings } from '@/lib/types'
import AddListingButton from './AddListingButton'
import { useBoardNav } from './BoardNav'
import EmptyState from './EmptyState'
import Icon from './Icon'
import ListingCard from './ListingCard'
import { money, sqft } from './listing-format'

export default function RankView({
  listings, settings, pendingIds, selectedId, onOpen,
}: {
  listings: Listing[]
  settings: Settings
  pendingIds: Set<string>
  selectedId?: string // open in the side panel
  onOpen: (l: Listing) => void
}) {
  const nav = useBoardNav()
  const c = settings.criteria
  const scored = listings
    .map(l => ({ l, s: scoreListing(l, c) }))
    .sort((a, b) => b.s.total - a.s.total || a.l.name.localeCompare(b.l.name))

  const active = scored.filter(x => x.l.status !== 'Passed')
  const passed = scored.filter(x => x.l.status === 'Passed')

  return (
    <div>
      {/* Where the scores come from, and the way in to change it. */}
      <button
        onClick={nav.openCriteria}
        data-tour="criteria"
        className="mb-3.5 mt-1.5 flex w-full items-center gap-3 py-1 text-left"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-display text-[17px] font-semibold leading-tight">Ranked by fit, out of 100</span>
          <span className="text-[13.5px] text-ink-2">{criteriaSummary(c)}</span>
        </span>
        <span className="inline-flex min-h-10 flex-none items-center gap-1.5 rounded-full px-3 text-sm font-semibold control-outline">
          <Icon name="sliders" size={18} />
          Your criteria
        </span>
      </button>

      {active.length === 0 && (
        <EmptyState title={passed.length ? 'No active listings' : 'No listings yet'} action={<AddListingButton size="block" />}>
          Paste a listing page. Burnoff scores it against your criteria and drafts the first message.
        </EmptyState>
      )}

      <ol className="grid grid-cols-1 gap-3">
        {active.map(({ l, s }, i) => (
          <li key={l.id} data-tour={i === 0 ? 'top-listing' : undefined}>
            <ListingCard listing={l} score={s} pending={pendingIds.has(l.id)} top={i === 0} selected={l.id === selectedId} onOpen={() => onOpen(l)} />
          </li>
        ))}
      </ol>

      {passed.length > 0 && (
        <>
          <h2 className="mb-2.5 mt-8 font-display text-[17px] font-semibold text-ink-2">Passed</h2>
          <ul className="grid grid-cols-1 gap-3">
            {passed.map(({ l, s }) => (
              <li key={l.id}>
                <ListingCard listing={l} score={s} pending={pendingIds.has(l.id)} muted selected={l.id === selectedId} onOpen={() => onOpen(l)} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}


// "Against $4,800 a month, 35 min commute, 850 ft², parking"
function criteriaSummary(c: Criteria): string {
  const parts = [
    c.targetAllIn > 0 && `${money(c.targetAllIn)} a month`,
    c.maxCommuteMin > 0 && `${c.maxCommuteMin} min commute`,
    c.minSqft > 0 && sqft(c.minSqft),
    c.parkingRequired && 'parking',
  ].filter(Boolean)
  return parts.length ? `Against ${parts.join(', ')}` : 'Set what you need to start scoring'
}
