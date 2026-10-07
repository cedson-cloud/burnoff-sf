import { household } from './household'
import { allIn, num, targetUnit } from './score'
import { Listing, Profile, Settings } from './types'

export type Template = {
  id: string
  title: string
  // 'initial' templates advance status to Inquired and stamp inquiredAt on "Sent it"
  kind: 'initial' | 'followup'
  body: string
}

const fallback = (v: string | undefined, alt: string) => (v && v.trim() ? v.trim() : alt)
// $5,471 and $21.50, not $5471 and $21.5
const usd = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
// Free text from Settings, ending in sentence punctuation so it can be followed by more copy.
const sentence = (v: string) => (v.trim() ? v.trim().replace(/([^.!?])$/, '$1.') : '')

// The move-in window as people naturally type it, made to follow a verb:
// "late October" → "in late October"; "By the end of October" → "by the end of October".
const STARTS_WITH_PREPOSITION = /^(in|by|before|around|after|within|on|from|starting|sometime|anytime|asap|as soon as|this|next|now|immediately|right away)\b/i
function moveInWhen(text: string): string {
  const t = fallback(text, 'the next few weeks')
  if (!STARTS_WITH_PREPOSITION.test(t)) return `in ${t}`
  // Lowercase "By" but leave acronyms like "ASAP" alone.
  return /^[A-Z][a-z]/.test(t) ? t[0].toLowerCase() + t.slice(1) : t
}

// The opening line of the first inquiry. Settings shows it as a live preview,
// so people can see how their profile fields read in a sentence.
export function introLine(p: Profile): string {
  const h = household(p)
  return `${h.weIntro} moving from ${fallback(p.movingFrom, 'out of the area')}, and ${h.weAre} hoping to be settled ${moveInWhen(p.moveInWindowText)}.`
}

export function buildTemplates(l: Listing, s: Settings): Template[] {
  const { profile: p, criteria: c } = s
  const u = targetUnit(l)
  const cost = allIn(l, u, c)

  const h = household(p)
  const you = p.yourName.trim()
  const aboutUs = sentence(p.aboutUs)
  const quals = sentence(p.qualifications)
  const when = moveInWhen(p.moveInWindowText)
  const place = fallback(l.name, 'your listing')
  const unitLabel = u ? fallback(u.label, 'the available unit') : 'the available unit'
  const hook = l.hook.trim()
  const hookLine = hook ? ` ${hook[0].toUpperCase() + hook.slice(1).replace(/\.?$/, '.')} That's a big part of why this one stood out to ${h.us}.` : ''
  const signature = [you, p.phone.trim()].filter(Boolean).join(' · ')
  const phone = signature ? `\n\nBest,\n${signature}` : `\n\nBest`
  const rentStr = u && num(u.rent) !== null ? usd(num(u.rent)!) : 'the listed rent'
  const feesStr = num(l.feesMonthly) !== null ? `${usd(num(l.feesMonthly)!)}/mo in required fees` : 'any required monthly fees'
  const parkingAsk =
    l.parkingAvail === 'yes'
      ? num(l.parkingMonthly) !== null
        ? `parking at ${usd(num(l.parkingMonthly)!)}/mo`
        : 'the monthly parking rate'
      : 'whether parking is available and at what monthly rate'

  const templates: Template[] = []

  if (l.landlordType === 'Individual') {
    templates.push({
      id: 'inq-individual',
      kind: 'initial',
      title: 'Initial inquiry: individual owner',
      body:
        `Hi${l.contact.trim() ? ' ' + l.contact.trim().split(/[\s,·]/)[0] : ''},\n\n` +
        `${introLine(p)} ${cap(h.we)} came across ${place} and would love to set up a time to see it.${hookLine}\n\n` +
        // Claims about the household come only from what the user wrote in Settings.
        [aboutUs, quals].filter(Boolean).map(t => `${t} `).join('') +
        `${cap(h.we)} can provide credit reports and proof of income. Happy to send anything you need today.\n\n` +
        `Is the place still available, and is there a good time this week to take a look?` +
        phone,
    })
  } else {
    templates.push({
      id: 'inq-mgmt',
      kind: 'initial',
      title: 'Initial inquiry: property mgmt',
      body:
        `Hi,\n\n` +
        `${cap(h.weAre)} interested in ${unitLabel} at ${place}${l.address.trim() ? ` (${l.address.trim()})` : ''} and would like to book a tour this week. A few questions so ${h.we} can move quickly:\n\n` +
        `1. Is ${unitLabel} still available at ${rentStr}, and is that base rent or inclusive of fees? Could you confirm ${feesStr}?\n` +
        `2. Could you confirm ${parkingAsk}?\n` +
        `3. What are the application fee and holding deposit, and are they refundable if the application isn't approved?\n` +
        `4. What's your typical turnaround from application to approval?\n\n` +
        `${cap(h.weAre)} targeting a move-in ${when}. ` +
        // Claims about the household come only from what the user wrote in Settings.
        (quals ? `${quals} ` : '') +
        `Credit reports and income verification ready to submit same-day.` +
        phone,
    })
  }

  templates.push(
    {
      id: 'nudge-24h',
      kind: 'followup',
      title: 'Nudge: 24h silence',
      body:
        `Hi, following up on my note yesterday about ${unitLabel} at ${place}. ` +
        `${cap(h.weAre)} touring places this week and it's near the top of ${h.our} list, so I wanted to check it's still available before ${h.we} finalize ${h.our} schedule. ` +
        `Any time that works for a showing?` +
        phone,
    },
    {
      id: 'confirm-tour',
      kind: 'followup',
      title: 'Confirm tour',
      body:
        `Hi, confirming ${h.our} tour of ${unitLabel} at ${place}${l.tourAt ? ` on ${formatTourAt(l.tourAt)}` : ''}. ` +
        `${cap(h.we)}'ll be there. If anything changes on your end, you can reach me at ${fallback(p.phone, 'this address')}. See you then!` +
        (you ? `\n\n${you}` : ''),
    },
    {
      id: 'post-tour',
      kind: 'followup',
      title: 'Post-tour: we want it',
      body:
        `Hi, thank you for showing ${h.us} ${unitLabel} today. ${cap(h.we)} loved it and ${h.we}'d like to move forward.${hook ? ` ${hook[0].toUpperCase() + hook.slice(1).replace(/\.?$/, '')} really sealed it for ${h.us}.` : ''}\n\n` +
        `Could you send over the application link and confirm what you need from ${h.us}? ${cap(h.we)} can complete it today. ` +
        `${cap(h.weAre)} aiming for a move-in ${when} and ready to put down the holding deposit as soon as the application is approved.` +
        phone,
    },
    {
      id: 'pin-all-in',
      kind: 'followup',
      title: 'Pin down the all-in number',
      body:
        `Hi, before ${h.we} finalize, I want to make sure I have the complete monthly picture for ${unitLabel}. Could you confirm in writing:\n\n` +
        `1. Base rent (${rentStr}?)\n` +
        `2. Every required monthly fee and its amount (utilities, amenity, admin, or anything else that will appear on the ledger)\n` +
        `3. Parking: ${parkingAsk}\n` +
        `4. One-time costs: deposit, application fee, and any admin/move-in fees, and which are refundable\n\n` +
        `Just want zero surprises on the first invoice. Thanks!` +
        phone,
    },
    {
      id: 'backup',
      kind: 'followup',
      title: 'Backup: keep us in mind',
      body:
        `Hi, sorry to hear ${unitLabel} was leased, and thanks for letting me know. ` +
        `If it falls through, or a comparable unit opens up in the next month or so, ${h.we}'d love to be first in line. ${cap(h.weAre)} qualified, aiming to move ${when}, flexible on the exact date, and can apply same-day. ` +
        `Feel free to keep my contact on file.` +
        phone,
    },
  )

  return templates
}

function formatTourAt(tourAt: string): string {
  const d = new Date(tourAt)
  if (isNaN(d.getTime())) return tourAt
  return d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}
