// Offline retry queue. Edits apply to local state immediately and are queued
// here; the queue is flushed on reconnect / visibility / before each poll.
// An edit is only removed from the queue after the server confirms it.
// Storage and the network are passed in, so these rules run without a browser.

import { Listing, Settings } from '../types'
import { ApiError } from './api'

export type QueuedOp =
  | { kind: 'put'; listing: Listing; ts: number }
  | { kind: 'delete'; id: string; ts: number }
  | { kind: 'settings'; settings: Settings; ts: number }

export type KeyValueStorage = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function loadQueue(storage: KeyValueStorage, key: string): QueuedOp[] {
  try {
    const raw = storage.getItem(key)
    return raw ? (JSON.parse(raw) as QueuedOp[]) : []
  } catch {
    return []
  }
}

export function saveQueue(storage: KeyValueStorage, key: string, q: QueuedOp[]) {
  try {
    storage.setItem(key, JSON.stringify(q))
  } catch {}
}

// Adds op to the queue, dropping any queued op it supersedes.
export function coalesce(q: QueuedOp[], op: QueuedOp): QueuedOp[] {
  if (op.kind === 'put') {
    // Newest local state for a listing supersedes any queued older write
    q = q.filter(o => !(o.kind === 'put' && o.listing.id === op.listing.id))
  } else if (op.kind === 'delete') {
    q = q.filter(o => !(o.kind === 'put' && o.listing.id === op.id) && !(o.kind === 'delete' && o.id === op.id))
  } else {
    q = q.filter(o => o.kind !== 'settings')
  }
  return [...q, op]
}

// Removes one op (matched by value) from stored queue, leaving anything enqueued since.
export function removeOp(storage: KeyValueStorage, key: string, op: QueuedOp) {
  const target = JSON.stringify(op)
  const q = loadQueue(storage, key)
  const i = q.findIndex(o => JSON.stringify(o) === target)
  if (i >= 0) saveQueue(storage, key, [...q.slice(0, i), ...q.slice(i + 1)])
}

// Ids with a pending local edit — the poll merge must not clobber these.
export function pendingListingIds(q: QueuedOp[]): Set<string> {
  const ids = new Set<string>()
  for (const op of q) {
    if (op.kind === 'put') ids.add(op.listing.id)
    if (op.kind === 'delete') ids.add(op.id)
  }
  return ids
}

export type FlushResult = { remaining: QueuedOp[]; authFailed: boolean; hadError: boolean }

// Flush serially, oldest first. Stop at the first retryable failure so order
// is preserved; drop ops the server permanently rejects (4xx other than 401).
// `onDone` is called for each op that leaves the queue, so the caller can remove
// just that op from storage: rewriting the whole queue would erase edits made mid-flush.
export async function flushQueue(
  q: QueuedOp[],
  send: (op: QueuedOp) => Promise<unknown>,
  onDone: (op: QueuedOp) => void,
): Promise<FlushResult> {
  let authFailed = false
  let hadError = false

  while (q.length > 0) {
    try {
      await send(q[0])
      onDone(q[0])
      q = q.slice(1)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        authFailed = true
      } else if (err instanceof ApiError && err.status >= 400 && err.status < 500 && err.status !== 429) {
        // Permanently rejected (malformed, unknown board): keeping it would wedge
        // the queue forever. Drop it and move on.
        onDone(q[0])
        q = q.slice(1)
        hadError = true
        continue
      } else {
        hadError = true // network / 5xx / 429: keep and retry later
      }
      break
    }
  }
  return { remaining: q, authFailed, hadError }
}
