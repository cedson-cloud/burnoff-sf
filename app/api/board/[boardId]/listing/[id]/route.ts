import { NextResponse } from 'next/server'
import { guardBoard } from '@/lib/auth'
import { boardKey, redis } from '@/lib/redis'
import { Listing } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ boardId: string; id: string }> }

export async function PUT(req: Request, ctx: Ctx) {
  const { boardId, id } = await ctx.params
  const denied = guardBoard(req, boardId)
  if (denied) return denied

  let listing: Listing
  try {
    listing = (await req.json()) as Listing
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (!listing || typeof listing !== 'object' || listing.id !== id) {
    return NextResponse.json({ error: 'Body id must match URL id' }, { status: 400 })
  }
  if (typeof listing.name !== 'string' || !Array.isArray(listing.units)) {
    return NextResponse.json({ error: 'Malformed listing' }, { status: 400 })
  }

  listing.updatedAt = Date.now()
  // One hash field per listing: concurrent edits to different listings never collide.
  await redis().hset(boardKey(boardId), { [id]: listing })
  return NextResponse.json({ ok: true, listing })
}

export async function DELETE(req: Request, ctx: Ctx) {
  const { boardId, id } = await ctx.params
  const denied = guardBoard(req, boardId)
  if (denied) return denied

  await redis().hdel(boardKey(boardId), id)
  return NextResponse.json({ ok: true })
}
