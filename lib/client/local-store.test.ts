import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { demoSeed } from '../demo-seed'
import { DEFAULT_SETTINGS, Listing, emptyListing } from '../types'
import { LOCAL_BOARD_KEY, localStore } from './local-store'

const listing = (id: string, name = id): Listing => ({ ...emptyListing(), id, name })
const seed = demoSeed(new Date(2026, 9, 6, 14, 0))

function memoryStorage() {
  const m = new Map<string, string>()
  return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }
}

const throwingStorage = {
  getItem: (): string | null => { throw new Error('SecurityError') },
  setItem: () => { throw new Error('QuotaExceededError') },
}

const setup = (storage = memoryStorage()) => ({ storage, store: localStore({ storage, seed, now: () => 1000 }) })
const ids = (s: ReturnType<typeof localStore>) => s.getSnapshot().listings.map(l => l.id).sort()

describe('localStore', () => {
  test('starts ready from the seed, with no sync', () => {
    const { store } = setup()
    const s = store.getSnapshot()
    assert.equal(s.access, 'ready')
    assert.equal(s.sync, null)
    assert.equal(s.pendingIds.size, 0)
    assert.deepEqual(ids(store), seed.listings.map(l => l.id).sort())
    assert.deepEqual(s.settings, seed.settings)
  })

  test('writes round-trip through storage into a new store', () => {
    const { storage, store } = setup()
    store.upsertListing(listing('new', 'Fresh'))
    store.removeListing('demo-yards')
    store.saveSettings({ ...seed.settings, criteria: { ...seed.settings.criteria, minSqft: 999 } })
    assert.ok(storage.m.has(LOCAL_BOARD_KEY), 'uses its own key')
    assert.ok(![...storage.m.keys()].some(k => k.startsWith('queue:')), 'never touches remoteStore keys')

    const again = localStore({ storage, seed })
    const s = again.getSnapshot()
    assert.equal(s.listings.find(l => l.id === 'new')?.name, 'Fresh')
    assert.equal(s.listings.some(l => l.id === 'demo-yards'), false)
    assert.equal(s.settings.criteria.minSqft, 999)
  })

  test('stamps updatedAt on listings and settings', () => {
    const { store } = setup()
    store.upsertListing(listing('a'))
    store.saveSettings(DEFAULT_SETTINGS)
    const s = store.getSnapshot()
    assert.equal(s.listings.find(l => l.id === 'a')?.updatedAt, 1000)
    assert.equal(s.settings.updatedAt, 1000)
  })

  test('falls back to the seed when stored data is unreadable', () => {
    for (const bad of ['{not json', '"hello"', '{}', '{"listings":[{"nope":1}],"settings":{}}']) {
      const storage = memoryStorage()
      storage.setItem(LOCAL_BOARD_KEY, bad)
      assert.equal(setup(storage).store.getSnapshot().listings.length, seed.listings.length, bad)
    }
  })

  test('normalizes stored data on load, including old field names', () => {
    const storage = memoryStorage()
    const { companionScore: _, ...rest } = listing('old')
    const old = { ...rest, owner: 'Partner', partnerScore: 3 }
    storage.setItem(LOCAL_BOARD_KEY, JSON.stringify({ listings: [old], settings: { profile: { partnerName: 'Sam' } } }))
    const s = setup(storage).store.getSnapshot()
    assert.equal(s.listings[0].owner, 'Companion')
    assert.equal(s.listings[0].companionScore, 3)
    assert.equal(s.settings.profile.companionName, 'Sam')
    assert.equal(s.settings.profile.yourName, '', 'missing profile fields get defaults')
  })

  test('keeps working in memory when storage throws', () => {
    const store = localStore({ storage: throwingStorage, seed })
    assert.equal(store.getSnapshot().listings.length, seed.listings.length)
    store.upsertListing(listing('a', 'mine'))
    store.removeListing('demo-fogbank')
    store.reset()
    store.upsertListing(listing('b'))
    assert.ok(ids(store).includes('b'))
    assert.ok(store.importJSON(store.exportJSON()).ok)
  })

  test('the snapshot object is stable until something changes', () => {
    const { store } = setup()
    const a = store.getSnapshot()
    assert.equal(store.getSnapshot(), a)
    void store.refresh()
    assert.equal(store.getSnapshot(), a, 'refresh is a no-op')
    store.removeListing('no-such-id')
    assert.equal(store.getSnapshot(), a, 'removing a missing listing changes nothing')
    store.upsertListing(listing('a'))
    assert.notEqual(store.getSnapshot(), a)
  })

  test('notifies subscribers on change until they unsubscribe', () => {
    const { store } = setup()
    let calls = 0
    const off = store.subscribe(() => calls++)
    store.upsertListing(listing('a'))
    off()
    store.upsertListing(listing('b'))
    assert.equal(calls, 1)
  })

  test('import rejects garbage and leaves the board alone', () => {
    const { storage, store } = setup()
    store.upsertListing(listing('mine'))
    const before = store.getSnapshot()
    const stored = storage.m.get(LOCAL_BOARD_KEY)
    for (const bad of ['', 'nope', '[]', 'null', '{"listings":[]}', '{"listings":[1,2],"settings":{}}']) {
      const r = store.importJSON(bad)
      assert.equal(r.ok, false, bad)
    }
    assert.equal(store.getSnapshot(), before)
    assert.equal(storage.m.get(LOCAL_BOARD_KEY), stored)
  })

  test('import accepts a valid export from another board', () => {
    const a = setup().store
    a.upsertListing(listing('exported', 'From A'))
    const text = a.exportJSON()

    const { storage, store: b } = setup()
    b.reset()
    b.removeListing('demo-fogbank')
    assert.deepEqual(b.importJSON(text), { ok: true })
    assert.deepEqual(ids(b), ids(a))
    assert.deepEqual(b.getSnapshot().settings, a.getSnapshot().settings)
    assert.equal(localStore({ storage, seed }).getSnapshot().listings.length, ids(a).length, 'persisted')
  })

  test('reset restores the seed', () => {
    const { storage, store } = setup()
    store.upsertListing(listing('a'))
    store.removeListing('demo-fogbank')
    store.saveSettings(DEFAULT_SETTINGS)
    store.reset()
    assert.deepEqual(store.getSnapshot().listings, seed.listings)
    assert.deepEqual(store.getSnapshot().settings, seed.settings)
    assert.deepEqual(localStore({ storage, seed }).getSnapshot().listings, seed.listings)
  })
})
