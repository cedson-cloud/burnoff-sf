import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { BoardData, DEFAULT_SETTINGS, Listing, Settings, emptyListing } from '../types'
import { ApiError } from './api'
import { QueuedOp, coalesce, loadQueue } from './queue'
import { RemoteApi, mergeServerListings, remoteStore } from './store'

const listing = (id: string, name = id): Listing => ({ ...emptyListing(), id, name })
const put = (l: Listing, ts = 1): QueuedOp => ({ kind: 'put', listing: l, ts })

function memoryStorage() {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }
}

// A fake server. `fail` makes every write (or the read) throw the given error.
function fakeServer(initial: Listing[] = []) {
  const rows = new Map(initial.map(l => [l.id, l]))
  let settings: Settings = DEFAULT_SETTINGS
  const s = {
    rows,
    failWrites: null as ApiError | null,
    failRead: null as ApiError | null,
    rejectIds: new Set<string>(), // listings the server refuses with a 400
    // Runs once, inside the next write, before it completes.
    duringWrite: null as (() => void) | null,
    writes: [] as string[],
    api: {
      fetchBoard: async (): Promise<BoardData> => {
        if (s.failRead) throw s.failRead
        return { listings: [...rows.values()], settings, serverTime: 0 }
      },
      putListing: async (l): Promise<void> => {
        if (s.rejectIds.has(l.id)) throw new ApiError(400, 'Malformed listing')
        return write(`put ${l.id}`, () => rows.set(l.id, l))
      },
      deleteListing: async id => write(`delete ${id}`, () => rows.delete(id)),
      putSettings: async x => write('settings', () => (settings = x)),
    } satisfies RemoteApi,
  }
  async function write(label: string, apply: () => void): Promise<void> {
    const hook = s.duringWrite
    s.duringWrite = null
    hook?.()
    if (s.failWrites) throw s.failWrites
    s.writes.push(label)
    apply()
  }
  return s
}

const setup = (server = fakeServer(), storage = memoryStorage()) => {
  const store = remoteStore({ boardId: 'b', api: server.api, storage, now: () => 1000, watch: () => () => {} })
  return { server, storage, store, queue: () => loadQueue(storage, 'queue:b') }
}

describe('coalesce', () => {
  test('a newer put for the same listing replaces the queued one', () => {
    const q = coalesce([put(listing('a', 'old')), put(listing('b'))], put(listing('a', 'new'), 2))
    assert.deepEqual(q.map(o => o.kind === 'put' && o.listing.name), ['b', 'new'])
  })
  test('a delete drops queued puts for that listing', () => {
    const q = coalesce([put(listing('a'))], { kind: 'delete', id: 'a', ts: 2 })
    assert.deepEqual(q.map(o => o.kind), ['delete'])
  })
  test('only the latest settings write is kept', () => {
    const s = (ts: number): QueuedOp => ({ kind: 'settings', settings: DEFAULT_SETTINGS, ts })
    assert.deepEqual(coalesce([s(1)], s(2)).map(o => o.ts), [2])
  })
})

describe('mergeServerListings', () => {
  test('server wins for listings with no pending edit', () => {
    const merged = mergeServerListings({ a: listing('a', 'local') }, [listing('a', 'server')], [])
    assert.equal(merged.a.name, 'server')
  })
  test('a pending put beats the server copy', () => {
    const mine = listing('a', 'mine')
    const merged = mergeServerListings({ a: mine }, [listing('a', 'server')], [put(mine)])
    assert.equal(merged.a.name, 'mine')
  })
  test('a pending delete keeps the listing gone', () => {
    const merged = mergeServerListings({}, [listing('a')], [{ kind: 'delete', id: 'a', ts: 1 }])
    assert.equal(merged.a, undefined)
  })
})

describe('remoteStore', () => {
  test('loads the board and becomes ready', async () => {
    const { store } = setup(fakeServer([listing('a')]))
    await store.refresh()
    const s = store.getSnapshot()
    assert.equal(s.access, 'ready')
    assert.deepEqual(s.listings.map(l => l.id), ['a'])
    assert.equal(s.sync?.status, 'idle')
  })

  test('an edit shows immediately, is queued, and is sent on sync', async () => {
    const { server, store, queue } = setup()
    server.failWrites = server.failRead = new ApiError(0, 'Network error')
    store.upsertListing(listing('a', 'mine'))
    assert.equal(store.getSnapshot().listings[0].name, 'mine')
    await store.refresh()
    assert.equal(store.getSnapshot().sync?.status, 'offline')
    assert.equal(queue().length, 1, 'kept in storage while offline')

    server.failWrites = server.failRead = null
    await store.refresh()
    assert.equal(server.rows.get('a')?.name, 'mine')
    assert.equal(queue().length, 0)
    assert.equal(store.getSnapshot().sync?.pending, 0)
  })

  test('a poll does not overwrite a listing with a pending edit', async () => {
    const { server, store } = setup(fakeServer([listing('a', 'server')]))
    await store.refresh()
    server.failWrites = new ApiError(503, 'Unavailable')
    store.upsertListing(listing('a', 'mine'))
    await store.refresh()
    assert.equal(store.getSnapshot().listings[0].name, 'mine')
    assert.ok(store.getSnapshot().pendingIds.has('a'))
    assert.equal(store.getSnapshot().sync?.status, 'error')
  })

  test('queued settings are not replaced by the server copy', async () => {
    const { server, store } = setup()
    server.failWrites = new ApiError(0, 'Network error')
    const mine = { ...DEFAULT_SETTINGS, profile: { ...DEFAULT_SETTINGS.profile, yourName: 'Me' } }
    store.saveSettings(mine)
    server.failWrites = new ApiError(503, 'Unavailable')
    await store.refresh()
    assert.equal(store.getSnapshot().settings.profile.yourName, 'Me')
  })

  test('an edit made while a write is in flight survives the flush', async () => {
    const { server, store, queue } = setup()
    server.failWrites = new ApiError(0, 'Network error')
    store.upsertListing(listing('a'))
    await store.refresh()

    server.failWrites = null
    server.duringWrite = () => store.upsertListing(listing('b'))
    await store.refresh()
    // Removing the sent op must not rewrite storage over b, and b goes out without waiting for a poll.
    assert.deepEqual(server.writes, ['put a', 'put b'])
    assert.equal(queue().length, 0)
  })

  test('stops at the first retryable failure so writes stay in order', async () => {
    const { server, store, queue } = setup()
    server.failWrites = new ApiError(500, 'Boom')
    store.upsertListing(listing('a'))
    store.upsertListing(listing('b'))
    await store.refresh()
    assert.deepEqual(server.writes, [])
    assert.deepEqual(queue().map(o => o.kind === 'put' && o.listing.id), ['a', 'b'])
  })

  test('drops a write the server permanently rejects and sends the rest', async () => {
    const { server, store, queue } = setup()
    server.rejectIds.add('a')
    store.upsertListing(listing('a'))
    store.upsertListing(listing('b'))
    await store.refresh()
    assert.deepEqual(server.writes, ['put b'])
    assert.equal(queue().length, 0)
  })

  test('a 401 locks the store, and a locked store stops syncing', async () => {
    const { server, store } = setup()
    server.failRead = new ApiError(401, 'Unauthorized')
    await store.refresh()
    assert.equal(store.getSnapshot().access, 'locked')
    server.failRead = null
    await store.refresh()
    assert.equal(store.getSnapshot().access, 'locked')
  })

  test('a 401 while flushing locks the store and keeps the edit queued', async () => {
    const { server, store, queue } = setup()
    server.failWrites = new ApiError(401, 'Unauthorized')
    store.upsertListing(listing('a'))
    await store.refresh()
    assert.equal(store.getSnapshot().access, 'locked')
    assert.equal(queue().length, 1)
  })

  test('a failed first load is unreachable, not locked', async () => {
    const { server, store } = setup()
    server.failRead = new ApiError(500, 'Redis down')
    await store.refresh()
    assert.deepEqual(store.getSnapshot().access, { unreachable: 'Redis down' })
    server.failRead = null
    await store.refresh()
    assert.equal(store.getSnapshot().access, 'ready')
  })

  test('a retry that fails differently updates the unreachable reason', async () => {
    const { server, store } = setup()
    server.failRead = new ApiError(500, 'Redis down')
    await store.refresh()
    server.failRead = new ApiError(0, 'Network error')
    await store.refresh()
    assert.deepEqual(store.getSnapshot().access, { unreachable: 'Network error' })
    assert.equal(store.getSnapshot().sync?.status, 'offline')
  })

  test('a 404 before the first load means the board is missing', async () => {
    const { server, store } = setup()
    server.failRead = new ApiError(404, 'Unknown board')
    await store.refresh()
    assert.equal(store.getSnapshot().access, 'missing')
  })

  test('a missing board stops syncing', async () => {
    const { server, store } = setup()
    server.failRead = new ApiError(404, 'Unknown board')
    await store.refresh()
    server.failRead = null
    await store.refresh()
    assert.equal(store.getSnapshot().access, 'missing')
  })

  test('a 404 on a queued write keeps the edit queued', async () => {
    const { server, store, queue } = setup(fakeServer([listing('a')]))
    await store.refresh()
    server.failWrites = new ApiError(404, 'Unknown board')
    store.upsertListing(listing('b'))
    await store.refresh()
    assert.equal(queue().length, 1)
    assert.equal(store.getSnapshot().access, 'ready')
  })

  test('a 404 after the board has loaded keeps it ready', async () => {
    const { server, store } = setup(fakeServer([listing('a')]))
    await store.refresh()
    server.failRead = new ApiError(404, 'Unknown board')
    await store.refresh()
    assert.equal(store.getSnapshot().access, 'ready')
  })

  test('only a 401 locks: a retry from unreachable can still lock', async () => {
    const { server, store } = setup()
    for (const status of [0, 429, 500, 503]) {
      server.failRead = new ApiError(status, `status ${status}`)
      await store.refresh()
      assert.notEqual(store.getSnapshot().access, 'locked', `status ${status}`)
    }
    server.failRead = new ApiError(401, 'Unauthorized')
    await store.refresh()
    assert.equal(store.getSnapshot().access, 'locked')
  })

  test('a failure after the board has loaded keeps it ready', async () => {
    const { server, store } = setup(fakeServer([listing('a')]))
    await store.refresh()
    server.failRead = new ApiError(503, 'Unavailable')
    await store.refresh()
    assert.equal(store.getSnapshot().access, 'ready')
    assert.equal(store.getSnapshot().sync?.status, 'error')
  })

  test('the snapshot object is stable until something changes', async () => {
    const { store } = setup()
    await store.refresh()
    const a = store.getSnapshot()
    assert.equal(store.getSnapshot(), a)
    store.upsertListing(listing('x'))
    assert.notEqual(store.getSnapshot(), a)
  })

  test('first subscriber starts watching, last one stops it', () => {
    let watching = 0
    const store = remoteStore({
      boardId: 'b', api: fakeServer().api, storage: memoryStorage(),
      watch: () => (watching++, () => watching--),
    })
    const off1 = store.subscribe(() => {})
    const off2 = store.subscribe(() => {})
    assert.equal(watching, 1)
    off1()
    assert.equal(watching, 1)
    off2()
    assert.equal(watching, 0)
  })

  test('picks up writes queued by an earlier session', async () => {
    const storage = memoryStorage()
    storage.setItem('queue:b', JSON.stringify([put(listing('a', 'from last time'))]))
    const { server, store } = setup(fakeServer(), storage)
    assert.equal(store.getSnapshot().sync?.pending, 1)
    await store.refresh()
    assert.equal(server.rows.get('a')?.name, 'from last time')
  })
})
