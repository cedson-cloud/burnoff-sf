'use client'

import { useRef, useState } from 'react'
import { LocalStore } from '@/lib/client/local-store'

// Settings extras for the demo board. They call the concrete localStore, which
// only DemoApp holds; Board just renders this in its settings slot.
export default function DemoDataControls({ store }: { store: LocalStore }) {
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

  const btn = 'flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 active:bg-slate-50'

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-bold">Your demo board</h2>
      <p className="mt-1 text-xs text-slate-500">
        Everything here is saved in this browser only. Nothing is sent to a server except the page text you
        ask Claude to parse. Export a file to keep a copy or move it to another device.
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
            if (!confirm('Reset the demo? Your listings and settings will be replaced with the sample board.')) return
            store.reset()
            setMessage({ ok: true, text: 'Back to the sample board.' })
          }}
          className="flex-1 rounded-xl border border-rose-200 py-2.5 text-sm font-medium text-rose-600 active:bg-rose-50"
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
        <p className={`mt-3 text-xs ${message.ok ? 'text-slate-600' : 'text-rose-600'}`}>{message.text}</p>
      )}
    </section>
  )
}
