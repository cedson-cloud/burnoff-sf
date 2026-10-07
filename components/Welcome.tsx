'use client'

import AddListingButton from './AddListingButton'
import Icon from './Icon'

// The demo's first-visit welcome: what Burnoff is and where to start. It sits at
// the top of Ranked through Board's intro slot. DemoApp decides whether it shows.

const DISMISSED_KEY = 'burnoff:welcome-dismissed'

// Dismissed per browser. Reset demo clears it along with the sample board.
export const welcomeDismissed = {
  get(): boolean {
    try {
      return localStorage.getItem(DISMISSED_KEY) === '1'
    } catch {
      return false
    }
  },
  set(dismissed: boolean) {
    try {
      if (dismissed) localStorage.setItem(DISMISSED_KEY, '1')
      else localStorage.removeItem(DISMISSED_KEY)
    } catch {}
  },
}

export default function Welcome({ onTour, onDismiss }: { onTour: () => void; onDismiss: () => void }) {
  return (
    <section aria-label="Welcome" className="relative mb-5 mt-1 rounded-card bg-paper p-5 lg:px-7 lg:py-6">
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="absolute right-1.5 top-1.5 grid size-11 place-items-center rounded-full text-ink-2 active:bg-well"
      >
        <Icon name="close" />
      </button>
      <p className="mr-7 max-w-[32ch] font-display text-[21px] font-medium leading-[1.3] tracking-[-0.005em] lg:text-2xl">
        Burnoff scores apartment listings against your budget, commute and must-haves, then drafts the message to the
        landlord.
      </p>
      <p className="mt-2 text-[15px] text-ink-2">This is a sample search by two friends in San Francisco. Change anything.</p>
      <div className="mt-4 flex flex-wrap gap-2.5">
        <AddListingButton size="block" className="flex-1 lg:flex-none" />
        <button
          onClick={onTour}
          className="min-h-12 flex-1 rounded-control px-5 font-semibold control-outline active:bg-well lg:flex-none"
        >
          Take the tour
        </button>
      </div>
    </section>
  )
}
