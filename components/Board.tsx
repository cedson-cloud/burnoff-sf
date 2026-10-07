'use client'

import { ReactNode, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Parser } from '@/lib/client/parser'
import { BoardState, BoardStore } from '@/lib/client/store'
import { todoCount } from '@/lib/tours'
import { Listing } from '@/lib/types'
import AddListingButton from './AddListingButton'
import { BoardNav, BoardNavContext, EditorSection, View } from './BoardNav'
import { segment, segmentTrack } from './Field'
import Icon from './Icon'
import ListingEditor from './ListingEditor'
import PasteParse from './PasteParse'
import RankView from './RankView'
import SettingsView from './SettingsView'
import TodoView from './TodoView'
import Wordmark from './Wordmark'

// Places a composition root can add its own UI. Board renders them as given
// and never asks which mode it is in.
export type BoardSlots = {
  top?: ReactNode // above the header
  intro?: ReactNode // at the top of Ranked, e.g. a welcome
  settings?: ReactNode // below the criteria form
  overlay?: ReactNode // on top of everything, e.g. the walkthrough
}

// The one sheet that's open, if any. A fresh key per listing open, so the editor
// starts from the listing as it is now.
type OpenSheet =
  | { kind: 'paste' }
  | { kind: 'criteria' }
  | { kind: 'listing'; listing: Listing; section?: EditorSection; key: number }

const TABS: [View, string][] = [
  ['rank', 'Ranked'],
  ['todo', 'To do'],
]

export default function Board({ store, parser, slots = {} }: { store: BoardStore; parser: Parser; slots?: BoardSlots }) {
  const { access, listings: all, settings, pendingIds: pending, sync } =
    useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  const [view, setView] = useState<View>('rank')
  const [sheet, setSheet] = useState<OpenSheet | null>(null)
  const { upsertListing, removeListing, saveSettings } = store

  // One sheet at a time. Focus goes back to whatever opened the first one once the
  // last one closes, even when one sheet hands over to the next (paste, then the
  // parsed listing), and only after the board behind is no longer inert.
  const sheetNow = useRef(sheet)
  sheetNow.current = sheet
  const opener = useRef<HTMLElement | null>(null)
  const show = (next: OpenSheet | null) => {
    if (next && !sheetNow.current && document.activeElement instanceof HTMLElement) opener.current = document.activeElement
    setSheet(next)
  }
  useEffect(() => {
    if (sheet || !opener.current) return
    if (opener.current.isConnected) opener.current.focus({ preventScroll: true })
    opener.current = null
  }, [sheet])

  const edit = (listing: Listing, section?: EditorSection) => show({ kind: 'listing', listing, section, key: Date.now() })
  const close = () => show(null)

  const nav = useMemo<BoardNav>(
    () => ({
      go(v) {
        show(null)
        setView(v)
      },
      openPaste: () => show({ kind: 'paste' }),
      openListing(id, section) {
        const listing = store.getSnapshot().listings.find(l => l.id === id)
        if (listing) edit(listing, section)
      },
      openCriteria: () => show({ kind: 'criteria' }),
    }),
    // show and edit only touch refs and state setters, so they never go stale.
    [store],
  )

  const todo = access === 'ready' ? todoCount(all, Date.now()) : 0
  const tabs = (
    <nav aria-label="Views" className={segmentTrack}>
      {TABS.map(([v, label]) => (
        <button
          key={v}
          aria-current={view === v ? 'page' : undefined}
          data-tour={`tab-${v}`}
          onClick={() => setView(v)}
          className={`${segment(view === v)} transition-colors`}
        >
          {label}
          {v === 'todo' && todo > 0 && (
            <span className="ml-1.5 inline-grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1.5 align-[1px] text-xs font-semibold text-paper">
              {todo}
              <span className="sr-only"> to do</span>
            </span>
          )}
        </button>
      ))}
    </nav>
  )

  const syncStatus = sync && <SyncStatus sync={sync} onRefresh={() => void store.refresh()} />

  // A phone sheet covers the screen, so the board behind it goes inert and Tab
  // stays in the sheet. On desktop the list stays usable beside the panel. The
  // overlay slot is left alone: the walkthrough drives sheets from on top.
  const wide = useWide()
  const behind = !!sheet && !wide

  return (
    <BoardNavContext.Provider value={nav}>
      <div className="flex min-h-dvh flex-col lg:h-dvh">
        {slots.top && <div inert={behind}>{slots.top}</div>}

        {/* Desktop: one top bar with the tabs and Add listing. */}
        <header className="hidden h-[68px] flex-none items-center gap-7 border-b border-line px-8 lg:flex">
          <Wordmark />
          <div className="w-60">{tabs}</div>
          <div className="ml-auto flex items-center gap-3">
            {syncStatus}
            <AddListingButton size="bar" tourAnchor="add" />
          </div>
        </header>

        {/* Mobile: wordmark, then tabs that stick while the list scrolls. */}
        <header inert={behind} className="flex items-center gap-2 px-4 pb-2.5 pt-3.5 lg:hidden">
          <Wordmark />
          <div className="ml-auto">{syncStatus}</div>
        </header>
        <div inert={behind} className="sticky top-0 z-20 bg-fog px-4 pb-3 pt-1.5 lg:hidden">{tabs}</div>

        {/* Desktop is an app layout: the list scrolls in its own column and an
            open sheet docks beside it as a panel. On a phone both are plain
            page flow and the sheet covers the screen. */}
        <div className="flex-1 lg:flex lg:min-h-0">
          <div inert={behind} className="lg:min-w-0 lg:flex-1 lg:overflow-y-auto">
            <main className="mx-auto w-full max-w-[640px] px-4 pb-32 pt-1 lg:pb-16 lg:pt-6">
              {typeof access === 'object' ? (
                <Unreachable reason={access.unreachable} sync={sync} onRetry={() => void store.refresh()} />
              ) : access !== 'ready' ? (
                <p className="py-16 text-center text-sm text-ink-2">Loading board…</p>
              ) : view === 'rank' ? (
                <>
                  {slots.intro}
                  <RankView
                    listings={all}
                    settings={settings}
                    pendingIds={pending}
                    selectedId={sheet?.kind === 'listing' ? sheet.listing.id : undefined}
                    onOpen={l => edit(l)}
                  />
                </>
              ) : (
                <TodoView listings={all} settings={settings} onOpen={edit} />
              )}
            </main>
          </div>

          {sheet && (
            <div className="lg:w-[520px] lg:flex-none lg:py-4 lg:pr-6">
              {sheet.kind === 'criteria' && (
                <SettingsView settings={settings} onSave={saveSettings} onClose={close}>
                  {slots.settings}
                </SettingsView>
              )}

              {sheet.kind === 'paste' && (
                <PasteParse
                  parser={parser}
                  onClose={close}
                  onParsed={l => edit(l)} // the prefilled editor; nothing is saved until Save
                />
              )}

              {sheet.kind === 'listing' && (
                <ListingEditor
                  key={sheet.key}
                  listing={sheet.listing}
                  section={sheet.section}
                  settings={settings}
                  isNew={!all.some(l => l.id === sheet.listing.id)}
                  onClose={close}
                  onSave={l => {
                    upsertListing(l)
                    close()
                  }}
                  onDelete={id => {
                    removeListing(id)
                    close()
                  }}
                />
              )}
            </div>
          )}
        </div>

        <div inert={behind} className="fixed bottom-[calc(18px+env(safe-area-inset-bottom))] right-4 z-20 lg:hidden">
          <AddListingButton size="floating" tourAnchor="add" />
        </div>

        {slots.overlay}
      </div>
    </BoardNavContext.Provider>
  )
}

// Real mode only: unsynced edits, connection trouble, and a manual refresh.
function SyncStatus({ sync, onRefresh }: { sync: NonNullable<BoardState['sync']>; onRefresh: () => void }) {
  return (
    <div className="flex items-center gap-2 text-[13px] text-ink-2">
      {sync.pending > 0 && <span className="font-medium">{sync.pending} not synced</span>}
      {sync.status === 'offline' && <span className="font-semibold text-alarm">Offline</span>}
      {sync.status === 'error' && <span className="font-medium">Retrying…</span>}
      <button
        onClick={onRefresh}
        className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 font-medium text-ink-2 control-outline active:bg-fog-2"
        aria-label="Sync now"
      >
        <Icon name="sync" size={16} className={sync.status === 'syncing' ? 'animate-spin' : ''} />
        {sync.lastSync && sync.status !== 'syncing' && <span>{ageLabel(sync.lastSync)}</span>}
      </button>
    </div>
  )
}

// The first load failed for a reason other than a bad passcode (a 401 goes to
// the passcode prompt instead). Showing an empty board here would look like
// the data was gone, so say what happened and offer a retry.
function Unreachable({
  reason, sync, onRetry,
}: {
  reason: string
  sync: BoardState['sync']
  onRetry: () => void
}) {
  const busy = sync?.status === 'syncing'
  const offline = sync?.status === 'offline'
  return (
    <div className="mx-auto max-w-xs py-16 text-center">
      <h2 className="font-display text-xl font-semibold">Can’t reach the board</h2>
      <p className="mt-2 text-[15px] text-ink-2">
        {offline
          ? 'This device looks offline. Check your connection and try again.'
          : 'The server isn’t responding properly right now. Try again in a minute.'}
      </p>
      {!offline && <p className="mt-1 text-[13px] text-ink-2">{reason}</p>}
      {sync && sync.pending > 0 && (
        <p className="mt-3 text-[13px] text-ink">
          {sync.pending} {sync.pending === 1 ? 'edit is' : 'edits are'} saved on this device and will send once it’s back.
        </p>
      )}
      <button
        onClick={onRetry}
        disabled={busy}
        className="mt-5 min-h-12 rounded-control px-6 btn-primary disabled:opacity-50"
      >
        {busy ? 'Trying…' : 'Try again'}
      </button>
    </div>
  )
}

// Matches Tailwind's lg breakpoint, where sheets become a side panel.
const WIDE = '(min-width: 1024px)'
function subscribeWide(onChange: () => void) {
  const mq = window.matchMedia(WIDE)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}
function useWide(): boolean {
  return useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE).matches, () => false)
}

function ageLabel(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000)
  if (s < 20) return 'now'
  if (s < 90) return `${s}s`
  return `${Math.round(s / 60)}m`
}
