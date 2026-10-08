import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { MIN_PASSCODE_LENGTH, guardBoard, guardFind, guardParse } from './auth'
import { PARSE_MODEL } from './parse-schema'

const KEYS = ['BURNOFF_MODE', 'BOARD_ID', 'BOARD_PASSCODE', 'PARSE_MODEL'] as const
type Env = Partial<Record<(typeof KEYS)[number], string>>

// Runs fn with exactly these env vars set (the rest of KEYS unset), then restores them.
async function withEnv(env: Env, fn: () => void | Promise<void>) {
  const saved = Object.fromEntries(KEYS.map(k => [k, process.env[k]]))
  for (const k of KEYS) {
    if (env[k] === undefined) delete process.env[k]
    else process.env[k] = env[k]
  }
  try {
    await fn()
  } finally {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k]
      else process.env[k] = saved[k]
    }
  }
}

const PASS = 'open-sesame-123'
const REAL: Env = { BOARD_ID: 'board-1', BOARD_PASSCODE: PASS }
const DEMO: Env = { BURNOFF_MODE: 'demo' }

const req = (pass?: string) =>
  new Request('http://localhost/api/x', { headers: pass === undefined ? {} : { 'x-board-pass': pass } })

describe('guardBoard, real mode', () => {
  test('401 for a missing pass', () =>
    withEnv(REAL, async () => {
      const res = guardBoard(req(), 'board-1')
      assert.equal(res?.status, 401)
      assert.deepEqual(await res?.json(), { error: 'Bad or missing passcode' })
    }))

  test('401 for a wrong pass, including one of a different length', () =>
    withEnv(REAL, () => {
      assert.equal(guardBoard(req('open-sesame-124'), 'board-1')?.status, 401)
      assert.equal(guardBoard(req('open-sesame-123!'), 'board-1')?.status, 401)
    }))

  test('404 for the wrong board', () =>
    withEnv(REAL, async () => {
      const res = guardBoard(req(PASS), 'board-2')
      assert.equal(res?.status, 404)
      assert.deepEqual(await res?.json(), { error: 'Unknown board' })
    }))

  test('null for the right pass and board', () =>
    withEnv(REAL, () => assert.equal(guardBoard(req(PASS), 'board-1'), null)))

  test('500 when BOARD_PASSCODE is not configured', () =>
    withEnv({ BOARD_ID: 'board-1' }, async () => {
      const res = guardBoard(req(PASS), 'board-1')
      assert.equal(res?.status, 500)
      assert.deepEqual(await res?.json(), { error: 'BOARD_PASSCODE not configured' })
    }))

  test('500 for a configured passcode under the minimum, even when it is sent correctly', () =>
    withEnv({ BOARD_ID: 'board-1', BOARD_PASSCODE: '1234' }, async () => {
      const res = guardBoard(req('1234'), 'board-1')
      assert.equal(res?.status, 500)
      assert.deepEqual(await res?.json(), { error: `BOARD_PASSCODE must be at least ${MIN_PASSCODE_LENGTH} characters` })
      const g = guardParse(req('1234'))
      assert.ok('denied' in g)
      assert.equal(g.denied.status, 500)
    }))
})

describe('guardBoard, demo mode', () => {
  test('404 even with the right pass and board', () =>
    withEnv({ ...REAL, ...DEMO }, () => assert.equal(guardBoard(req(PASS), 'board-1')?.status, 404)))

  test('404 without any board env vars', () =>
    withEnv(DEMO, () => assert.equal(guardBoard(req(), 'anything')?.status, 404)))
})

describe('guardParse', () => {
  test('real mode: 401 without a pass', () =>
    withEnv(REAL, () => {
      const g = guardParse(req())
      assert.ok('denied' in g)
      assert.equal(g.denied.status, 401)
    }))

  test('real mode: 60k limits and the default model with a pass', () =>
    withEnv(REAL, () =>
      assert.deepEqual(guardParse(req(PASS)), { limits: { maxChars: 60_000, model: PARSE_MODEL } })))

  test('demo mode: no pass needed, 15k limits', () =>
    withEnv(DEMO, () => assert.deepEqual(guardParse(req()), { limits: { maxChars: 15_000, model: PARSE_MODEL } })))

  test('PARSE_MODEL env overrides the model in both modes', () =>
    withEnv({ ...REAL, PARSE_MODEL: 'claude-test-model' }, async () => {
      assert.deepEqual(guardParse(req(PASS)), { limits: { maxChars: 60_000, model: 'claude-test-model' } })
      await withEnv({ ...DEMO, PARSE_MODEL: 'claude-test-model' }, () =>
        assert.deepEqual(guardParse(req()), { limits: { maxChars: 15_000, model: 'claude-test-model' } }))
    }))
})

describe('guardFind', () => {
  test('real mode: 401 without a pass, the parse model with one', () =>
    withEnv(REAL, () => {
      const g = guardFind(req())
      assert.ok('denied' in g)
      assert.equal(g.denied.status, 401)
      assert.deepEqual(guardFind(req(PASS)), { model: PARSE_MODEL })
    }))

  test('demo mode: no pass needed', () => withEnv(DEMO, () => assert.deepEqual(guardFind(req()), { model: PARSE_MODEL })))
})
