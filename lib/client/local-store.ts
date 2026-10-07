// localStore: a BoardStore whose board lives entirely in browser storage. There
// is no server, so there's no queue and no polling: writes land in state and
// storage at once, and `sync` is null so the header hides its indicator.
// See docs/design-demo-mode.md.

import { normalizeBoardData } from '../board-data'
import { BoardData, Listing, Settings } from '../types'
import { KeyValueStorage } from './queue'
import { BoardState, BoardStore } from './store'

// Separate from remoteStore's `queue:<boardId>` keys.
export const LOCAL_BOARD_KEY = 'burnoff:local-board'

// Extras for the owning composition root only; Board sees just BoardStore.
export type LocalStore = BoardStore & {
  reset(): void
  exportJSON(): string
  importJSON(text: string): { ok: true } | { ok: false; error: string }
}

// Parses board JSON from storage or a file. Null when it isn't board data:
// bad JSON, no listings/settings, or listings present but none usable. Anything
// that passes goes through normalizeBoardData like every other entry point.
export function readBoardJSON(text: string): BoardData | null {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return null
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const r = raw as { listings?: unknown; settings?: unknown }
  if (!r.listings || typeof r.listings !== 'object') return null
  if (!r.settings || typeof r.settings !== 'object' || Array.isArray(r.settings)) return null
  const count = Array.isArray(r.listings) ? r.listings.length : Object.keys(r.listings).length
  const data = normalizeBoardData(raw)
  if (count > 0 && data.listings.length === 0) return null
  return data
}

export function localStore({
  storage, seed, key = LOCAL_BOARD_KEY, now = Date.now,
}: {
  storage: KeyValueStorage
  seed: BoardData
  key?: string
  now?: () => number
}): LocalStore {
  // Storage can throw (private mode, blocked site data); the board then lives in memory.
  const load = (): string | null => {
    try {
      return storage.getItem(key)
    } catch {
      return null
    }
  }
  const stored = load()
  const initial = (stored && readBoardJSON(stored)) || seed

  let listings: Record<string, Listing> = {}
  let settings: Settings = initial.settings
  const setListings = (ls: Listing[]) => {
    listings = {}
    for (const l of ls) listings[l.id] = l
  }
  setListings(initial.listings)

  const serialize = (space?: number) =>
    JSON.stringify({ listings: Object.values(listings), settings }, null, space)
  const persist = () => {
    try {
      storage.setItem(key, serialize())
    } catch {}
  }

  const listeners = new Set<() => void>()
  const noPending = new Set<string>()
  // useSyncExternalStore needs the same object back until something changes.
  const build = (): BoardState => ({
    access: 'ready',
    listings: Object.values(listings),
    settings,
    pendingIds: noPending,
    sync: null,
  })
  let snapshot = build()
  const commit = () => {
    persist()
    snapshot = build()
    for (const fn of listeners) fn()
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(fn) {
      listeners.add(fn)
      return () => void listeners.delete(fn)
    },
    upsertListing(l) {
      listings = { ...listings, [l.id]: { ...l, updatedAt: now() } }
      commit()
    },
    removeListing(id) {
      if (!(id in listings)) return
      listings = { ...listings }
      delete listings[id]
      commit()
    },
    saveSettings(s) {
      settings = { ...s, updatedAt: now() }
      commit()
    },
    refresh: () => Promise.resolve(), // nothing to sync with
    reset() {
      setListings(seed.listings)
      settings = seed.settings
      commit()
    },
    exportJSON: () => serialize(2),
    importJSON(text) {
      const data = readBoardJSON(text)
      if (!data) return { ok: false, error: "That file isn't a Burnoff board export." }
      setListings(data.listings)
      settings = data.settings
      commit()
      return { ok: true }
    },
  }
}
