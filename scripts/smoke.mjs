// Smoke test against a RUNNING dev server (npm run dev in another terminal).
//   node scripts/smoke.mjs            — API round-trip + passcode gate
//   node scripts/smoke.mjs --parse    — also hit /api/parse with a sample paste (real API call, ~1-3¢)
// Reads BOARD_ID and BOARD_PASSCODE from .env.local.

import { readFileSync } from 'node:fs'

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000'
const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^"|"$/g, '')]),
)
const BOARD = env.BOARD_ID
const PASS = env.BOARD_PASSCODE
if (!BOARD || !PASS) {
  console.error('BOARD_ID / BOARD_PASSCODE missing from .env.local')
  process.exit(1)
}

let failures = 0
function check(name, ok, extra = '') {
  console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ` — ${extra}` : ''}`)
  if (!ok) failures++
}

const api = (path, opts = {}, pass = PASS) =>
  fetch(`${BASE}${path}`, {
    ...opts,
    headers: { 'content-type': 'application/json', ...(pass ? { 'x-board-pass': pass } : {}), ...(opts.headers ?? {}) },
  })

// --- passcode gate ---------------------------------------------------------
{
  const noPass = await api(`/api/board/${BOARD}`, {}, null)
  check('GET without passcode is rejected (401)', noPass.status === 401, `got ${noPass.status}`)
  const badPass = await api(`/api/board/${BOARD}`, {}, 'wrong-pass')
  check('GET with wrong passcode is rejected (401)', badPass.status === 401, `got ${badPass.status}`)
  const wrongBoard = await api(`/api/board/not-the-board`)
  check('Unknown board id is rejected (404)', wrongBoard.status === 404, `got ${wrongBoard.status}`)
}

// --- listing round-trip ----------------------------------------------------
const id = `smoke-${Date.now()}`
const listing = {
  id,
  name: 'Smoke Test Bldg', address: '1 Test St', hood: 'Testville', url: 'https://example.com',
  source: 'smoke', landlordType: 'Property mgmt', priceBasis: 'base',
  feesMonthly: '150', parkingMonthly: '250', parkingAvail: 'yes',
  feesOneTime: '', feesPaid: '', commuteMin: '25', scores: '',
  status: 'Lead', tourAt: '', inquiredAt: 0, contact: '', hook: '', askAbout: '',
  nextAction: '', mediaUrl: '', notes: '', owner: 'Both', myScore: 0, companionScore: 0,
  units: [{ id: 'u1', label: '1bd', sqft: '700', rent: '3200', avail: 'Now', note: '', target: true }],
  updatedAt: 0,
}
{
  const put = await api(`/api/board/${BOARD}/listing/${id}`, { method: 'PUT', body: JSON.stringify(listing) })
  check('PUT listing succeeds', put.status === 200, `got ${put.status}`)

  const got = await (await api(`/api/board/${BOARD}`)).json()
  const found = got.listings?.find(l => l.id === id)
  check('GET board returns the listing', !!found)
  check('Round-tripped listing keeps unit data', found?.units?.[0]?.rent === '3200')
  check('Server stamped updatedAt', (found?.updatedAt ?? 0) > 0)

  const del = await api(`/api/board/${BOARD}/listing/${id}`, { method: 'DELETE' })
  check('DELETE listing succeeds', del.status === 200, `got ${del.status}`)
  const after = await (await api(`/api/board/${BOARD}`)).json()
  check('Listing gone after delete', !after.listings?.some(l => l.id === id))
}

// --- parse (optional: real Anthropic call) ---------------------------------
if (process.argv.includes('--parse')) {
  const sample = `
    The Northpoint | Apartments in San Francisco, CA
    2211 Stockton Street, San Francisco, CA 94133 — North Beach
    Floor plans starting at $3,095. Move-in ready.
    Unit N-344 · 1 Bed / 1 Bath · 710 sq ft · $3,250/mo · Available Sep 18
    Unit S-102 · 1 Bed / 1 Bath · 685 sq ft · $3,095/mo · Available Now
    Required monthly fees: utility package $135/mo (water, trash, internet).
    Parking available: reserved garage $325/mo.
    Application fee $52 per applicant. Holding deposit $500, refundable if not approved.
    Professionally managed by Northpoint Living. Contact our leasing office: (415) 555-0134.
    Rooftop deck with full bay views. Pet friendly (cats only). 12-month lease.
  `
  console.log('… calling /api/parse (few seconds, real API call)')
  const res = await api('/api/parse', {
    method: 'POST',
    body: JSON.stringify({ pageText: sample, url: 'https://www.zillow.com/apartments/the-northpoint' }),
  })
  check('POST /api/parse returns 200', res.status === 200, `got ${res.status}`)
  if (res.status === 200) {
    const { parsed } = await res.json()
    check('parse: valid structured JSON', !!parsed && Array.isArray(parsed.units))
    check('parse: found both units', parsed.units.length === 2, `got ${parsed.units?.length}`)
    const rents = parsed.units.map(u => u.rent).sort()
    check('parse: extracted rents', rents.join(',') === '3095,3250', rents.join(','))
    const sqfts = parsed.units.map(u => u.sqft).sort()
    check('parse: extracted sq ft', sqfts.join(',') === '685,710', sqfts.join(','))
    check('parse: landlord type is Property mgmt', parsed.landlordType === 'Property mgmt', parsed.landlordType)
    check('parse: monthly fees found', parsed.feesMonthly === '135', parsed.feesMonthly)
    check('parse: parking rate found', parsed.parkingMonthly === '325', parsed.parkingMonthly)
  }
} else {
  console.log('(skipping /api/parse — run with --parse to test it against the real API)')
}

console.log(failures === 0 ? '\nAll smoke checks passed.' : `\n${failures} check(s) FAILED`)
process.exit(failures === 0 ? 0 : 1)
