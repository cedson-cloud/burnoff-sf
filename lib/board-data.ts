import * as z from 'zod/v4'
import {
  BoardData, Criteria, DEFAULT_CRITERIA, DEFAULT_PROFILE, Listing, Profile, STATUSES, Settings, Unit,
} from './types'

// The single entry point for board data from storage (Redis today; browser
// storage and imported files later). Every field falls back to its default on
// its own, so one bad or missing field never drops a whole listing or board,
// and all legacy-shape upgrades live here.

// Numeric fields are typed as strings; a number that slipped into storage keeps its value.
const str = z.preprocess(v => (typeof v === 'number' ? String(v) : v), z.string()).catch('')
const numOr = (d: number) => z.number().catch(d)
const boolOr = (d: boolean) => z.boolean().catch(d)
const objectOrEmpty = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {})

const UnitSchema = z.object({
  id: z.string().min(1),
  label: str,
  sqft: str,
  rent: str,
  avail: str,
  note: str,
  target: boolOr(false),
}) satisfies z.ZodType<Unit>

// Like listings, units that aren't objects or lack an id are dropped.
const UnitsSchema = z.preprocess(
  v => (Array.isArray(v) ? v.filter(u => UnitSchema.safeParse(u).success) : []),
  z.array(UnitSchema),
)

const OWNERS = ['Me', 'Companion', 'Both'] as const

const ListingSchema = z.object({
  id: z.string().min(1),
  name: str,
  address: str,
  hood: str,
  url: str,
  source: str,
  landlordType: z.enum(['Individual', 'Property mgmt']).catch('Property mgmt'),
  priceBasis: z.enum(['base', 'all-in']).catch('base'),
  feesMonthly: str,
  parkingMonthly: str,
  parkingAvail: z.enum(['yes', 'no', 'unknown']).catch('unknown'),
  feesOneTime: str,
  feesPaid: str,
  commuteMin: str,
  scores: str,
  status: z.enum(STATUSES).catch('Lead'),
  tourAt: str,
  inquiredAt: numOr(0),
  contact: str,
  hook: str,
  askAbout: str,
  nextAction: str,
  mediaUrl: str,
  notes: str,
  // 'Partner' is the pre-companion name for 'Companion'. Records written before
  // the owner rename stored a first name here, which falls back to 'Me'.
  owner: z.preprocess(v => (v === 'Partner' ? 'Companion' : v), z.enum(OWNERS)).catch('Me'),
  myScore: z.number().optional().catch(undefined),
  // Pre-rename name for myScore.
  calScore: z.number().optional().catch(undefined),
  companionScore: z.number().optional().catch(undefined),
  // Pre-rename name for companionScore.
  partnerScore: z.number().optional().catch(undefined),
  units: UnitsSchema,
  updatedAt: numOr(0),
}).transform(({ calScore, myScore, partnerScore, companionScore, ...rest }): Listing => ({
  ...rest,
  myScore: myScore ?? calScore ?? 0,
  companionScore: companionScore ?? partnerScore ?? 0,
}))

const CriteriaSchema = z.preprocess(objectOrEmpty, z.object({
  targetAllIn: numOr(DEFAULT_CRITERIA.targetAllIn),
  hardCeiling: numOr(DEFAULT_CRITERIA.hardCeiling),
  minSqft: numOr(DEFAULT_CRITERIA.minSqft),
  maxCommuteMin: numOr(DEFAULT_CRITERIA.maxCommuteMin),
  parkingRequired: boolOr(DEFAULT_CRITERIA.parkingRequired),
  includeParking: boolOr(DEFAULT_CRITERIA.includeParking),
  beds: numOr(DEFAULT_CRITERIA.beds),
  moveInStart: str,
  moveInEnd: str,
  blockedDay: numOr(DEFAULT_CRITERIA.blockedDay),
  blockedDayLabel: str,
  commuteAnchor: str,
})) satisfies z.ZodType<Criteria>

// partnerName is the pre-rename name for companionName. partnerEmployer is
// dropped: aboutUs replaces it as free text rather than generated copy.
const ProfileSchema = z.preprocess(objectOrEmpty, z.object({
  yourName: z.string().catch(DEFAULT_PROFILE.yourName),
  phone: z.string().catch(DEFAULT_PROFILE.phone),
  movingFrom: z.string().catch(DEFAULT_PROFILE.movingFrom),
  moveInWindowText: z.string().catch(DEFAULT_PROFILE.moveInWindowText),
  companionName: z.string().optional().catch(undefined),
  partnerName: z.string().optional().catch(undefined),
  companionPhrase: z.string().catch(DEFAULT_PROFILE.companionPhrase),
  aboutUs: z.string().catch(DEFAULT_PROFILE.aboutUs),
  qualifications: z.string().catch(DEFAULT_PROFILE.qualifications),
}).transform(({ companionName, partnerName, ...rest }): Profile => ({
  ...rest,
  companionName: companionName ?? partnerName ?? DEFAULT_PROFILE.companionName,
}))) satisfies z.ZodType<Profile>

const SettingsSchema = z.preprocess(objectOrEmpty, z.object({
  criteria: CriteriaSchema,
  profile: ProfileSchema,
  updatedAt: numOr(0),
})) satisfies z.ZodType<Settings>

// `listings` may be an array or a Redis-hash-shaped record keyed by id.
// Entries that aren't objects or lack an id are dropped; nothing else is.
export function normalizeBoardData(raw: unknown): BoardData {
  const r = objectOrEmpty(raw) as { listings?: unknown; settings?: unknown; serverTime?: unknown }
  const rawListings = Array.isArray(r.listings)
    ? r.listings
    : Object.values(objectOrEmpty(r.listings))

  const listings: Listing[] = []
  for (const l of rawListings) {
    const parsed = ListingSchema.safeParse(l)
    if (parsed.success) listings.push(parsed.data)
  }

  return {
    listings,
    settings: SettingsSchema.parse(r.settings),
    serverTime: typeof r.serverTime === 'number' ? r.serverTime : 0,
  }
}
