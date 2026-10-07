import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { normalizeBoardData } from './board-data'
import { demoSeed } from './demo-seed'
import { household } from './household'
import { scoreListing } from './score'
import { isPastDue } from './tours'

const today = new Date(2026, 9, 6, 14, 0) // Oct 6, 2pm local
const seed = demoSeed(today)
const { criteria } = seed.settings

describe('demoSeed', () => {
  test('has 8–10 listings with unique ids and a mix of statuses', () => {
    assert.ok(seed.listings.length >= 8 && seed.listings.length <= 10)
    assert.equal(new Set(seed.listings.map(l => l.id)).size, seed.listings.length)
    assert.ok(new Set(seed.listings.map(l => l.status)).size >= 5)
  })

  test('is pure: the same day gives the same board', () => {
    assert.deepEqual(demoSeed(new Date(today)), seed)
  })

  test('survives normalizeBoardData unchanged', () => {
    assert.deepEqual(normalizeBoardData(JSON.parse(JSON.stringify(seed))), seed)
  })

  test('is a pair search, not solo', () => {
    assert.equal(household(seed.settings.profile).solo, false)
  })

  test('has exactly one past-due tour', () => {
    const due = seed.listings.filter(l => isPastDue(l, today.getTime()))
    assert.deepEqual(due.map(l => l.id), ['demo-sourdough'])
  })

  test('has an upcoming booked tour', () => {
    assert.ok(seed.listings.some(l => l.status === 'Tour booked' && Date.parse(l.tourAt) > today.getTime()))
  })

  test('scores sensibly, with some unknowns flagged', () => {
    const scores = seed.listings.map(l => scoreListing(l, criteria, today))
    for (const s of scores) assert.ok(s.total >= 0 && s.total <= 100)
    const totals = scores.map(s => s.total)
    assert.ok(Math.max(...totals) >= 75, `a strong option exists: ${totals}`)
    assert.ok(Math.max(...totals) - Math.min(...totals) >= 25, `scores are spread out: ${totals}`)
    assert.ok(scores.filter(s => s.factors.some(f => f.unknown)).length >= 2, 'some listings show fog')
    assert.ok(scores.some(s => s.allIn === null), 'one listing has no rent')
    assert.ok(scores.filter(s => s.allIn !== null).every(s => s.allIn! < criteria.hardCeiling + 500))
  })

  test('contains nothing that looks like real contact data', () => {
    const text = JSON.stringify(seed)
    for (const m of text.matchAll(/\(\d{3}\) (\d{3})-(\d{4})/g)) {
      assert.ok(m[1] === '555' && m[2].startsWith('01'), `fictional phone range: ${m[0]}`)
    }
    for (const m of text.matchAll(/https?:\/\/([^/"]+)/g)) assert.equal(m[1], 'example.com')
    for (const m of text.matchAll(/[\w.]+@([\w.]+)/g)) assert.equal(m[1], 'example.com')
  })
})
