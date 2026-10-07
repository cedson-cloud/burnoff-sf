import { timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'
import { mode } from './mode'
import { PARSE_MODEL } from './parse-schema'

// Thin protection over an unguessable URL — deliberately not real auth.
function checkPass(req: Request): NextResponse | null {
  const expected = process.env.BOARD_PASSCODE
  if (!expected) return NextResponse.json({ error: 'BOARD_PASSCODE not configured' }, { status: 500 })
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
