import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { NextResponse } from 'next/server'
import { guardFind } from '@/lib/auth'
import {
  FIND_RESEARCH_PROMPT, FIND_STRUCTURE_PROMPT, FIND_TOOLS, FoundListingSchema, MIN_DETAILS_CHARS, findStructureMessage,
  findUserMessage,
} from '@/lib/find'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // a lookup takes one to two minutes; Hobby with Fluid compute allows 300s

// Server tools can pause a long turn; each pass continues it.
const MAX_PASSES = 4

export async function POST(req: Request) {
  const guard = guardFind(req)
  if ('denied' in guard) return guard.denied
  const { model } = guard

  let body: { url?: string; details?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const url = (body.url ?? '').trim()
  const details = (body.details ?? '').trim()
  if (!url || details.length < MIN_DETAILS_CHARS) {
    return NextResponse.json({ error: 'Add the listing’s link and its address, then try again.' }, { status: 400 })
  }

  // Its own key where set, so lookups have their own spend cap.
  const client = new Anthropic({ apiKey: process.env.FIND_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY })
  try {
    // 1. Research: search and read the open web, write a sourced report.
    const messages: Anthropic.MessageParam[] = [{ role: 'user', content: findUserMessage(url, details) }]
    let research: Anthropic.Message | null = null
    for (let pass = 0; pass < MAX_PASSES; pass++) {
      research = await client.messages.create({ model, max_tokens: 8192, system: FIND_RESEARCH_PROMPT, tools: FIND_TOOLS, messages })
      if (research.stop_reason !== 'pause_turn') break
      messages.push({ role: 'assistant', content: research.content })
    }
    const report = (research?.content ?? []).flatMap(b => (b.type === 'text' ? [b.text] : [])).join('').trim()
    if (!research || research.stop_reason === 'refusal' || report.length < 40) {
      return NextResponse.json({ error: 'Claude couldn’t find this listing on the web. Paste the page text instead, or add it by hand.' }, { status: 422 })
    }

    // 2. Structure: the report becomes listing fields, sources and questions.
    const structured = await client.messages.parse({
      model,
      max_tokens: 8192,
      system: FIND_STRUCTURE_PROMPT,
      messages: [{ role: 'user', content: findStructureMessage(report, details) }],
      output_config: { format: zodOutputFormat(FoundListingSchema) },
    })
    if (structured.stop_reason === 'refusal' || !structured.parsed_output) {
      return NextResponse.json({ error: 'Claude couldn’t find this listing on the web. Paste the page text instead, or add it by hand.' }, { status: 422 })
    }
    return NextResponse.json({ found: structured.parsed_output })
  } catch (err) {
    const msg = err instanceof Anthropic.APIError ? `${err.status}: ${err.message}` : 'Find request failed'
    console.error('find error', err)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
