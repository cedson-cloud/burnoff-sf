import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'
import { normalizeBoardData } from '../board-data'
import { ParsedListing } from '../parse-schema'
import { SAMPLES } from '../parse-samples'
import { DEFAULT_SETTINGS, emptyListing } from '../types'
import { ApiError } from './api'
import { ParseOutcome, Parser, foundToListing, liveParser, toListing, withSampleFallback } from './parser'

const parsed = (units: ParsedListing['units']): ParsedListing => ({
  name: 'Test Bldg', address: '1 Test St', hood: 'Mission', source: 'direct',
  landlordType: 'Individual', priceBasis: 'all-in', feesMonthly: '120', parkingMonthly: '200',
  parkingAvail: 'yes', feesOneTime: 'Deposit $500', contact: '(415) 555-0100', hook: 'the bay window',
  scores: 'Walk 90', notes: 'Cats OK', units,
})
const unit = (label: string, rent = '3000') => ({ label, sqft: '700', rent, avail: 'Now', note: '' })

// A stable, id-free view of a listing for comparing two toListing results.
const shape = ({ listing }: ParseOutcome) =>
  ({ ...listing, id: '', units: listing.units.map(u => ({ ...u, id: '' })) })

const failing = (err: unknown = new ApiError(502, 'Parse request failed')): Parser =>
  ({ parse: async () => { throw err } })

describe('toListing', () => {
  test('maps parsed fields onto a full listing', () => {
    const p = parsed([unit('1bd')])
    const l = toListing(p, 'https://example.com/a')
    const { units, ...fields } = p
    assert.deepEqual({ ...l, id: '', units: [] }, { ...emptyListing(), ...fields, id: '', url: 'https://example.com/a', units: [] })
    assert.deepEqual(l.units.map(({ id, target, ...u }) => u), units)
    assert.ok(l.id && l.units[0].id)
  })

  test('marks a single unit as the target', () => {
    assert.deepEqual(toListing(parsed([unit('1bd')]), '').units.map(u => u.target), [true])
  })

  test('marks no target when there are several units', () => {
    assert.deepEqual(toListing(parsed([unit('A'), unit('B')]), '').units.map(u => u.target), [false, false])
  })
})

describe('withSampleFallback', () => {
  test('passes a successful result through untouched', async () => {
    const outcome: ParseOutcome = { listing: toListing(parsed([unit('1bd')]), ''), origin: 'claude' }
    const p = withSampleFallback({ parse: async () => outcome }, SAMPLES)
    const got = await p.parse('some text', 'https://example.com')
    assert.equal(got, outcome)
    assert.equal(got.note, undefined)
  })

  test('falls back to the first sample with a note on any rejection', async () => {
    for (const err of [new ApiError(0, 'Network error'), new ApiError(401, 'Unauthorized'), new TypeError('boom')]) {
      const got = await withSampleFallback(failing(err), SAMPLES).parse('an unrelated paste of page text', '')
      assert.equal(got.origin, 'sample')
      assert.ok(got.note && got.note.length > 0)
      assert.deepEqual(shape(got), shape({ listing: toListing(SAMPLES[0].parsed, SAMPLES[0].url), origin: 'sample' }))
    }
  })

  test('picks the sample whose text was pasted, despite whitespace changes', async () => {
    const s = SAMPLES[1]
    const pasted = '\n' + s.text.replace(/\n/g, '\r\n') + '  \n'
    const got = await withSampleFallback(failing(), SAMPLES).parse(pasted, '')
    assert.equal(got.origin, 'sample')
    assert.equal(got.listing.name, s.parsed.name)
    assert.equal(got.listing.url, s.url)
  })

  test('gives each fallback fresh ids', async () => {
    const p = withSampleFallback(failing(), SAMPLES)
    const [a, b] = [await p.parse('x', ''), await p.parse('x', '')]
    assert.notEqual(a.listing.id, b.listing.id)
  })

  test('offers the first sample as samplePaste', () => {
    assert.deepEqual(withSampleFallback(failing(), SAMPLES).samplePaste, { url: SAMPLES[0].url, text: SAMPLES[0].text })
  })
})

describe('SAMPLES', () => {
  test('has 2–3 samples with distinct text', () => {
    assert.ok(SAMPLES.length >= 2 && SAMPLES.length <= 3)
    assert.equal(new Set(SAMPLES.map(s => s.text)).size, SAMPLES.length)
  })

  for (const s of SAMPLES) {
    test(`${s.parsed.name}: precomputed listing survives normalizeBoardData`, () => {
      const l = toListing(s.parsed, s.url)
      const raw = JSON.parse(JSON.stringify({ listings: [l], settings: DEFAULT_SETTINGS }))
      assert.deepEqual(normalizeBoardData(raw).listings, [l])
    })

    test(`${s.parsed.name}: uses only invented contact details`, () => {
      assert.match(s.url, /^https:\/\/[a-z.]*example\.com\//)
      for (const phone of s.text.match(/\(\d{3}\) \d{3}-\d{4}/g) ?? []) assert.match(phone, /555-01\d\d$/)
      for (const email of s.text.match(/\S+@\S+/g) ?? []) assert.match(email, /example\.com$/)
    })

    test(`${s.parsed.name}: precomputed rents and sq ft appear in the page text`, () => {
      const digits = s.text.replace(/,/g, '')
      for (const u of s.parsed.units) {
        if (u.rent) assert.ok(digits.includes(`$${u.rent}`), `rent ${u.rent}`)
        if (u.sqft) assert.ok(digits.includes(`${u.sqft} sq ft`), `sqft ${u.sqft}`)
      }
    })
  }
})

describe('liveParser', () => {
  const realFetch = globalThis.fetch
  afterEach(() => { globalThis.fetch = realFetch })

  function fakeFetch(res: { status: number; body: unknown }) {
    const calls: { url: string; headers: Record<string, string>; body: unknown }[] = []
    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      calls.push({ url, headers: init?.headers as Record<string, string>, body: JSON.parse(String(init?.body)) })
      return new Response(JSON.stringify(res.body), { status: res.status })
    }) as typeof fetch
    return calls
  }

  test('sends the passcode header when pass is set', async () => {
    const calls = fakeFetch({ status: 200, body: { parsed: parsed([unit('1bd')]) } })
    const got = await liveParser('secret').parse('page text', 'https://example.com/a')
    assert.equal(calls[0].url, '/api/parse')
    assert.equal(calls[0].headers['x-board-pass'], 'secret')
    assert.deepEqual(calls[0].body, { pageText: 'page text', url: 'https://example.com/a' })
    assert.equal(got.origin, 'claude')
    assert.equal(got.note, undefined)
    assert.equal(got.listing.name, 'Test Bldg')
  })

  test('omits the passcode header when pass is null', async () => {
    const calls = fakeFetch({ status: 200, body: { parsed: parsed([unit('1bd')]) } })
    await liveParser(null).parse('page text', '')
    assert.ok(!('x-board-pass' in calls[0].headers))
  })

  test("rejects with the server's error message", async () => {
    fakeFetch({ status: 422, body: { error: 'Could not extract listing data from that paste.' } })
    await assert.rejects(liveParser('secret').parse('page text', ''), (e: unknown) =>
      e instanceof ApiError && e.status === 422 && e.message === 'Could not extract listing data from that paste.')
  })
})

describe('find', () => {
  const realFetch = globalThis.fetch
  afterEach(() => { globalThis.fetch = realFetch })
  const found = { ...parsed([unit('204 · 1bd', '5895')]), notes: 'Pets OK', seenUnit: '',
    sources: [{ what: 'Rent $5,895 for unit 204', url: 'https://rentbt.com/listing/204' }],
    askAbout: 'Rent: $5,640 on Redfin vs $5,895 on the manager site. Monthly fees?' }

  test('keeps the sources in the notes and the questions in "Ask about"', () => {
    const l = foundToListing(found, 'https://redf.in/x')
    assert.equal(l.notes, 'Pets OK\n\nFound on the web:\n- Rent $5,895 for unit 204 (https://rentbt.com/listing/204)')
    assert.equal(l.askAbout, found.askAbout)
    assert.equal(l.url, 'https://redf.in/x')
  })

  test('scores the unit the person was looking at', () => {
    const two = { ...found, units: [unit('106 · Studio', '4440'), unit('204 · 1bd', '5640')], seenUnit: '204 · 1bd' }
    assert.deepEqual(foundToListing(two, '').units.map(u => u.target), [false, true])
    assert.deepEqual(foundToListing({ ...two, seenUnit: '' }, '').units.map(u => u.target), [false, false])
  })

  test('the live parser posts the link and details and returns the sources', async () => {
    const calls: { url: string; body: unknown }[] = []
    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      calls.push({ url, body: JSON.parse(String(init?.body)) })
      return new Response(JSON.stringify({ found }), { status: 200 })
    }) as typeof fetch
    const got = await liveParser('secret').find!('https://redf.in/x', '100 Example St')
    assert.deepEqual(calls[0], { url: '/api/find', body: { url: 'https://redf.in/x', details: '100 Example St' } })
    assert.deepEqual(got.sources, found.sources)
  })

  test('the demo fallback never swaps in a sample for a failed lookup', async () => {
    const inner: Parser = { parse: async () => { throw new Error('x') }, find: async () => { throw new ApiError(502, 'down') } }
    await assert.rejects(withSampleFallback(inner, SAMPLES).find!('u', 'details'), (e: unknown) => e instanceof ApiError)
  })
})
