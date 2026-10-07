'use client'

import { useState } from 'react'
import { ApiError } from '@/lib/client/api'
import { inputCls } from './Field'
import Splash from './Splash'

export default function PasscodeGate({ onSubmit }: { onSubmit: (pass: string) => Promise<void> }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  return (
    <Splash>
      <form
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
        <p className="mt-3 text-[15px] text-ink-2">
          Enter the board passcode. No account needed. You only do this once on each device.
        </p>
        <input
          type="password"
          autoComplete="current-password"
          autoFocus
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Passcode"
          className={`${inputCls} mt-6 min-h-12 text-center`}
        />
        {error && <p className="mt-3 text-sm font-medium text-alarm">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="mt-3 min-h-12 w-full rounded-control btn-primary disabled:opacity-50"
        >
          {busy ? 'Checking…' : 'Open board'}
        </button>
      </form>
    </Splash>
  )
}

// Only a 401 means the passcode is wrong; anything else is the network or server.
function gateError(err: unknown): string {
  if (err instanceof ApiError && err.status === 401) return 'That passcode didn’t work. Check it and try again.'
  if (err instanceof ApiError && err.status === 0) return 'Couldn’t reach the server. Check your connection and try again.'
  const detail = err instanceof Error && err.message ? ` (${err.message})` : ''
  return `The board isn’t responding right now${detail}. That’s a server problem, not your passcode. Try again in a minute.`
}
