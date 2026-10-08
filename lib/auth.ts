import { timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'
import { mode } from './mode'
import { PARSE_MODEL } from './parse-schema'

// Nothing rate-limits wrong guesses, so the passcode's length is what stops guessing.
// A too-short passcode keeps the board shut rather than open.
export const MIN_PASSCODE_LENGTH = 12

// Thin protection over an unguessable URL — deliberately not real auth.
function checkPass(req: Request): NextResponse | null {
  const expected = process.env.BOARD_PASSCODE
  if (!expected) return NextResponse.json({ error: 'BOARD_PASSCODE not configured' }, { status: 500 })
  if (expected.length < MIN_PASSCODE_LENGTH) {
    return NextResponse.json(
      { error: `BOARD_PASSCODE must be at least ${MIN_PASSCODE_LENGTH} characters` },
      { status: 500 },
    )
  }
  const got = req.headers.get('x-board-pass') ?? ''
  const a = Buffer.from(got)
  const b = Buffer.from(expected)
  const ok = a.length === b.length && timingSafeEqual(a, b)
  if (!ok) return NextResponse.json({ error: 'Bad or missing passcode' }, { status: 401 })
  return null
}

// Routes only serve the one configured board; anything else 404s so the API
// can't be used to read or write arbitrary Redis keys.
function checkBoard(boardId: string): NextResponse | null {
  if (boardId !== process.env.BOARD_ID) {
    return NextResponse.json({ error: 'Unknown board' }, { status: 404 })
  }
  return null
}

// Every board route calls this first. Demo mode has no server-side board (it
// lives in the visitor's browser), so the routes don't exist there.
// The passcode is checked before the board id, and the client relies on that
// order: a 404 with a passcode means "right passcode, no such board", which
// shows "No board at this link" instead of the passcode prompt.
export function guardBoard(req: Request, boardId: string): NextResponse | null {
  if (mode() === 'demo') return NextResponse.json({ error: 'Unknown board' }, { status: 404 })
  return checkPass(req) ?? checkBoard(boardId)
}

export type ParseLimits = { maxChars: number; model: string }

// A whole Zillow page paste is typically 20-80k chars; cap what we send so a
// pathological paste can't run up tokens. The listing content is near the top.
// The public demo has no passcode, so its cap is tighter.
const MAX_CHARS = { real: 60_000, demo: 15_000 }

export function guardParse(req: Request): { denied: NextResponse } | { limits: ParseLimits } {
  const m = mode()
  if (m === 'real') {
    const denied = checkPass(req)
    if (denied) return { denied }
  }
  return { limits: { maxChars: MAX_CHARS[m], model: process.env.PARSE_MODEL || PARSE_MODEL } }
}

// "Find it with Claude" (app/api/find): the same passcode rule as parsing, and the
// same model. Its spend is capped by its own key (FIND_ANTHROPIC_API_KEY) where set,
// so a busy demo can run out of lookups without breaking paste.
export function guardFind(req: Request): { denied: NextResponse } | { model: string } {
  if (mode() === 'real') {
    const denied = checkPass(req)
    if (denied) return { denied }
  }
  return { model: process.env.PARSE_MODEL || PARSE_MODEL }
}
