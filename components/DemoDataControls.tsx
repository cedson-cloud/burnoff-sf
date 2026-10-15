'use client'

import { useRef, useState } from 'react'
import { LocalStore } from '@/lib/client/local-store'

// Your criteria extras for the demo board. They call the concrete localStore, which
// only DemoApp holds; Board just renders this in its settings slot. `own` is whether
// the board is the visitor's (started blank or imported) or still the sample.
export default function DemoDataControls({
  store, own, onStartOwn, onOwnChange,
}: {
  store: LocalStore
  own: boolean
  onStartOwn: () => void
  onOwnChange: (own: boolean) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const exportFile = () => {
    const blob = new Blob([store.exportJSON()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `burnoff-board-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    setMessage({ ok: true, text: 'Exported. Import the file here or on another device to pick up where you left off.' })
  }

  const importFile = async (file: File) => {
    const r = store.importJSON(await file.text())
    if (r.ok) onOwnChange(true)
    setMessage(r.ok ? { ok: true, text: `Imported ${file.name}.` } : { ok: false, text: r.error })
  }

  const startBlank = () => {
    const ask = own
      ? 'Clear your board and start over? Your listings and criteria will be lost. Export first to keep a copy.'
      : 'Clear the sample and start an empty board? You can load the sample again anytime.'
    if (!confirm(ask)) return
    onStartOwn()
    setMessage({ ok: true, text: 'Started an empty board. Set your budget, commute and move-in dates above, then save.' })
  }

  const loadSample = () => {
    const ask = own
      ? 'Replace your board with the sample? Your listings and criteria will be lost. Export first to keep a copy.'
      : 'Reset the sample board? Your changes to listings and criteria will be lost.'
    if (!confirm(ask)) return
    store.reset()
    onOwnChange(false)
    setMessage({ ok: true, text: 'Back to the sample board.' })
  }

  const btn = 'min-h-11 rounded-control text-[15px] font-semibold control-outline active:bg-well'

  return (
    <section className="border-t border-line pt-6">
      <h2 className="text-[15px] font-semibold">{own ? 'Your board' : 'Your sample board'}</h2>
      <p className="mt-0.5 text-sm text-ink-2">
        Everything here is saved in this browser only. Nothing is sent to a server except the page text you
        ask Claude to read.{' '}
        {own
          ? 'Clearing this site’s data in your browser deletes the board, so export a copy now and then. Import it here or on another device to pick up where you left off.'
          : 'Searching for real? Start empty to clear the sample and use Burnoff for your own search.'}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={exportFile} className={btn}>
          Export
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} className={btn}>
          Import
        </button>
        <button type="button" onClick={startBlank} className={`${btn} ${own ? 'text-alarm' : ''}`}>
          {own ? 'Start over' : 'Start empty'}
        </button>
        <button type="button" onClick={loadSample} className={`${btn} text-alarm`}>
          {own ? 'Load sample' : 'Reset sample'}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          e.target.value = '' // so picking the same file again still fires
          if (file) void importFile(file)
        }}
      />
      {message && (
        <p className={`mt-3 text-sm ${message.ok ? 'text-ink-2' : 'text-alarm'}`}>{message.text}</p>
      )}
    </section>
  )
}
