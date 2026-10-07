'use client'

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { BoardStore } from '@/lib/client/store'
import { Household, household } from '@/lib/household'
import { scoreListing } from '@/lib/score'
import { Listing, Settings } from '@/lib/types'
import { BoardNav, useBoardNav } from './BoardNav'

// A four-stop tour of the demo board: Ranked, Add listing, the message, To do. It moves
// the board only through BoardNav and finds what to highlight by data-tour
// anchors, so Board's internals stay private. Opened from the welcome block's
// "Take the tour" or the banner's "?".

type Step = {
  target: string // data-tour anchor to highlight
  title: string
  body: string
  enter(nav: BoardNav, topId: string | null): void
  // Pin the card to the top and scroll the target in just under it, for steps
  // whose text is about what comes after the target too.
  cardTop?: boolean
}

const steps = (h: Household): Step[] => [
  {
    target: 'top-listing',
    title: 'Ranked by fit',
    body:
      'Each listing gets a score out of 100 from its all-in monthly cost, parking, commute, size and move-in date, ' +
      'measured against your criteria. Foggy means you don’t know yet. A foggy factor gets half credit until you find out.',
    enter: nav => nav.go('rank'),
  },
  {
    target: 'sample',
    title: 'Paste a page, get a listing',
    body:
      'Paste a whole listing page and Claude fills in the form, leaving blank anything the page doesn’t say. ' +
      'Tap Try a sample listing to see it work.',
    enter: nav => nav.openPaste(),
  },
  {
    target: 'messages',
    title: 'Messages, already drafted',
    body:
      `Each listing gets a first message written from its details and your profile` +
      (h.solo ? '. ' : `, speaking for you and ${h.companionLabel}. `) +
      'Switch between private owner and property manager to see the message change.',
    enter: (nav, topId) => (topId ? nav.openListing(topId, 'messages') : nav.go('rank')),
    cardTop: true,
  },
  {
    target: 'todo',
    title: 'What to do next',
    body:
      'To do lists tours coming up, messages not sent yet, and anyone who hasn’t replied in a day. ' +
      'Everything stays in this browser. The ? button at the top brings this tour back.',
    enter: nav => nav.go('todo'),
    cardTop: true,
  },
]

const GAP = 12 // between the card and the screen edge or the highlight
const PAD = 4 // the highlight ring's padding around its target

// The best-ranked listing still waiting on its first message, so the message
// stop opens one near the top of Ranked whose message changes with landlord type.
function topListingId(listings: Listing[], settings: Settings): string | null {
  const ranked = listings
    .filter(l => l.status !== 'Passed')
    .map(l => ({ l, total: scoreListing(l, settings.criteria).total }))
    .sort((a, b) => b.total - a.total || a.l.name.localeCompare(b.l.name))
  return (ranked.find(x => x.l.status === 'Lead') ?? ranked[0])?.l.id ?? null
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
    // Once the board has moved, bring the target on screen: just under the card
    // when the card is pinned to the top, otherwise wherever it fits.
    const t = setTimeout(() => {
      const el = findAnchor(step.target)
      if (!el) return
      if (!step.cardTop) return el.scrollIntoView({ block: 'nearest' })
      // Measured against the screen, where the card is pinned. scrollIntoView with a
      // scroll margin would measure from the sheet body, which starts below its header.
      const below = GAP + (cardRef.current?.offsetHeight ?? 0) + 20
      scrollParent(el).scrollBy(0, el.getBoundingClientRect().top - below)
    }, 120)
    return () => clearTimeout(t)
  }, [i])

  // Escape closes the tour, and only the tour: it listens first and marks the key
  // handled, so the sheet the tour opened (which skips handled keys) stays open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      e.preventDefault()
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  })

  // Sit the card right next to the highlight, below it if it fits, else above,
  // so it never covers what it points at. A target too tall for either side
  // gets the card on the edge with more room. Steps with cardTop pin it to the top.
  const cardRef = useRef<HTMLDivElement>(null)
  const [cardH, setCardH] = useState(0)
  useLayoutEffect(() => setCardH(cardRef.current?.offsetHeight ?? 0), [i])
  const vh = typeof window === 'undefined' ? 0 : window.innerHeight
  let place: React.CSSProperties = { bottom: `calc(${GAP}px + env(safe-area-inset-bottom))` }
  if (step.cardTop) place = { top: GAP }
  else if (rect) {
    if (rect.bottom + PAD + GAP + cardH <= vh - GAP) place = { top: rect.bottom + PAD + GAP }
    else if (rect.top - PAD - GAP - cardH >= GAP) place = { top: rect.top - PAD - GAP - cardH }
    else if (rect.top > vh - rect.bottom) place = { top: GAP }
  }

  return (
    <>
      {rect && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-40 rounded-[16px] ring-[2.5px] ring-sun transition-all duration-200"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + 2 * PAD,
            height: rect.height + 2 * PAD,
            boxShadow: '0 0 0 9999px var(--scrim)',
          }}
        />
      )}
      <div
        ref={cardRef}
        role="dialog"
        aria-label="Walkthrough"
        style={place}
        className="fixed inset-x-3 z-50 mx-auto max-w-sm rounded-card bg-paper p-5 shadow-pop"
      >
        <p className="text-[13px] font-medium text-ink-2">
          {i + 1} of {all.length}
        </p>
        <h2 className="mt-1 font-display text-xl font-semibold leading-tight">{step.title}</h2>
        <p className="mt-2 text-[15px] leading-snug text-ink-2">{step.body}</p>
        <div className="mt-4 flex items-center gap-2">
          <button onClick={onClose} className="-ml-2 min-h-11 px-2 text-[15px] font-semibold text-ink-2">
            Skip
          </button>
          {i > 0 && (
            <button
              onClick={() => setI(i - 1)}
              className="ml-auto min-h-11 rounded-control px-4 text-[15px] font-semibold control-outline active:bg-fog"
            >
              Back
            </button>
          )}
          <button
            onClick={() => (last ? onClose() : setI(i + 1))}
            className={`${i > 0 ? '' : 'ml-auto '}min-h-11 rounded-control px-5 text-[15px] btn-primary`}
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
      const r = findAnchor(name)?.getBoundingClientRect() ?? null
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

// The element that scrolls `el`: the sheet body or the desktop list column, else the page.
function scrollParent(el: HTMLElement): Element {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const { overflowY } = getComputedStyle(p)
    if ((overflowY === 'auto' || overflowY === 'scroll') && p.scrollHeight > p.clientHeight) return p
  }
  return document.scrollingElement ?? document.documentElement
}

// The anchor that's on screen: some exist twice, one for desktop and one for phones.
function findAnchor(name: string): HTMLElement | undefined {
  return [...document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)].find(el => el.getClientRects().length > 0)
}
