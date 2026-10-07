// BoardStore: the one interface Board uses for its data. Board subscribes,
// reads snapshots, and calls the write methods; it knows nothing about
// passcodes, HTTP, polling, or the write queue. See docs/design-demo-mode.md.

import { BoardData, DEFAULT_SETTINGS, Listing, Settings } from '../types'
import { ApiError } from './api'
import {
  KeyValueStorage, QueuedOp, coalesce, flushQueue, loadQueue, pendingListingIds, removeOp, saveQueue,
} from './queue'

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error'

export type BoardState = {
  // missing: the server has no board at this id (the passcode was fine). Retrying won't help.
  access: 'loading' | 'ready' | 'locked' | 'missing' | { unreachable: string }
  listings: Listing[]
  settings: Settings
  pendingIds: Set<string>
  // null when there is no server to sync with; the header hides its indicator.
  sync: { status: SyncStatus; lastSync: number | null; pending: number } | null
}

export interface BoardStore {
  getSnapshot(): BoardState
  subscribe(fn: () => void): () => void // first subscriber starts polling, last one stops it
  upsertListing(l: Listing): void
  removeListing(id: string): void
  saveSettings(s: Settings): void
  refresh(): Promise<void>
}

export type RemoteApi = {
  fetchBoard(): Promise<BoardData>
  putListing(l: Listing): Promise<unknown>
  deleteListing(id: string): Promise<unknown>
  putSettings(s: Settings): Promise<unknown>
}

// Server wins, except listings with queued local edits still in flight.
export function mergeServerListings(
  local: Record<string, Listing>,
  server: Listing[],
  queue: QueuedOp[],
): Record<string, Listing> {
  const next: Record<string, Listing> = {}
  for (const l of server) next[l.id] = l
  for (const op of queue) {
    if (op.kind === 'put') next[op.listing.id] = op.listing
    if (op.kind === 'delete') delete next[op.id]
  }
  // keep any purely-local listing that has a pending write
  for (const id of pendingListingIds(queue)) {
    if (!next[id] && local[id] && !queue.some(o => o.kind === 'delete' && o.id === id)) next[id] = local[id]
  }
  return next
}

const POLL_MS = 15_000 // Redis free-tier budget: poll only while the tab is visible

// Calls sync on an interval while the tab is visible, on reconnect, and on tab return.
export function browserWatch(sync: () => void): () => void {
  const visible = () => document.visibilityState === 'visible'
  const iv = setInterval(() => visible() && sync(), POLL_MS)
  const onVisible = () => visible() && sync()
  window.addEventListener('online', sync)
  document.addEventListener('visibilitychange', onVisible)
  return () => {
    clearInterval(iv)
    window.removeEventListener('online', sync)
    document.removeEventListener('visibilitychange', onVisible)
  }
}

export function remoteStore({
  boardId, api, storage, now = Date.now, watch = browserWatch,
}: {
  boardId: string
  api: RemoteApi
  storage: KeyValueStorage
  now?: () => number
  watch?: (sync: () => void) => () => void
}): BoardStore {
  const key = `queue:${boardId}`
  let listings: Record<string, Listing> = {}
  let settings: Settings = DEFAULT_SETTINGS
  let queue = loadQueue(storage, key)
  let access: BoardState['access'] = 'loading'
  let status: SyncStatus = 'idle'
  let lastSync: number | null = null
  let inflight: Promise<void> | null = null
  let again = false

  const listeners = new Set<() => void>()
  let stopWatch: (() => void) | null = null

  // useSyncExternalStore needs the same object back until something changes.
  const build = (): BoardState => ({
    access,
    listings: Object.values(listings),
    settings,
    pendingIds: pendingListingIds(queue),
    sync: { status, lastSync, pending: queue.length },
  })
  let snapshot = build()
  const emit = () => {
    snapshot = build()
    for (const fn of listeners) fn()
  }

  const send = (op: QueuedOp) =>
    op.kind === 'put' ? api.putListing(op.listing)
      : op.kind === 'delete' ? api.deleteListing(op.id)
        : api.putSettings(op.settings)

  async function run() {
    status = 'syncing'
    emit()
    try {
      const flush = await flushQueue(loadQueue(storage, key), send, op => removeOp(storage, key, op))
      queue = loadQueue(storage, key) // includes anything enqueued during the flush
      if (flush.authFailed) {
        access = 'locked'
        status = 'idle'
        return
      }
      const data = await api.fetchBoard()
      listings = mergeServerListings(listings, data.listings, queue)
      if (!queue.some(o => o.kind === 'settings')) settings = data.settings
      lastSync = now()
      status = queue.length > 0 ? 'error' : 'idle'
      access = 'ready'
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        access = 'locked'
        status = 'idle'
      } else if (err instanceof ApiError && err.status === 404 && access !== 'ready') {
        access = 'missing'
        status = 'idle'
      } else {
        status = err instanceof ApiError && err.status === 0 ? 'offline' : 'error'
        // Until the board has loaded once, report why; a retry that fails again updates the reason.
        if (access === 'loading' || typeof access === 'object') {
          access = { unreachable: err instanceof Error ? err.message : String(err) }
        }
      }
    } finally {
      emit()
    }
  }

  // One sync at a time. A call during a sync joins it and queues one more pass,
  // so an edit made mid-sync goes out right away instead of at the next poll.
  // A locked store stays locked: the owner replaces it after a new passcode. A
  // missing board stays missing: retrying won't bring it back.
  const stopped = () => access === 'locked' || access === 'missing'
  function sync(): Promise<void> {
    if (stopped()) return Promise.resolve()
    if (inflight) {
      again = true
      return inflight
    }
    inflight = (async () => {
      await null // start after `inflight` is set, so nested calls join this one
      do {
        again = false
        await run()
      } while (again && !stopped())
      inflight = null
    })()
    return inflight
  }

  function enqueue(op: QueuedOp) {
    queue = coalesce(loadQueue(storage, key), op)
    saveQueue(storage, key, queue)
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(fn) {
      listeners.add(fn)
      if (listeners.size === 1) {
        void sync()
        stopWatch = watch(() => void sync())
      }
      return () => {
        listeners.delete(fn)
        if (listeners.size === 0) {
          stopWatch?.()
          stopWatch = null
        }
      }
    },
    upsertListing(l) {
      const stamped = { ...l, updatedAt: now() }
      listings = { ...listings, [stamped.id]: stamped }
      enqueue({ kind: 'put', listing: stamped, ts: now() })
      emit()
      void sync()
    },
    removeListing(id) {
      listings = { ...listings }
      delete listings[id]
      enqueue({ kind: 'delete', id, ts: now() })
      emit()
      void sync()
    },
    saveSettings(s) {
      settings = { ...s, updatedAt: now() }
      enqueue({ kind: 'settings', settings, ts: now() })
      emit()
      void sync()
    },
    refresh: sync,
  }
}
