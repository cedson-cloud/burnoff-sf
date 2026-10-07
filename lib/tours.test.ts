import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { DEFAULT_SETTINGS, Listing, emptyListing } from './types'
import { blockedDay, isPastDue, todoCount, todoQueues } from './tours'

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

describe('todoQueues', () => {
  const HOUR = 3600e3
  const l = (id: string, patch: Partial<Listing>): Listing => ({ ...emptyListing(), id, ...patch })
  const board = [
    l('lead', { status: 'Lead' }),
    l('fresh', { status: 'Inquired', inquiredAt: now - 2 * HOUR }),
    l('quiet', { status: 'Inquired', inquiredAt: now - 30 * HOUR }),
    l('replied', { status: 'Replied' }),
    l('past', { status: 'Tour booked', tourAt: '2026-10-04T10:00' }),
    l('soon', { status: 'Tour booked', tourAt: '2026-10-08T10:00' }),
    l('later', { status: 'Tour booked', tourAt: '2026-10-20T10:00' }),
    l('notime', { status: 'Tour booked' }),
    l('toured', { status: 'Toured' }),
    l('passed', { status: 'Passed' }),
    l('approved', { status: 'Approved' }),
  ]
  const ids = (xs: (Listing | { l: Listing })[]) => xs.map(x => ('l' in x ? x.l : x).id)

  test('each listing lands in the queue for what to do next', () => {
    const q = todoQueues(board, now)
    assert.deepEqual(ids(q.leads), ['lead'])
    assert.deepEqual(ids(q.waiting), ['fresh'])
    assert.deepEqual(ids(q.quiet), ['quiet'])
    assert.deepEqual(ids(q.replied), ['replied'])
    assert.deepEqual(ids(q.pastDue), ['past'])
    assert.deepEqual(ids(q.thisWeek), ['soon'])
    assert.deepEqual(ids(q.later), ['later'])
    assert.deepEqual(ids(q.unscheduled), ['notime'])
    assert.deepEqual(ids(q.deciding), ['toured'])
  })
  test('Passed and Approved listings need nothing', () => {
    const all = Object.values(todoQueues(board, now)).flat()
    assert.ok(!ids(all).includes('passed') && !ids(all).includes('approved'))
  })
  test('the tab counts what someone has to act on', () => {
    assert.equal(todoCount(board, now), 4) // past due, lead, quiet, replied
  })
})

describe('blockedDay', () => {
  const c = DEFAULT_SETTINGS.criteria
  test('a day only counts while it has a reason', () => {
    assert.equal(blockedDay({ ...c, blockedDay: 3, blockedDayLabel: '' }), -1)
    assert.equal(blockedDay({ ...c, blockedDay: 3, blockedDayLabel: 'Work shift' }), 3)
  })
})
