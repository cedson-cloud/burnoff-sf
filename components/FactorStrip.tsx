'use client'

import { ScoreResult } from '@/lib/score'
import { Listing } from '@/lib/types'
import { factorValue } from './listing-format'

// The five factors as a forecast strip: name, a bar for the points earned, and
// the real value. An unknown factor is fog: hatched haze instead of a fill, and
// "?" for the value, so it reads without color. On the sheet each column also
// says how many points it earned.
export default function FactorStrip({
  listing, score, detail = false,
}: {
  listing: Listing
  score: ScoreResult
  detail?: boolean
}) {
  return (
    <div
      className={`grid ${detail ? 'gap-2.5' : 'gap-1.5'}`}
      style={{ gridTemplateColumns: `repeat(${score.factors.length}, minmax(0, 1fr))` }}
    >
      {score.factors.map(f => {
        const value = factorValue(listing, score, f)
        return (
          <div key={f.key} className={`flex min-w-0 flex-col gap-1.5 ${f.unknown ? 'text-haze-ink' : ''}`}>
            <span className={`truncate text-[12.5px] ${f.unknown ? '' : 'text-ink-2'}`}>{f.label}</span>
            <span className={`h-1.5 overflow-hidden rounded-full ${f.unknown ? 'fog-hatch' : 'bg-line'}`}>
              {!f.unknown && (
                <span
                  className="block h-full rounded-r-[3px] bg-ink"
                  style={{ width: `${Math.max(4, (f.points / f.max) * 100)}%` }}
                />
              )}
            </span>
            <span className={`truncate font-semibold tabular-nums ${detail ? 'text-[15px]' : 'text-[13.5px]'}`}>
              {value}
              <span className="sr-only">
                {f.unknown ? ', not known, half credit' : `, ${Math.round(f.points)} of ${f.max} points`}
              </span>
            </span>
            {detail && (
              <span aria-hidden className={`text-xs ${f.unknown ? '' : 'text-ink-2'}`}>
                {f.unknown ? 'half credit' : `${Math.round(f.points)} of ${f.max}`}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
