'use client'

import { useState } from 'react'
import { ParseOutcome, Parser } from '@/lib/client/parser'
import { Listing, emptyListing } from '@/lib/types'
import Sheet from './Sheet'

export default function PasteParse({
  parser, onClose, onParsed,
}: {
  parser: Parser
  onClose: () => void
  onParsed: (l: Listing) => void
}) {
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // A result that came with a note waits here until the user has read it.
  const [noted, setNoted] = useState<ParseOutcome | null>(null)

  const parse = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const outcome = await parser.parse(text, url)
      if (outcome.note) setNoted(outcome)
      else onParsed(outcome.listing)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Parse failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet title="Add listing" onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm text-slate-500">
          On the listing page: select all (⌘A / long-press → Select All), copy, then paste here.
          Claude fills in the form; you correct anything wrong and save.
        </p>
        {parser.samplePaste && (
          <button
            data-tour="sample"
            onClick={() => {
              setUrl(parser.samplePaste!.url)
              setText(parser.samplePaste!.text)
              setNoted(null)
            }}
            className="text-sm font-medium text-slate-700 underline underline-offset-2"
          >
            Try a sample listing
          </button>
        )}
        <input
          type="url"
          value={url}
          onChange={e => {
            setUrl(e.target.value)
            setNoted(null)
          }}
          placeholder="Listing URL"
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
        />
        <textarea
          value={text}
          onChange={e => {
            setText(e.target.value)
            setNoted(null)
          }}
          placeholder="Paste the whole page text here…"
          rows={10}
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
        />
        {error && <p className="text-sm text-rose-600">{error}</p>}
        {noted ? (
          <>
            <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-900">{noted.note}</p>
            <button
              onClick={() => onParsed(noted.listing)}
              className="w-full rounded-xl bg-slate-900 py-3 font-semibold text-white"
            >
              Continue
            </button>
          </>
        ) : (
          <button
            onClick={parse}
            disabled={busy || text.trim().length < 40}
            className="w-full rounded-xl bg-slate-900 py-3 font-semibold text-white disabled:opacity-40"
          >
            {busy ? 'Parsing… (takes a few seconds)' : 'Parse with Claude'}
          </button>
        )}
        <button
          onClick={() => onParsed({ ...emptyListing(), url })}
          className="w-full rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-600 active:bg-slate-50"
        >
          Skip and enter manually
        </button>
      </div>
    </Sheet>
  )
}
