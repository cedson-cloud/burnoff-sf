'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getStoredBoard } from '@/lib/client/api'

// Real mode's site root. It never names the board (anyone can load `/`), so a device
// that has opened the board before goes back to it, and everyone else gets a dead end.
// Home-screen installs launch here (the manifest's start_url is `/`).
export default function RootRedirect() {
  const router = useRouter()
  const [unknown, setUnknown] = useState(false)

  useEffect(() => {
    const boardId = getStoredBoard()
    if (boardId) router.replace(`/b/${encodeURIComponent(boardId)}`)
    else setUnknown(true)
  }, [router])

  if (!unknown) return null
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-900 px-6">
      <div className="w-full max-w-xs text-center">
        <h1 className="text-2xl font-bold text-white">Burnoff</h1>
        <p className="mt-2 text-sm text-slate-400">
          Open your board from the link you were sent. After that, this address opens it on this device.
        </p>
      </div>
    </main>
  )
}
