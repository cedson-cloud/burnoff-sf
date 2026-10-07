'use client'

import { useState } from 'react'
import { ApiError } from '@/lib/client/api'

export default function PasscodeGate({ onSubmit }: { onSubmit: (pass: string) => Promise<void> }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-900 px-6">
      <form
        className="w-full max-w-xs"
        onSubmit={async e => {
          e.preventDefault()
          if (!value.trim() || busy) return
          setBusy(true)
          setError(null)
          try {
            await onSubmit(value.trim())
          } catch (err) {
            setError(gateError(err))
          } finally {
            setBusy(false)
          }
        }}
      >
        <h1 className="text-center text-2xl font-bold text-white">Burnoff</h1>
        <p className="mt-2 text-center text-sm text-slate-400">
          Enter the board passcode. No account needed. You only do this once on each device.
        </p>
        <input
          type="password"
          autoComplete="current-password"
          autoFocus
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Passcode"
          className="mt-6 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-center text-white placeholder-slate-500 outline-none focus:border-slate-500"
        />
        {error && <p className="mt-3 text-center text-sm text-rose-400">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="mt-4 w-full rounded-xl bg-white py-3 font-semibold text-slate-900 disabled:opacity-50"
        >
          {busy ? 'Checking…' : 'Open board'}
        </button>
      </form>
    </main>
  )
}

// Only a 401 means the passcode is wrong; anything else is the network or server.
function gateError(err: unknown): string {
  if (err instanceof ApiError && err.status === 401) return 'That passcode didn’t work. Check it and try again.'
  if (err instanceof ApiError && err.status === 0) return 'Couldn’t reach the server. Check your connection and try again.'
  const detail = err instanceof Error && err.message ? ` (${err.message})` : ''
  return `The board isn’t responding right now${detail}. That’s a server problem, not your passcode. Try again in a minute.`
}
