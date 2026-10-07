import type { Sample } from './client/parser'

// Invented listing pages for the demo's "Try a sample listing" and parse
// fallback. Every building, street, person, phone (555-01xx) and URL
// (example.com) is made up; only the neighborhood names are real. The text is
// messy on purpose, like a real select-all copy. Each `parsed` result holds
// only what its text states, under the same no-invention rule as the parse
// prompt: anything the page doesn't say stays empty or 'unknown'.

const alderCourt: Sample = {
  url: 'https://rentnest.example.com/sf/mission/alder-court',
  text: `Skip to main content
RentNest
Rent   Buy   Sell   Saved homes   Sign in
San Francisco, CA  >  Mission  >  Alder Court
Share   Save   Hide

Alder Court
1250 Quarry St, San Francisco, CA 94110
Mission District
$3,195 – $4,050 /mo
1–2 Beds   1–2 Baths
Check availability   Request a tour

Advertisement
Moving soon? Compare quotes from 5 movers in minutes. Get quotes ›

Pricing & Floor Plans
All (3)   1 Bed (2)   2 Beds (1)

Unit 204
1 bd · 1 ba · 640 sq ft
$3,195/mo
Available now
Details

Unit 311
1 bd · 1 ba · 705 sq ft
$3,380/mo
Available Nov 15
Corner unit, west-facing windows
Details

Unit 502
2 bd · 2 ba · 980 sq ft
$4,050/mo
Available Dec 1
Top floor, renovated kitchen
Details

Fees and Policies
Required monthly fees
Utilities package (water, sewer, trash) $95
Amenity fee $40
Parking
Garage parking $275/mo · waitlist
One-time fees
Application fee $55 per applicant
Security deposit from $1,000
Pets
Cats allowed. Dogs up to 40 lb. Pet rent $50/mo per pet.

About Alder Court
A 1920s brick building restored in 2023, with a shared rooftop garden looking out toward downtown. Quiet interior courtyard, bike room, and package lockers.
Lease terms: 12 months. Move in by Nov 30 and get one month free on a 13-month lease.

Amenities
In-unit washer/dryer · Dishwasher · Hardwood floors · Bike room · Package lockers · Rooftop garden

Contact this property
Alder Court Leasing
(415) 555-0142
Message   Call

Walk Score® 96   Walker's Paradise
Transit Score® 88   Excellent Transit
Bike Score® 97   Biker's Paradise

Nearby rentals
Mission Lofts   $3,600+   1–2 bd
The Ridgeline   $2,950+   Studio–1 bd
Valencia Flats   $3,400+   1 bd
See more rentals in Mission ›

Report this listing
RentNest is committed to fair housing. Learn more
About   Careers   Help   Terms of use   Privacy   Do not sell my info
© 2026 RentNest, Inc.`,
  parsed: {
    name: 'Alder Court',
    address: '1250 Quarry St, San Francisco, CA 94110',
    hood: 'Mission',
    source: 'RentNest',
    landlordType: 'Property mgmt',
    priceBasis: 'base',
    feesMonthly: '135',
    parkingMonthly: '275',
    parkingAvail: 'yes',
    feesOneTime: 'Deposit from $1,000 · App $55 per applicant',
    contact: 'Alder Court Leasing · (415) 555-0142',
    hook: 'the shared rooftop garden looking out toward downtown',
    scores: 'Walk 96 · Transit 88 · Bike 97',
    notes: 'Garage parking is waitlisted · Cats OK, dogs up to 40 lb, $50/mo pet rent · One month free on a 13-month lease if moved in by Nov 30',
    units: [
      { label: '204 · 1bd', sqft: '640', rent: '3195', avail: 'Now', note: '' },
      { label: '311 · 1bd', sqft: '705', rent: '3380', avail: 'Nov 15', note: 'Corner unit, west-facing windows' },
      { label: '502 · 2bd', sqft: '980', rent: '4050', avail: 'Dec 1', note: 'Top floor, renovated kitchen' },
    ],
  },
}

const wrenHill: Sample = {
  url: 'https://classifieds.example.com/sfo/apa/7812345678.html',
  text: `classifieds.example.com > SF bay area > san francisco > housing > apts/housing for rent
[ ‹ prev | ▲ | next › ]   reply   ★ favorite   ✕ hide   ⚑ flag
Posted 2026-10-04 09:12   updated 2026-10-05 18:40

$2,875 / 1br - Sunny top-floor 1BR in Edwardian, quiet block (noe valley)

1BR / 1Ba   available nov 1
apartment   laundry in bldg   street parking   no smoking   cats are OK - purrr

Wren Hill St near 24th St (google map)

Top floor of a three-unit Edwardian on a quiet block. Big bay windows, original crown molding, gas stove. Shared laundry in the basement. Garden out back that tenants share.

Owner-managed. I live on the ground floor. Rent includes water and garbage; tenant pays PG&E and internet.

1 year lease, then month to month. First month + deposit equal to one month's rent. No application fee.

Cats fine. No dogs, sorry.

Text Marisol at (415) 555-0187 to see it. Showings weekday evenings and Saturday mornings.

do NOT contact me with unsolicited services or offers

post id: 7812345678
safety tips   prohibited items   avoid scams & fraud
© 2026 classifieds.example.com   help   safety   privacy   terms   about   mobile`,
  parsed: {
    name: 'Noe Valley 1bd',
    address: 'Wren Hill St near 24th St',
    hood: 'Noe Valley',
    source: 'Classifieds',
    landlordType: 'Individual',
    priceBasis: 'base',
    feesMonthly: '',
    parkingMonthly: '',
    parkingAvail: 'no',
    feesOneTime: "First month + deposit of one month's rent · No app fee",
    contact: 'Marisol · text (415) 555-0187',
    hook: 'the big bay windows and original crown molding',
    scores: '',
    notes: 'Owner lives on the ground floor · Water and garbage included; tenant pays PG&E and internet · Cats OK, no dogs · 1-year lease, then month to month',
    units: [
      { label: '1bd', sqft: '', rent: '2875', avail: 'Nov 1', note: 'Top floor' },
    ],
  },
}

const larkspur: Sample = {
  url: 'https://thelarkspur.example.com/floor-plans',
  text: `THE LARKSPUR
Residences   Amenities   Neighborhood   Gallery   Apply   Resident login
☰ Menu
Now leasing. Schedule a self-guided tour today!

Live above it all in SoMa

Floor Plans
Filter by:  Studio  |  1 Bedroom  |  2 Bedroom

Studio S1 · Unit 0806
485 sq ft
$2,640/month
Available Oct 20
View details   Apply now

1 Bedroom A2 · Unit 1214
690 sq ft
$3,410/month
Available Now
Skyline view
View details   Apply now

2 Bedroom B1
940 sq ft
Join the waitlist

Simple pricing: every rent at The Larkspur includes water, trash, high-speed Wi-Fi and amenity access. No surprise monthly fees.

Amenities
Fitness center · Co-working lounge · Dog run · Rooftop terrace with fire pits · 24/7 package room

Pet friendly! Up to 2 pets per home. One-time pet fee $300.
Lease terms from 6 to 15 months.
Move-in costs: $500 deposit (OAC), $45 application fee per adult. $250 holding deposit, applied to your first month's rent.

Contact our leasing team
leasing@thelarkspur.example.com · (415) 555-0163
88 Tessel Way, San Francisco, CA 94103

Sign up for updates   [ your email ]   Submit
Equal Housing Opportunity · Accessibility statement · © 2026 The Larkspur. All rights reserved.
We use cookies to improve your experience.   Accept   Manage preferences`,
  parsed: {
    name: 'The Larkspur',
    address: '88 Tessel Way, San Francisco, CA 94103',
    hood: 'SoMa',
    source: 'direct',
    landlordType: 'Property mgmt',
    priceBasis: 'all-in',
    feesMonthly: '',
    parkingMonthly: '',
    parkingAvail: 'unknown',
    feesOneTime: "Deposit $500 (OAC) · App $45 per adult · Holding $250 (applied to first month's rent) · Pet fee $300",
    contact: 'leasing@thelarkspur.example.com · (415) 555-0163',
    hook: 'the rooftop terrace with fire pits',
    scores: '',
    notes: 'Rent includes water, trash, Wi-Fi and amenities · Up to 2 pets · Leases from 6 to 15 months',
    units: [
      { label: '0806 · Studio', sqft: '485', rent: '2640', avail: 'Oct 20', note: '' },
      { label: '1214 · 1bd', sqft: '690', rent: '3410', avail: 'Now', note: 'Skyline view' },
    ],
  },
}

// The first one is what "Try a sample listing" fills in, and the fallback for
// any paste that isn't one of these.
export const SAMPLES: Sample[] = [alderCourt, wrenHill, larkspur]
