import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { FIND_BLOCKED_DOMAINS, FIND_TOOLS, FoundListingSchema, MAX_DETAILS_CHARS, findStructureMessage, findUserMessage, sourcesNote } from './find'
import { MAX_URL_CHARS } from './parse-schema'

describe('find research', () => {
  test('both web tools skip the listing sites', () => {
    for (const t of FIND_TOOLS) assert.deepEqual(t.blocked_domains, FIND_BLOCKED_DOMAINS)
    assert.ok(FIND_BLOCKED_DOMAINS.includes('zillow.com') && FIND_BLOCKED_DOMAINS.includes('redfin.com'))
  })

  test('the message carries the link and what the person can see, capped', () => {
    const msg = findUserMessage('https://example.com/a', '100 Example St, 1bd $5,640')
    assert.ok(msg.includes('https://example.com/a') && msg.includes('100 Example St, 1bd $5,640'))
    const long = findUserMessage('u'.repeat(MAX_URL_CHARS + 50), 'd'.repeat(MAX_DETAILS_CHARS + 50))
    assert.ok(!long.includes('u'.repeat(MAX_URL_CHARS + 1)))
    assert.ok(!long.includes('d'.repeat(MAX_DETAILS_CHARS + 1)))
  })
})

describe('found listing', () => {
  test('the schema is the parse schema plus sources and questions', () => {
    const shape = FoundListingSchema.shape
    assert.ok('units' in shape && 'sources' in shape && 'askAbout' in shape && 'seenUnit' in shape)
  })

  test('the structure step sees what the person can see, to pick their unit', () => {
    const msg = findStructureMessage('REPORT', '1 bed, $5,640')
    assert.ok(msg.includes('1 bed, $5,640') && msg.includes('REPORT'))
  })

  test('sources become a note, one line each', () => {
    assert.equal(sourcesNote([]), '')
    assert.equal(
      sourcesNote([{ what: 'Rent $5,895 for unit 204', url: 'https://rentbt.com/listing/204' }]),
      'Found on the web:\n- Rent $5,895 for unit 204 (https://rentbt.com/listing/204)',
    )
  })
})
