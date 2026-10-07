import { NextResponse } from 'next/server'
import { guardBoard } from '@/lib/auth'
import { normalizeBoardData } from '@/lib/board-data'
import { boardKey, metaKey, redis } from '@/lib/redis'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request, ctx: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await ctx.params
  const denied = guardBoard(req, boardId)
  if (denied) return denied

  const r = redis()
  const p = r.pipeline()
  p.hgetall(boardKey(boardId))
  p.get(metaKey(boardId))
  const [listings, settings] = (await p.exec()) as [unknown, unknown]

  return NextResponse.json(normalizeBoardData({ listings, settings, serverTime: Date.now() }))
}
