import { NextResponse } from 'next/server'
import { guardBoard } from '@/lib/auth'
import { metaKey, redis } from '@/lib/redis'
import { Settings } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PUT(req: Request, ctx: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await ctx.params
  const denied = guardBoard(req, boardId)
  if (denied) return denied

  let settings: Settings
  try {
    settings = (await req.json()) as Settings
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (!settings?.criteria || !settings?.profile) {
    return NextResponse.json({ error: 'Malformed settings' }, { status: 400 })
  }

  settings.updatedAt = Date.now()
  await redis().set(metaKey(boardId), settings)
  return NextResponse.json({ ok: true, settings })
}
