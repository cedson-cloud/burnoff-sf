import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { buildTemplates, openingTemplate } from './messages'
import { DEFAULT_SETTINGS, Listing, STATUSES, emptyListing } from './types'

const listing = (patch: Partial<Listing> = {}): Listing => ({ ...emptyListing(), id: 'a', name: 'Karl Ave flat', ...patch })

describe('openingTemplate', () => {
  for (const landlordType of ['Individual', 'Property mgmt'] as const) {
    const templates = buildTemplates(listing({ landlordType }), DEFAULT_SETTINGS)
    const opens = (status: Listing['status']) => openingTemplate(templates, status).id

    test(`${landlordType}: every status opens on a message that exists`, () => {
      for (const s of STATUSES) assert.ok(templates.some(t => t.id === opens(s)), s)
    })
    test(`${landlordType}: only a Lead or a Passed listing opens on the first message`, () => {
      const first = STATUSES.filter(s => openingTemplate(templates, s).kind === 'initial')
      assert.deepEqual(first, ['Lead', 'Passed'])
    })
    test(`${landlordType}: the message follows the status`, () => {
      assert.equal(opens('Inquired'), 'nudge-24h')
      assert.equal(opens('Tour booked'), 'confirm-tour')
      assert.equal(opens('Toured'), 'post-tour')
    })
  }
})
