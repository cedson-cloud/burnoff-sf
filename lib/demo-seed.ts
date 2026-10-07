import { BoardData, Listing, Unit, emptyListing } from './types'

// The demo board: two invented friends and ten invented SF listings. Every
// name, street, phone (555-01xx) and URL (example.com) is made up; only the
// neighborhood names are real. Dates are relative to `today`, so the board
// looks current whenever it's opened. Pure: the same `today` gives the same board.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December']
const pad = (n: number) => String(n).padStart(2, '0')

export function demoSeed(today: Date): BoardData {
  // Local-time dates `n` days from today.
  const day = (n: number, hour = 12, minute = 0) =>
    new Date(today.getFullYear(), today.getMonth(), today.getDate() + n, hour, minute)
  const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  // tourAt uses the editor's datetime-local format.
  const tour = (n: number, hour: number, minute = 0) => {
    const d = day(n, hour, minute)
    return `${isoDate(d)}T${pad(hour)}:${pad(minute)}`
  }
  const avail = (n: number) => {
    const d = day(n)
    return `${MONTHS[d.getMonth()]} ${d.getDate()}`
  }
  const ts = (n: number) => day(n, 10).getTime()

  const moveInStart = day(30)
  const moveInEnd = day(60)

  let unitSeq = 0
  const unit = (u: Partial<Unit>): Unit =>
    ({ id: `demo-unit-${++unitSeq}`, label: '', sqft: '', rent: '', avail: '', note: '', target: false, ...u })
  const listing = (l: Partial<Listing> & Pick<Listing, 'id' | 'name' | 'status'>): Listing =>
    ({ ...emptyListing(), updatedAt: ts(-1), ...l })

  const listings: Listing[] = [
    listing({
      id: 'demo-fogbank',
      name: 'The Fogbank',
      address: '410 Fogbank Ln',
      hood: 'Inner Sunset',
      url: 'https://example.com/listings/fogbank',
      source: 'direct',
      landlordType: 'Property mgmt',
      feesMonthly: '120',
      parkingMonthly: '250',
      parkingAvail: 'yes',
      feesOneTime: 'Deposit $1,000 · App $50',
      commuteMin: '22',
      scores: 'Walk 91 · Transit 84 · Bike 78',
      status: 'Tour booked',
      tourAt: tour(2, 18),
      inquiredAt: ts(-6),
      contact: 'Leasing office · (415) 555-0123',
      hook: 'the bay window in the living room',
      askAbout: 'Is the garage spot assigned or first-come?',
      nextAction: 'Bring pay stubs to the tour',
      owner: 'Both',
      units: [
        unit({ label: '3B · 2bd', sqft: '940', rent: '4350', avail: avail(35), note: 'Corner, bay window', target: true }),
        unit({ label: '1A · 2bd', sqft: '910', rent: '4250', avail: 'Now', note: 'Ground floor, street-facing' }),
      ],
    }),
    listing({
      id: 'demo-sourdough',
      name: 'Sourdough Lofts',
      address: '2250 Sourdough St',
      hood: 'Dogpatch',
      url: 'https://example.com/listings/sourdough-lofts',
      source: 'Apartments.com',
      landlordType: 'Property mgmt',
      priceBasis: 'all-in',
      parkingMonthly: '300',
      parkingAvail: 'yes',
      feesOneTime: 'Deposit $1,500 · Holding $500 (refundable)',
      commuteMin: '15',
      scores: 'Walk 82 · Transit 70 · Bike 88',
      status: 'Tour booked',
      // Yesterday: still 'Tour booked', so it shows as past due.
      tourAt: tour(-1, 17, 30),
      inquiredAt: ts(-8),
      contact: 'leasing@example.com',
      hook: 'the shared roof deck with a view of the water',
      nextAction: 'Mark how the tour went',
      owner: 'Companion',
      units: [
        unit({ label: 'L-204 · 2bd', sqft: '1020', rent: '5100', avail: avail(28), note: 'Loft ceilings', target: true }),
      ],
    }),
    listing({
      id: 'demo-karl',
      name: 'Karl Ave flat',
      address: '1501 Karl Ave',
      hood: 'Outer Richmond',
      url: 'https://example.com/listings/karl-ave',
      source: 'Craigslist',
      landlordType: 'Individual',
      // Parking, size and commute are all unknown, so scoring flags them.
      status: 'Lead',
      hook: 'the backyard garden tenants can use',
      askAbout: 'Square footage? Any parking?',
      owner: 'Me',
      units: [unit({ label: '2bd', rent: '3950', avail: 'Now' })],
    }),
    listing({
      id: 'demo-parrot-hill',
      name: 'Parrot Hill duplex',
      address: '77 Parrot Hill Ct',
      hood: 'North Beach',
      url: 'https://example.com/listings/parrot-hill',
      source: 'Zillow',
      landlordType: 'Individual',
      parkingAvail: 'no',
      commuteMin: '18',
      scores: 'Walk 98 · Transit 92 · Bike 70',
      status: 'Inquired',
      inquiredAt: ts(-3),
      contact: 'Pat (owner) · (415) 555-0167',
      hook: 'the wild parrots in the garden out back',
      notes: 'Owner lives upstairs. Cats OK.',
      owner: 'Both',
      units: [unit({ label: 'Lower · 2bd', sqft: '880', rent: '4600', avail: avail(30), target: true })],
    }),
    listing({
      id: 'demo-cable-line',
      name: 'Cable Line Commons',
      address: '600 Cable Line Way',
      hood: 'Hayes Valley',
      url: 'https://example.com/listings/cable-line',
      source: 'direct',
      landlordType: 'Property mgmt',
      feesMonthly: '185',
      parkingMonthly: '325',
      parkingAvail: 'yes',
      feesOneTime: 'Deposit $750 · App $55',
      commuteMin: '12',
      scores: 'Walk 97 · Transit 95 · Bike 92',
      status: 'Replied',
      inquiredAt: ts(-5),
      contact: 'Leasing office · (415) 555-0188',
      hook: 'in-unit laundry, which is rare in the neighborhood',
      nextAction: 'Pick a tour slot',
      notes: 'Six weeks free on a 13-month lease.',
      owner: 'Me',
      units: [
        unit({ label: '5C · 2bd', sqft: '905', rent: '4795', avail: avail(45), target: true }),
        unit({ label: '7F · 2bd', sqft: '980', rent: '5050', avail: avail(50), note: 'Top floor' }),
      ],
    }),
    listing({
      id: 'demo-mural-alley',
      name: 'Mural Alley 2bd',
      address: '3318 Mural Alley',
      hood: 'Mission',
      url: 'https://example.com/listings/mural-alley',
      source: 'Craigslist',
      landlordType: 'Individual',
      // Parking unknown: the owner never answered.
      commuteMin: '20',
      status: 'Toured',
      tourAt: tour(-4, 11),
      inquiredAt: ts(-9),
      contact: 'Robin (owner) · (415) 555-0145',
      hook: 'the sunny kitchen',
      askAbout: 'Is street parking the only option?',
      notes: 'Second bedroom is small but has a closet.',
      owner: 'Both',
      myScore: 4,
      companionScore: 3,
      units: [unit({ label: '2bd', sqft: '860', rent: '4400', avail: avail(20), target: true })],
    }),
    listing({
      id: 'demo-garden-steps',
      name: 'Garden Steps flat',
      address: '45 Garden Steps',
      hood: 'Bernal Heights',
      url: 'https://example.com/listings/garden-steps',
      source: 'Zillow',
      landlordType: 'Individual',
      parkingMonthly: '0',
      parkingAvail: 'yes',
      feesOneTime: 'Deposit $4,500',
      feesPaid: 'App $40',
      commuteMin: '30',
      scores: 'Walk 85 · Transit 72 · Bike 60',
      status: 'Applied',
      tourAt: tour(-6, 10),
      inquiredAt: ts(-12),
      contact: 'Casey (owner) · (415) 555-0110',
      hook: 'the garage that comes with the unit',
      nextAction: 'Follow up on the application',
      owner: 'Both',
      myScore: 5,
      companionScore: 4,
      units: [unit({ label: 'Upper · 2bd', sqft: '970', rent: '4500', avail: avail(40), target: true })],
    }),
    listing({
      id: 'demo-ocean-mist',
      name: 'Ocean Mist Apartments',
      address: '9 Ocean Mist Ter',
      hood: 'Outer Sunset',
      url: 'https://example.com/listings/ocean-mist',
      source: 'Apartments.com',
      landlordType: 'Property mgmt',
      feesMonthly: '95',
      parkingMonthly: '200',
      parkingAvail: 'yes',
      commuteMin: '38',
      scores: 'Walk 70 · Transit 65 · Bike 75',
      status: 'Inquired',
      inquiredAt: ts(-1),
      contact: 'leasing@example.com',
      hook: 'being two blocks from the beach',
      owner: 'Companion',
      units: [unit({ label: '210 · 2bd', sqft: '1100', rent: '3900', avail: avail(25), target: true })],
    }),
    listing({
      id: 'demo-polk-walkup',
      name: 'Polk walk-up',
      address: '',
      hood: 'Polk Gulch',
      url: 'https://example.com/listings/polk-walkup',
      source: 'Craigslist',
      landlordType: 'Individual',
      parkingAvail: 'no',
      commuteMin: '28',
      status: 'Passed',
      tourAt: tour(-7, 13),
      inquiredAt: ts(-14),
      notes: 'Pricey for the size, fourth-floor walk-up, and the second bedroom has no window.',
      owner: 'Me',
      myScore: 2,
      companionScore: 1,
      units: [unit({ label: '2bd', sqft: '720', rent: '4950', avail: 'Now', target: true })],
    }),
    listing({
      id: 'demo-yards',
      name: 'SoMa Yards',
      address: '',
      hood: 'SoMa',
      url: 'https://example.com/listings/soma-yards',
      source: 'direct',
      landlordType: 'Property mgmt',
      parkingMonthly: '350',
      parkingAvail: 'yes',
      commuteMin: '10',
      // No rent listed ("call for pricing"), so cost is unknown.
      status: 'Lead',
      hook: 'the coworking lounge on the ground floor',
      askAbout: 'Rent for the 2bd? Any move-in specials?',
      owner: 'Companion',
      units: [unit({ label: '2bd', sqft: '1000', avail: avail(14) })],
    }),
  ]

  return {
    listings,
    settings: {
      criteria: {
        targetAllIn: 4800,
        hardCeiling: 5600,
        minSqft: 850,
        maxCommuteMin: 35,
        parkingRequired: true,
        includeParking: true,
        beds: 2,
        moveInStart: isoDate(moveInStart),
        moveInEnd: isoDate(moveInEnd),
        blockedDay: 0,
        blockedDayLabel: '',
        commuteAnchor: 'Civic Center',
      },
      profile: {
        yourName: 'Jordan',
        phone: '(415) 555-0142',
        movingFrom: 'the East Bay',
        moveInWindowText: `early ${FULL_MONTHS[moveInStart.getMonth()]}`,
        companionName: 'Sam',
        companionPhrase: 'my friend Sam',
        aboutUs: "We've shared an apartment for three years. Jordan is a nurse and Sam teaches high school; we're quiet, no pets.",
        qualifications: 'Combined income over 3x rent, good credit, and a reference from our current landlord.',
      },
      updatedAt: 0,
    },
    serverTime: 0,
  }
}
