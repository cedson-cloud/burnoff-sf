'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { BoardStore } from '@/lib/client/store'
import { Household, household } from '@/lib/household'
import { scoreListing } from '@/lib/score'
import { Listing, Settings } from '@/lib/types'
import { BoardNav, useBoardNav } from './BoardNav'

// A four-stop tour of the demo board: Rank → Parse → Messages → Now. It moves
// the board only through BoardNav and finds what to highlight by data-tour
// anchors, so Board's internals stay private. Shown once per browser; the
// banner's "?" reopens it.

const SEEN_KEY = 'burnoff:walkthrough-seen'

export function walkthroughSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return false
  }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1')
  } catch {}
}

type Step = {
  target: string // data-tour anchor to highlight
  title: string
  body: string
  enter(nav: BoardNav, topId: string | null): void
}

const steps = (h: Household): Step[] => [
  {
    target: 'top-listing',
    title: 'Ranked by fit',
    body:
      'Every listing gets a 100-point score from all-in monthly cost, parking, commute, size and move-in date, ' +
      'measured against the criteria in Settings. Amber marks something unknown: it gets half credit until you find out.',
    enter: nav => nav.go('rank'),
  },
  {
    target: 'sample',
    title: 'Paste a page, get a listing',
    body:
      'On a real listing page, select all, copy, and paste it here. Claude fills in the form and leaves blank ' +
      'anything the page doesn’t say. Tap “Try a sample listing” to see it work.',
    enter: nav => nav.openPaste(),
  },
  {
    target: 'messages',
    title: 'Messages, already drafted',
    body:
      `Each listing gets an inquiry and follow-ups written from its details and your profile` +
      (h.solo ? '. ' : `, speaking for you and ${h.companionLabel}. `) +
      'A private owner gets a friendlier note; a management company gets the numbers first.',
    enter: (nav, topId) => (topId ? nav.openListing(topId, 'messages') : nav.go('rank')),
  },
  {
    target: 'tab-now',
    title: 'What to do today',
    body:
      'Now lists tours coming up, messages not sent yet, and anyone who’s gone quiet for a day. ' +
      'Week puts the tours on a calendar. Everything stays in this browser; the ? button brings this tour back.',
    enter: nav => nav.go('now'),
  },
]

// The listing at the top of Rank, so the Messages stop opens a familiar one.
function topListingId(listings: Listing[], settings: Settings): string | null {
  const best = listings
    .filter(l => l.status !== 'Passed')
    .map(l => ({ l, total: scoreListing(l, settings.criteria).total }))
    .sort((a, b) => b.total - a.total || a.l.name.localeCompare(b.l.name))[0]
  return best?.l.id ?? null
}

export default function Walkthrough({ store, onClose }: { store: BoardStore; onClose: () => void }) {
  const nav = useBoardNav()
  const { settings } = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  const [i, setI] = useState(0)
  const all = steps(household(settings.profile))
  const step = all[i]
  const last = i === all.length - 1
  const rect = useAnchorRect(step.target)

  // Move the board when the step changes, not when the board does.
  useEffect(() => {
    const { listings, settings } = store.getSnapshot()
    step.enter(nav, topListingId(listings, settings))
  }, [i])

  const finish = () => {
    markSeen()
    onClose()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && finish()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Put the card on whichever side of the highlight has more room.
  const cardOnTop = rect ? rect.top > window.innerHeight - rect.bottom : false

  return (
    <>
      {rect && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-40 rounded-xl ring-2 ring-amber-400 transition-all duration-200"
          style={{
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.45)',
          }}
        />
      )}
      <div
        role="dialog"
        aria-label="Walkthrough"
        className={`fixed inset-x-3 z-50 mx-auto max-w-sm rounded-2xl bg-white p-4 shadow-xl ${
          cardOnTop ? 'top-3' : 'bottom-[calc(4.5rem+env(safe-area-inset-bottom))]'
        }`}
      >
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
          {i + 1} of {all.length}
        </p>
        <h2 className="mt-1 text-base font-bold">{step.title}</h2>
        <p className="mt-1.5 text-sm text-slate-600">{step.body}</p>
        <div className="mt-4 flex items-center gap-2">
          <button onClick={finish} className="text-sm font-medium text-slate-400">
            Skip
          </button>
          {i > 0 && (
            <button
              onClick={() => setI(i - 1)}
              className="ml-auto rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 active:bg-slate-50"
            >
              Back
            </button>
          )}
          <button
            onClick={() => (last ? finish() : setI(i + 1))}
            className={`${i > 0 ? '' : 'ml-auto '}rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white active:bg-slate-700`}
          >
            {last ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </>
  )
}

// Tracks where the anchor is on screen, following scrolls, sheet opens and
// layout shifts. Null while it isn't rendered (e.g. the sheet was closed).
function useAnchorRect(name: string): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null)
  useEffect(() => {
    let frame = 0
    const tick = () => {
      const r = document.querySelector(`[data-tour="${name}"]`)?.getBoundingClientRect() ?? null
      setRect(prev => (sameRect(prev, r) ? prev : r))
      frame = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(frame)
  }, [name])
  return rect
}

const sameRect = (a: DOMRect | null, b: DOMRect | null) =>
  a === b ||
  (!!a && !!b && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height)
