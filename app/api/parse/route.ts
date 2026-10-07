import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { NextResponse } from 'next/server'
import { guardParse } from '@/lib/auth'
import { PARSE_SYSTEM_PROMPT, ParsedListingSchema, parseUserMessage } from '@/lib/parse-schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Vercel Hobby allows up to 60s for a function

export async function POST(req: Request) {
  // Passcode, input cap and model depend on the mode; see lib/auth.ts.
  const guard = guardParse(req)
  if ('denied' in guard) return guard.denied
  const { maxChars, model } = guard.limits

  let body: { pageText?: string; url?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const pageText = (body.pageText ?? '').trim()
  const url = (body.url ?? '').trim()
  if (pageText.length < 40) {
    return NextResponse.json({ error: 'Paste the full page text (select all → copy on the listing page).' }, { status: 400 })
  }

  const client = new Anthropic() // reads ANTHROPIC_API_KEY server-side
  try {
    const message = await client.messages.parse({
      model,
      max_tokens: 8192,
      system: PARSE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: parseUserMessage(pageText, url, maxChars) }],
      output_config: { format: zodOutputFormat(ParsedListingSchema) },
    })

    if (message.stop_reason === 'refusal' || !message.parsed_output) {
      return NextResponse.json({ error: 'Could not extract listing data from that paste.' }, { status: 422 })
    }
    return NextResponse.json({ parsed: message.parsed_output })
  } catch (err) {
    const msg = err instanceof Anthropic.APIError ? `${err.status}: ${err.message}` : 'Parse request failed'
    console.error('parse error', err)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
