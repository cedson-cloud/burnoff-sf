import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { Listing, emptyListing } from './types'
import { isPastDue } from './tours'

const now = new Date(2026, 9, 6, 14, 0).getTime() // Oct 6, 2pm local
const tour = (tourAt: string, status: Listing['status'] = 'Tour booked'): Listing =>
  ({ ...emptyListing(), id: 'a', status, tourAt })

describe('isPastDue', () => {
  test('a booked tour on an earlier day is past due', () => {
    assert.equal(isPastDue(tour('2026-10-05T23:30'), now), true)
  })
  test('a booked tour earlier today is not past due yet', () => {
    assert.equal(isPastDue(tour('2026-10-06T09:00'), now), false)
  })
  test('a future tour is not past due', () => {
    assert.equal(isPastDue(tour('2026-10-08T10:00'), now), false)
  })
  test('an old tour in another status is not past due', () => {
    assert.equal(isPastDue(tour('2026-10-01T10:00', 'Toured'), now), false)
  })
  test('a missing or unparseable time is not past due', () => {
    assert.equal(isPastDue(tour(''), now), false)
    assert.equal(isPastDue(tour('sometime Tuesday'), now), false)
  })
})
