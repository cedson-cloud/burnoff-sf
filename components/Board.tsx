'use client'

import { ReactNode, useMemo, useState, useSyncExternalStore } from 'react'
import { Parser } from '@/lib/client/parser'
import { BoardState, BoardStore } from '@/lib/client/store'
import { Listing } from '@/lib/types'
import { BoardNav, BoardNavContext, EditorSection, View } from './BoardNav'
import ListingEditor from './ListingEditor'
import NowView from './NowView'
import PasteParse from './PasteParse'
import RankView from './RankView'
import SettingsView from './SettingsView'
import WeekView from './WeekView'

// Places a composition root can add its own UI. Board renders them as given
// and never asks which mode it is in.
export type BoardSlots = {
  top?: ReactNode // above the header
  settings?: ReactNode // below the Settings form
  overlay?: ReactNode // on top of everything, e.g. the walkthrough
}

type Editing = { listing: Listing; section?: EditorSection; key: number }

export default function Board({ store, parser, slots = {} }: { store: BoardStore; parser: Parser; slots?: BoardSlots }) {
  const { access, listings: all, settings, pendingIds: pending, sync } =
    useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  const [view, setView] = useState<View>('rank')
  const [editing, setEditing] = useState<Editing | null>(null)
  const [showPaste, setShowPaste] = useState(false)
  const { upsertListing, removeListing, saveSettings } = store

  // A fresh key per open, so the editor starts from the listing as it is now.
  const edit = (listing: Listing, section?: EditorSection) => setEditing({ listing, section, key: Date.now() })

  const nav = useMemo<BoardNav>(
    () => ({
      go(v) {
        setShowPaste(false)
        setEditing(null)
        setView(v)
      },
      openPaste() {
        setEditing(null)
        setShowPaste(true)
      },
      openListing(id, section) {
        const listing = store.getSnapshot().listings.find(l => l.id === id)
        if (!listing) return
        setShowPaste(false)
        setEditing({ listing, section, key: Date.now() })
      },
    }),
    [store],
  )

  return (
    <BoardNavContext.Provider value={nav}>
      <div className="mx-auto flex min-h-dvh max-w-2xl flex-col">
        {slots.top}
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur">
          <h1 className="text-base font-bold tracking-tight">Burnoff</h1>
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
            {sync && sync.pending > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
                {sync.pending} pending
              </span>
            )}
            {sync?.status === 'offline' && <span className="font-medium text-rose-600">offline</span>}
            {sync?.status === 'error' && <span className="font-medium text-amber-600">retrying…</span>}
            {sync && (
              <button
                onClick={() => void store.refresh()}
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 font-medium text-slate-600 active:bg-slate-100"
                aria-label="Sync now"
              >
                {sync.status === 'syncing' ? '…' : '⟳'}
                {sync.lastSync && sync.status !== 'syncing' && (
                  <span className="ml-1">{ageLabel(sync.lastSync)}</span>
                )}
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 px-3 pb-28 pt-3">
          {typeof access === 'object' ? (
            <Unreachable reason={access.unreachable} sync={sync} onRetry={() => void store.refresh()} />
          ) : access !== 'ready' ? (
            <p className="py-16 text-center text-sm text-slate-400">Loading board…</p>
          ) : view === 'rank' ? (
            <RankView
              listings={all}
              settings={settings}
              pendingIds={pending}
              onOpen={l => edit(l)}
              onToggleParking={() =>
                saveSettings({ ...settings, criteria: { ...settings.criteria, includeParking: !settings.criteria.includeParking } })
              }
            />
          ) : view === 'now' ? (
            <NowView listings={all} settings={settings} onOpen={l => edit(l)} />
          ) : view === 'week' ? (
            <WeekView listings={all} settings={settings} onOpen={l => edit(l)} />
          ) : (
            <>
              <SettingsView settings={settings} onSave={saveSettings} />
              {slots.settings && <div className="mt-6">{slots.settings}</div>}
            </>
          )}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-2xl items-stretch border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
          {(
            [
              ['rank', 'Rank'],
              ['now', 'Now'],
              ['week', 'Week'],
              ['settings', 'Settings'],
            ] as [View, string][]
          ).map(([v, label]) => (
            <button
              key={v}
              data-tour={`tab-${v}`}
              onClick={() => setView(v)}
              className={`flex-1 py-3.5 text-sm font-medium ${view === v ? 'text-slate-900' : 'text-slate-400'}`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => setShowPaste(true)}
            data-tour="add"
            className="my-1.5 mr-2 flex-none rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white active:bg-slate-700"
            aria-label="Add listing"
          >
            + Add
          </button>
        </nav>

        {showPaste && (
          <PasteParse
            parser={parser}
            onClose={() => setShowPaste(false)}
            onParsed={l => {
              setShowPaste(false)
              edit(l) // open prefilled editor; nothing saved until Save
            }}
          />
        )}

        {editing && (
          <ListingEditor
            key={editing.key}
            listing={editing.listing}
            section={editing.section}
            settings={settings}
            isNew={!all.some(l => l.id === editing.listing.id)}
            onClose={() => setEditing(null)}
            onSave={l => {
              upsertListing(l)
              setEditing(null)
            }}
            onDelete={id => {
              removeListing(id)
              setEditing(null)
            }}
          />
        )}

        {slots.overlay}
      </div>
    </BoardNavContext.Provider>
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
      <h2 className="text-base font-semibold">Can’t reach the board</h2>
      <p className="mt-2 text-sm text-slate-500">
        {offline
          ? 'This device looks offline. Check your connection and try again.'
          : 'The server isn’t responding properly right now. Try again in a minute.'}
      </p>
      {!offline && <p className="mt-1 text-xs text-slate-400">{reason}</p>}
      {sync && sync.pending > 0 && (
        <p className="mt-3 text-xs text-amber-700">
          {sync.pending} {sync.pending === 1 ? 'edit is' : 'edits are'} saved on this device and will send once it’s back.
        </p>
      )}
      <button
        onClick={onRetry}
        disabled={busy}
        className="mt-5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white active:bg-slate-700 disabled:opacity-50"
      >
        {busy ? 'Trying…' : 'Try again'}
      </button>
    </div>
  )
}

function ageLabel(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000)
  if (s < 20) return 'now'
  if (s < 90) return `${s}s`
  return `${Math.round(s / 60)}m`
}
