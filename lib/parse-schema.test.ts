import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { MAX_URL_CHARS, parseUserMessage } from './parse-schema'

describe('parseUserMessage', () => {
  test('caps the page text at maxChars', () => {
    const msg = parseUserMessage('Q'.repeat(500), 'https://example.com', 100)
    assert.equal(msg.match(/Q/g)?.length, 100)
  })

  test('caps the URL too, so it cannot carry a paste past the limit', () => {
    const msg = parseUserMessage('listing text', 'Z'.repeat(1_000_000), 100)
    assert.equal(msg.match(/Z/g)?.length, MAX_URL_CHARS)
  })

  test('marks a missing URL', () => {
    assert.match(parseUserMessage('listing text', '', 100), /^Listing URL: \(not provided\)\n/)
  })
})
