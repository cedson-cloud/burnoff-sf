'use client'

import { ScoreResult } from '@/lib/score'
import { Listing } from '@/lib/types'
import FactorStrip from './FactorStrip'
import Icon from './Icon'
import { standing } from './listing-format'
import ScoreMark from './ScoreMark'

export default function ListingCard({
  listing: l, score: s, pending, top = false, muted = false, selected = false, onOpen,
}: {
  listing: Listing
  score: ScoreResult
  pending: boolean
  top?: boolean // the best fit gets a sun outline
  muted?: boolean // passed listings
  selected?: boolean // open in the desktop side panel
  onOpen: () => void
}) {
  const st = standing(l)
  return (
    <button
      onClick={onOpen}
      className={`block w-full rounded-card px-[18px] pb-4 pt-[18px] text-left active:bg-well ${
        muted ? 'shadow-[inset_0_0_0_1.5px_var(--line)]' : 'bg-paper'
      } ${selected ? 'shadow-[inset_0_0_0_2.5px_var(--ink)]' : top ? 'shadow-[inset_0_0_0_2px_var(--sun)]' : ''}`}
      aria-current={selected || undefined}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1.5 font-display text-[21px] font-semibold leading-tight tracking-[-0.01em]">
            <span className="truncate">{l.name || 'Untitled'}</span>
            {pending && (
              <span className="size-2 flex-none rounded-full bg-ink-2" title="Not synced yet">
                <span className="sr-only">Not synced yet</span>
              </span>
            )}
          </h3>
          <p className="mt-0.5 truncate text-[14.5px] text-ink-2">{[l.hood, s.unit?.label].filter(Boolean).join(', ')}</p>
          <p
            className={`mt-2 flex items-center gap-1.5 text-[14.5px] ${
              st.tone === 'alarm' ? 'font-semibold text-alarm' : st.tone === 'good' ? 'font-semibold text-good' : ''
            }`}
          >
            {st.tone === 'alarm' && <Icon name="alert" size={16} className="flex-none" />}
            {st.tone === 'good' && <Icon name="check" size={16} className="flex-none" />}
            <span className="min-w-0 truncate">{st.text}</span>
          </p>
          {l.nextAction && <p className="mt-0.5 truncate text-[14.5px] text-ink-2">Next: {l.nextAction}</p>}
        </div>
        <ScoreMark total={s.total} />
      </div>
      <div className="mt-[18px]">
        <FactorStrip listing={l} score={s} />
      </div>
    </button>
  )
}
