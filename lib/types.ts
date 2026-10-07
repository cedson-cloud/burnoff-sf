export type Unit = {
  id: string
  label: string        // "N-344 · 1bd"
  sqft: string
  rent: string         // base or all-in, per the listing's priceBasis
  avail: string        // "Sep 18", "Now"
  note: string
  target: boolean      // the one unit we'd actually take; drives scoring and messages
}

export type ListingStatus =
  | 'Lead' | 'Inquired' | 'Replied' | 'Tour booked'
  | 'Toured' | 'Applied' | 'Approved' | 'Passed'

export type Listing = {
  id: string
  name: string
  address: string
  hood: string
  url: string
  source: string
  landlordType: 'Individual' | 'Property mgmt'
  priceBasis: 'base' | 'all-in'
  feesMonthly: string
  parkingMonthly: string
  parkingAvail: 'yes' | 'no' | 'unknown'
  feesOneTime: string
  feesPaid: string
  commuteMin: string
  scores: string
  status: ListingStatus
  tourAt: string
  inquiredAt: number
  contact: string
  hook: string
  askAbout: string
  nextAction: string
  mediaUrl: string
  notes: string
  owner: 'Me' | 'Companion' | 'Both'
  myScore: number
  companionScore: number
  units: Unit[]
  updatedAt: number
}

export type Criteria = {
  targetAllIn: number      // target all-in monthly ceiling ($)
  hardCeiling: number      // absolute max all-in ($)
  minSqft: number
  maxCommuteMin: number
  parkingRequired: boolean
  includeParking: boolean  // global toggle: does parking count toward all-in?
  beds: number
  moveInStart: string      // ISO date
  moveInEnd: string        // ISO date
  blockedDay: number       // 0-6 (Sun-Sat), day reserved for a fixed commitment
  blockedDayLabel: string
  commuteAnchor: string    // address every commuteMin is measured to
}

export type Profile = {
  yourName: string
  phone: string
  movingFrom: string
  moveInWindowText: string // human phrasing for messages, e.g. "mid-September"
  companionName: string    // who you're searching with; empty means a solo search
  companionPhrase: string  // how messages describe them, e.g. "my sister"
  aboutUs: string          // free text dropped into the initial inquiry
  qualifications: string   // free text, e.g. "income 3x rent, credit 750+"
}

export type Settings = {
  criteria: Criteria
  profile: Profile
  updatedAt: number
}

export type BoardData = {
  listings: Listing[]
  settings: Settings
  serverTime: number
}

export const DEFAULT_CRITERIA: Criteria = {
  targetAllIn: 3500,
  hardCeiling: 4200,
  minSqft: 650,
  maxCommuteMin: 40,
  parkingRequired: true,
  includeParking: true,
  beds: 1,
  moveInStart: '',
  moveInEnd: '',
  blockedDay: 0,
  blockedDayLabel: '',
  commuteAnchor: '',
}

export const DEFAULT_PROFILE: Profile = {
  yourName: '',
  phone: '',
  movingFrom: '',
  moveInWindowText: '',
  companionName: '',
  companionPhrase: '',
  aboutUs: '',
  qualifications: '',
}

export const DEFAULT_SETTINGS: Settings = {
  criteria: DEFAULT_CRITERIA,
  profile: DEFAULT_PROFILE,
  updatedAt: 0,
}

export const STATUSES: ListingStatus[] = [
  'Lead', 'Inquired', 'Replied', 'Tour booked', 'Toured', 'Applied', 'Approved', 'Passed',
]

export function emptyUnit(): Unit {
  return {
    id: crypto.randomUUID(),
    label: '', sqft: '', rent: '', avail: '', note: '', target: false,
  }
}

export function emptyListing(): Listing {
  return {
    id: crypto.randomUUID(),
    name: '', address: '', hood: '', url: '', source: '',
    landlordType: 'Property mgmt',
    priceBasis: 'base',
    feesMonthly: '', parkingMonthly: '', parkingAvail: 'unknown',
    feesOneTime: '', feesPaid: '', commuteMin: '', scores: '',
    status: 'Lead', tourAt: '', inquiredAt: 0,
    contact: '', hook: '', askAbout: '', nextAction: '',
    mediaUrl: '', notes: '', owner: 'Both',
    myScore: 0, companionScore: 0,
    units: [], updatedAt: 0,
  }
}
