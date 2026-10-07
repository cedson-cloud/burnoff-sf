'use client'

import { useState } from 'react'
import { ParseOutcome, Parser } from '@/lib/client/parser'
import { Listing, emptyListing } from '@/lib/types'
import { Field, inputCls } from './Field'
import Icon from './Icon'
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

  const ready = text.trim().length >= 40

  return (
    <Sheet title="Add listing" onClose={onClose}>
      <div className="space-y-5">
        <div>
          <p className="text-[17px] leading-snug">
            Copy everything on the listing page and paste it here. Claude reads the text and fills in rent, fees,
            parking and units. Anything the page doesn’t say stays blank.
          </p>
          <ol className="mt-3 space-y-1.5 text-[15px] text-ink-2">
            {[
              'Open the listing in another tab.',
              'Select everything and copy it. On a computer press ⌘A, then ⌘C. On a phone, long-press the text, tap Select All, then Copy.',
              'Paste it below.',
            ].map((step, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="grid size-6 flex-none place-items-center rounded-full bg-ink/8 text-[13px] font-semibold text-ink">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {parser.samplePaste && (
          <button
            type="button"
            data-tour="sample"
            onClick={() => {
              setUrl(parser.samplePaste!.url)
              setText(parser.samplePaste!.text)
              setNoted(null)
            }}
            className="flex min-h-14 w-full items-center gap-3 rounded-control px-4 text-left control-outline active:bg-well"
          >
            <Icon name="paste" className="flex-none" />
            <span className="flex-1">
              <span className="block font-semibold">Try a sample listing</span>
              <span className="block text-[13.5px] text-ink-2">Fills the box with a real-looking listing page</span>
            </span>
          </button>
        )}

        <Field label="Listing page text">
          <textarea
            value={text}
            onChange={e => {
              setText(e.target.value)
              setNoted(null)
            }}
            placeholder="Paste the whole page here"
            rows={8}
            // A fixed, roomy box rather than textareaCls: pasted pages are long.
            className={`${inputCls} py-2.5`}
          />
        </Field>
        <Field label="Link to the listing (optional)">
          <input
            type="url"
            value={url}
            onChange={e => {
              setUrl(e.target.value)
              setNoted(null)
            }}
            placeholder="https://"
            className={inputCls}
          />
        </Field>

        {error && <p className="text-[15px] font-medium text-alarm">{error}</p>}
        {noted ? (
          <>
            <p className="rounded-inset bg-well px-4 py-3 text-[15px]">{noted.note}</p>
            <button
              onClick={() => onParsed(noted.listing)}
              className="min-h-12 w-full rounded-control btn-primary"
            >
              Continue
            </button>
          </>
        ) : (
          <div>
            <button
              onClick={parse}
              disabled={busy || !ready}
              aria-busy={busy}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control btn-primary disabled:cursor-not-allowed disabled:bg-sun/45"
            >
              {busy && <Icon name="sync" size={18} className="animate-spin" />}
              {busy ? 'Reading the page…' : 'Fill in with Claude'}
            </button>
            <p aria-live="polite" className="mt-2 text-center text-[13.5px] text-ink-2">
              {busy ? 'This takes a few seconds. Nothing is saved until you tap Save.' : ready ? 'You can check and fix every field before saving.' : 'Paste the page text to continue.'}
            </p>
          </div>
        )}
        <button
          onClick={() => onParsed({ ...emptyListing(), url })}
          className="mx-auto block min-h-11 text-[15px] font-semibold text-ink-2 underline underline-offset-[3px]"
        >
          Enter it by hand
        </button>
      </div>
    </Sheet>
  )
}
