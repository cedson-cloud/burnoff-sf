// How a listing reads on screen: factor values in real units and a one-line
// standing in words. Display only; scoring and status rules live in lib/.
import { usd } from '@/lib/format'
import { Factor, ScoreResult, num } from '@/lib/score'
import { isPastDue } from '@/lib/tours'
import { Listing, ListingStatus } from '@/lib/types'

// Whole dollars on screen: $4,720.
export const money = (n: number) => usd(Math.round(n))

// Square feet, everywhere: short enough to fit a fifth of a phone.
export const sqft = (n: number) => `${n} ft²`

// The factor in the units people think in: "$4,720", "22 min", "940 ft²", "Nov 11".
// Unknown factors read "?" so they never rely on the fog color alone.
export function factorValue(l: Listing, s: ScoreResult, f: Factor): string {
  if (f.unknown) return '?'
  switch (f.key) {
    case 'cost':
      return s.allIn === null ? '?' : money(s.allIn)
    case 'parking': {
      if (l.parkingAvail === 'no') return 'None'
      // "Included" only when the listing says $0; a blank price is just "Yes".
      const p = num(l.parkingMonthly)
      return p === null ? 'Yes' : p === 0 ? 'Included' : money(p)
    }
    case 'commute':
      return `${num(l.commuteMin)} min`
    case 'size': {
      const sq = num(s.unit?.sqft)
      return sq === null ? '?' : sqft(sq) // no thousands comma: it has to fit a fifth of a phone
    }
    case 'timing':
      return s.unit?.avail || '?'
  }
}

export function unknownNames(s: ScoreResult): string[] {
  return s.factors.filter(f => f.unknown).map(f => f.label.toLowerCase())
}

// "parking, commute and size"
export function listWords(words: string[]): string {
  return words.length > 1 ? `${words.slice(0, -1).join(', ')} and ${words.at(-1)}` : words[0] ?? ''
}

// Dates and times in US format everywhere: "Tue", "Tue, Oct 6", "Tuesday, Oct 6",
// "5:30 PM" and "Tue, Oct 6, 5:30 PM".
export const formatWeekday = (t: number) => new Date(t).toLocaleDateString('en-US', { weekday: 'short' })
export const formatDay = (t: number) =>
  new Date(t).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
export const formatDayLong = (t: number) =>
  new Date(t).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
export const formatTime = (t: number) =>
  new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
export const formatDayTime = (t: number) => `${formatDay(t)}, ${formatTime(t)}`

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// "5 hours ago", "3 days ago"
export function ago(ms: number): string {
  const h = Math.round(ms / 3600e3)
  if (h < 48) return `${h} ${h === 1 ? 'hour' : 'hours'} ago`
  return `${Math.round(h / 24)} days ago`
}

// "Fri 6 PM", for a tour on a card.
function tourWhen(tourAt: string): string {
  const d = new Date(tourAt)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString('en-US', {
    weekday: 'short', hour: 'numeric', ...(d.getMinutes() ? { minute: '2-digit' } : {}),
  })
}

type Standing = { text: string; tone: 'plain' | 'alarm' | 'good' }

// Where the listing stands, in words a newcomer can read.
export function standing(l: Listing, now = Date.now()): Standing {
  if (isPastDue(l, now)) return { text: `Tour was ${tourWhen(l.tourAt)}. How did it go?`, tone: 'alarm' }
  switch (l.status) {
    case 'Lead': return { text: 'Not contacted yet', tone: 'plain' }
    case 'Inquired': return { text: 'Message sent, waiting to hear back', tone: 'plain' }
    case 'Replied': return { text: 'They replied', tone: 'plain' }
    case 'Tour booked': return { text: l.tourAt ? `Tour ${tourWhen(l.tourAt)}` : 'Tour booked, no time set', tone: 'plain' }
    case 'Toured': return { text: 'Toured', tone: 'plain' }
    case 'Applied': return { text: 'Applied', tone: 'plain' }
    case 'Approved': return { text: 'Approved', tone: 'good' }
    case 'Passed': return { text: 'Passed', tone: 'plain' }
  }
}

// What to do when nobody has written a next action yet.
export const SUGGESTED_NEXT: Record<ListingStatus, string> = {
  'Lead': 'Send the first message',
  'Inquired': 'Wait for a reply. Nudge them if it’s been a day.',
  'Replied': 'Book a tour',
  'Tour booked': 'Go to the tour',
  'Toured': 'Decide, then apply or pass',
  'Applied': 'Wait to hear back on the application',
  'Approved': 'Sign the lease',
  'Passed': '',
}
