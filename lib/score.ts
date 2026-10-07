import { Criteria, Listing, Unit } from './types'

// Lenient numeric parse: "$3,250/mo" -> 3250, "" -> null
export function num(s: string | number | null | undefined): number | null {
  if (s === null || s === undefined) return null
  if (typeof s === 'number') return isFinite(s) ? s : null
  const m = s.replace(/,/g, '').match(/-?\d+(\.\d+)?/)
  if (!m) return null
  const n = parseFloat(m[0])
  return isFinite(n) ? n : null
}

// The unit that represents the listing: the marked target, else cheapest priced, else first.
export function targetUnit(l: Listing): Unit | null {
  if (!l.units.length) return null
  const t = l.units.find(u => u.target)
  if (t) return t
  const priced = l.units.filter(u => num(u.rent) !== null)
  if (priced.length) return priced.sort((a, b) => num(a.rent)! - num(b.rent)!)[0]
  return l.units[0]
}

// The normalized monthly number. Null when the unit has no rent.
export function allIn(l: Listing, u: Unit | null, c: Criteria): number | null {
  const rent = u ? num(u.rent) : null
  if (rent === null) return null
  const fees = l.priceBasis === 'base' ? (num(l.feesMonthly) ?? 0) : 0
  const parking = c.includeParking ? (num(l.parkingMonthly) ?? 0) : 0
  return rent + fees + parking
}

const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']

// "Now" -> today; "Sep 18" / "September 18" / ISO -> Date; anything else -> null
export function parseAvail(s: string, now = new Date()): Date | null {
  const t = s.trim().toLowerCase()
  if (!t) return null
  if (t === 'now' || t === 'immediately' || t === 'available now' || t === 'today') return now
  const iso = /^\d{4}-\d{2}-\d{2}/.exec(t)
  if (iso) {
    const d = new Date(t.slice(0, 10) + 'T12:00:00')
    return isNaN(d.getTime()) ? null : d
  }
  const m = /([a-z]{3,9})\.?\s+(\d{1,2})/.exec(t) ?? /(\d{1,2})\s+([a-z]{3,9})/.exec(t)
  if (m) {
    const [a, b] = [m[1], m[2]]
    const monStr = isNaN(Number(a)) ? a : b
    const dayStr = isNaN(Number(a)) ? b : a
    const mon = MONTHS.indexOf(monStr.slice(0, 3))
    const day = parseInt(dayStr, 10)
    if (mon >= 0 && day >= 1 && day <= 31) {
      const d = new Date(now.getFullYear(), mon, day, 12)
      // "Sep 18" written in December means next year
      if (d.getTime() < now.getTime() - 90 * 86400e3) d.setFullYear(d.getFullYear() + 1)
      return d
    }
  }
  const slash = /^(\d{1,2})\/(\d{1,2})(\/(\d{2,4}))?$/.exec(t)
  if (slash) {
    const year = slash[4] ? (slash[4].length === 2 ? 2000 + +slash[4] : +slash[4]) : now.getFullYear()
    const d = new Date(year, +slash[1] - 1, +slash[2], 12)
    if (!slash[4] && d.getTime() < now.getTime() - 90 * 86400e3) d.setFullYear(d.getFullYear() + 1)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

export type FactorKey = 'cost' | 'parking' | 'commute' | 'size' | 'timing'

export type Factor = {
  key: FactorKey
  label: string
  points: number
  max: number
  unknown: boolean // true when this score is half credit for missing data, not a real measurement
  note: string
}

export type ScoreResult = {
  total: number        // 0-100, renormalized when parking doesn't count
  factors: Factor[]
  unit: Unit | null
  allIn: number | null
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))

export function scoreListing(l: Listing, c: Criteria, now = new Date()): ScoreResult {
  const u = targetUnit(l)
  const cost = allIn(l, u, c)
  const factors: Factor[] = []

  // Cost — 35. Full at 12% under target, linear to 0 at the hard ceiling.
  if (cost === null) {
    factors.push({ key: 'cost', label: 'Cost', points: 17.5, max: 35, unknown: true, note: 'no rent data' })
  } else {
    const full = 0.88 * c.targetAllIn
    let pts: number
    if (cost <= full) pts = 35
    else if (cost >= c.hardCeiling) pts = 0
    else pts = 35 * clamp01((c.hardCeiling - cost) / Math.max(1, c.hardCeiling - full))
    factors.push({ key: 'cost', label: 'Cost', points: pts, max: 35, unknown: false, note: `$${Math.round(cost)} all-in` })
  }

  // Parking — 20, only when parking is required.
  if (c.parkingRequired) {
    const pts = l.parkingAvail === 'yes' ? 20 : l.parkingAvail === 'unknown' ? 10 : 0
    factors.push({
      key: 'parking', label: 'Parking', points: pts, max: 20,
      unknown: l.parkingAvail === 'unknown',
      note: l.parkingAvail === 'unknown' ? 'unconfirmed, ask' : l.parkingAvail,
    })
  }

  // Commute — 20. Full at 60% of max acceptable, linear to 0 at max.
  const commute = num(l.commuteMin)
  if (commute === null) {
    factors.push({ key: 'commute', label: 'Commute', points: 10, max: 20, unknown: true, note: 'not measured' })
  } else {
    const full = 0.6 * c.maxCommuteMin
    let pts: number
    if (commute <= full) pts = 20
    else pts = 20 * clamp01((c.maxCommuteMin - commute) / Math.max(1, c.maxCommuteMin - full))
    factors.push({ key: 'commute', label: 'Commute', points: pts, max: 20, unknown: false, note: `${commute} min` })
  }

  // Size — 15. Full at 10% over minimum, linear to 0 at 20% under minimum.
  const sqft = u ? num(u.sqft) : null
  if (sqft === null) {
    factors.push({ key: 'size', label: 'Size', points: 7.5, max: 15, unknown: true, note: 'no sq ft' })
  } else {
    const full = 1.1 * c.minSqft
    const zero = 0.8 * c.minSqft
    const pts = 15 * clamp01((sqft - zero) / Math.max(1, full - zero))
    factors.push({ key: 'size', label: 'Size', points: pts, max: 15, unknown: false, note: `${sqft} sq ft` })
  }

  // Timing — 10. Available by the end of the move-in window: 10. Later: 2. Unknown: 5.
  const availDate = u ? parseAvail(u.avail, now) : null
  const windowEnd = c.moveInEnd ? new Date(c.moveInEnd + 'T23:59:59') : null
  if (!availDate || !windowEnd) {
    factors.push({ key: 'timing', label: 'Timing', points: 5, max: 10, unknown: true, note: availDate ? 'window not set' : 'no avail date' })
  } else {
    const inWindow = availDate.getTime() <= windowEnd.getTime()
    factors.push({ key: 'timing', label: 'Timing', points: inWindow ? 10 : 2, max: 10, unknown: false, note: u!.avail })
  }

  const sum = factors.reduce((a, f) => a + f.points, 0)
  const max = factors.reduce((a, f) => a + f.max, 0) // 100, or 80 when parking doesn't count
  return { total: Math.round((sum / max) * 100), factors, unit: u, allIn: cost }
}
