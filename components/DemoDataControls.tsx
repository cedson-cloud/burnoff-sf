'use client'

import { useRef, useState } from 'react'
import { LocalStore } from '@/lib/client/local-store'

// Your criteria extras for the demo board. They call the concrete localStore, which
// only DemoApp holds; Board just renders this in its settings slot.
export default function DemoDataControls({ store, onReset }: { store: LocalStore; onReset: () => void }) {
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
    setMessage(r.ok ? { ok: true, text: `Imported ${file.name}.` } : { ok: false, text: r.error })
  }

  const btn = 'min-h-11 flex-1 rounded-control text-[15px] font-semibold control-outline active:bg-well'

  return (
    <section className="border-t border-line pt-6">
      <h2 className="text-[15px] font-semibold">Your sample board</h2>
      <p className="mt-0.5 text-sm text-ink-2">
        Everything here is saved in this browser only. Nothing is sent to a server except the page text you
        ask Claude to read. Export a file to keep a copy or move it to another device.
      </p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={exportFile} className={btn}>
          Export
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} className={btn}>
          Import
        </button>
        <button
          type="button"
          onClick={() => {
            if (!confirm('Reset the sample board? Your changes to listings and criteria will be lost.')) return
            store.reset()
            onReset()
            setMessage({ ok: true, text: 'Back to the sample board.' })
          }}
          className={`${btn} text-alarm`}
        >
          Reset
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
