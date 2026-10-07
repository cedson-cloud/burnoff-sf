import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mode } from './mode'

function withMode(value: string | undefined, fn: () => void) {
  const saved = process.env.BURNOFF_MODE
  if (value === undefined) delete process.env.BURNOFF_MODE
  else process.env.BURNOFF_MODE = value
  try {
    fn()
  } finally {
    if (saved === undefined) delete process.env.BURNOFF_MODE
    else process.env.BURNOFF_MODE = saved
  }
}

test('unset is real', () => withMode(undefined, () => assert.equal(mode(), 'real')))
test('"real" is real', () => withMode('real', () => assert.equal(mode(), 'real')))
test('"demo" is demo', () => withMode('demo', () => assert.equal(mode(), 'demo')))

test('anything else is real', () => {
  for (const junk of ['', 'DEMO', ' demo', 'demo ', 'true', '1', 'prod']) {
    withMode(junk, () => assert.equal(mode(), 'real', JSON.stringify(junk)))
  }
})
