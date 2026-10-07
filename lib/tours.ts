import { Criteria, Listing } from './types'

const DAY = 24 * 60 * 60 * 1000

// Local midnight at the start of the day containing `now`.
export function startOfDay(now: number): number {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

// A booked tour is past due once its day has ended: the status still says
// 'Tour booked' but the tour was on an earlier day, so someone needs to mark it
// Toured, Passed, or reschedule. Tours earlier today aren't past due yet; they
// still show under today on To do's week strip. Other statuses are never past due.
export function isPastDue(l: Listing, now: number): boolean {
  if (l.status !== 'Tour booked') return false
  const t = Date.parse(l.tourAt)
  return !isNaN(t) && t < startOfDay(now)
}

// What To do lists, as queues of listings. Each listing lands in the queue for
// the next thing someone has to do about it; tours also get a calendar.
export function todoQueues(listings: Listing[], now: number) {
  const active = listings.filter(l => l.status !== 'Passed' && l.status !== 'Approved')
  const today = startOfDay(now)
  const weekEnd = today + 7 * DAY
  // Every listing with a tour on the calendar, booked or already held.
  const booked = listings.filter(l => l.status === 'Tour booked' || (l.tourAt && l.status !== 'Passed'))
  const timed = booked
    .map(l => ({ l, t: Date.parse(l.tourAt) }))
    .filter(x => !isNaN(x.t))
    .sort((a, b) => a.t - b.t)
  return {
    pastDue: active.filter(l => isPastDue(l, now)).sort((a, b) => Date.parse(a.tourAt) - Date.parse(b.tourAt)),
    thisWeek: timed.filter(x => x.t >= today && x.t < weekEnd),
    later: timed.filter(x => x.t >= weekEnd),
    unscheduled: booked.filter(l => isNaN(Date.parse(l.tourAt))),
    leads: active.filter(l => l.status === 'Lead'),
    quiet: active
      .filter(l => l.status === 'Inquired' && l.inquiredAt > 0 && now - l.inquiredAt > DAY)
      .sort((a, b) => a.inquiredAt - b.inquiredAt),
    replied: active.filter(l => l.status === 'Replied'),
    deciding: active.filter(l => l.status === 'Toured' || l.status === 'Applied'),
    waiting: active
      .filter(l => l.status === 'Inquired' && (l.inquiredAt === 0 || now - l.inquiredAt <= DAY))
      .sort((a, b) => a.inquiredAt - b.inquiredAt),
  }
}

// The number on the To do tab: things someone has to act on.
export function todoCount(listings: Listing[], now: number): number {
  const q = todoQueues(listings, now)
  return q.pastDue.length + q.leads.length + q.quiet.length + q.replied.length
}

// The weekday nobody can tour (0 = Sunday), or -1. It only counts while it has a reason.
export function blockedDay(c: Criteria): number {
  return c.blockedDayLabel.trim() ? c.blockedDay : -1
}
