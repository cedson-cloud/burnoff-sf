import { Listing } from './types'

// Local midnight at the start of the day containing `now`.
export function startOfDay(now: number): number {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

// A booked tour is past due once its day has ended: the status still says
// 'Tour booked' but the tour was on an earlier day, so someone needs to mark it
// Toured, Passed, or reschedule. Tours earlier today aren't past due yet — they
// still show under today in WeekView. Other statuses are never past due.
export function isPastDue(l: Listing, now: number): boolean {
  if (l.status !== 'Tour booked') return false
  const t = Date.parse(l.tourAt)
  return !isNaN(t) && t < startOfDay(now)
}
