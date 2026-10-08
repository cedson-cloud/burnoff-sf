'use client'

import { FindOutcome } from '@/lib/client/parser'
import Icon from './Icon'

export type Find = {
  id: string
  label: string // what the person typed, first line
  status: 'running' | 'ready' | 'failed'
  outcome?: FindOutcome
  error?: string
}

// Lookups in progress or waiting to be checked, at the top of the board.
export default function FindCards({
  finds, onOpen, onDismiss,
}: {
  finds: Find[]
  onOpen: (f: Find) => void
  onDismiss: (id: string) => void
}) {
  return (
    <div aria-live="polite" className={finds.length ? 'mb-4 mt-1 space-y-2.5' : ''}>
      {finds.map(f => (
        <div key={f.id} className="flex items-center gap-3 rounded-card bg-paper py-2 pl-4 pr-1.5">
          {f.status === 'running' && <Icon name="sync" size={20} className="flex-none animate-spin text-ink-2" />}
          {f.status === 'ready' && <span aria-hidden className="size-2.5 flex-none rounded-full bg-sun" />}
          {f.status === 'failed' && <Icon name="alert" size={20} className="flex-none text-alarm" />}

          {f.status === 'ready' ? (
            <button onClick={() => onOpen(f)} className="min-h-12 min-w-0 flex-1 py-1.5 text-left">
              <span className="block truncate font-semibold">{f.outcome?.listing.name || f.label}</span>
              <span className="block text-sm text-ink-2">Found it. Tap to check before you save.</span>
            </button>
          ) : (
            <div className="min-h-12 min-w-0 flex-1 py-1.5">
              <span className="block truncate font-semibold">{f.label}</span>
              <span className={`block text-sm ${f.status === 'failed' ? 'text-alarm' : 'text-ink-2'}`}>
                {f.status === 'running'
                  ? 'Searching the web. This takes a minute or two.'
                  : `Couldn’t find it. ${f.error ?? ''}`}
              </span>
            </div>
          )}

          {f.status !== 'running' && (
            <button
              onClick={() => onDismiss(f.id)}
              aria-label="Dismiss"
              className="grid size-11 flex-none place-items-center rounded-full text-ink-2 active:bg-well"
            >
              <Icon name="close" size={18} />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
