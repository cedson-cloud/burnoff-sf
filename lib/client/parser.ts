import { ParsedListing } from '../parse-schema'
import { Listing, emptyListing } from '../types'
import { parseListing } from './api'

// Turning pasted page text into a prefilled Listing. PasteParse only sees this
// interface: the live parser is the same in both modes, and the demo wraps it
// in withSampleFallback. Real mode never falls back, since a sample would put
// an invented listing into someone's actual board.

export type ParseOutcome = { listing: Listing; origin: 'claude' | 'sample'; note?: string }

export interface Parser {
  parse(text: string, url: string): Promise<ParseOutcome>
  samplePaste?: { url: string; text: string } // when set, PasteParse offers "Try a sample listing"
}

// A sample listing page and the result a parse of it would give, so the
// fallback never needs a model call.
export type Sample = { url: string; text: string; parsed: ParsedListing }

// Calls /api/parse. A null pass sends no passcode header.
export function liveParser(pass: string | null): Parser {
  return {
    async parse(text, url) {
      const { parsed } = await parseListing(pass, text, url)
      return { listing: toListing(parsed, url), origin: 'claude' }
    },
  }
}

// If the inner parse fails for any reason, returns the sample whose text was
// pasted (or the first one) with a note saying so.
export function withSampleFallback(parser: Parser, samples: Sample[]): Parser {
  if (samples.length === 0) throw new Error('withSampleFallback needs at least one sample')
  const first = samples[0]
  return {
    samplePaste: { url: first.url, text: first.text },
    async parse(text, url) {
      try {
        return await parser.parse(text, url)
      } catch {
        const match = samples.find(s => sameText(s.text, text))
        const sample = match ?? first
        return {
          listing: toListing(sample.parsed, sample.url),
          origin: 'sample',
          note: match
            ? "Live parsing isn't available right now, so this is the saved result for this sample page."
            : "Live parsing isn't available right now, so this is a sample listing, not the page you pasted.",
        }
      }
    },
  }
}

// Textareas and copy-paste change line endings and stray whitespace.
const sameText = (a: string, b: string) => squash(a) === squash(b)
const squash = (s: string) => s.replace(/\s+/g, ' ').trim()

export function toListing(p: ParsedListing, url: string): Listing {
  const l = emptyListing()
  return {
    ...l,
    name: p.name,
    address: p.address,
    hood: p.hood,
    url,
    source: p.source,
    landlordType: p.landlordType,
    priceBasis: p.priceBasis,
    feesMonthly: p.feesMonthly,
    parkingMonthly: p.parkingMonthly,
    parkingAvail: p.parkingAvail,
    feesOneTime: p.feesOneTime,
    contact: p.contact,
    hook: p.hook,
    scores: p.scores,
    notes: p.notes,
    units: p.units.map((u, i) => ({
      id: crypto.randomUUID(),
      label: u.label,
      sqft: u.sqft,
      rent: u.rent,
      avail: u.avail,
      note: u.note,
      target: i === 0 && p.units.length === 1, // single unit: it's the target
    })),
  }
}
