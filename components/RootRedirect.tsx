'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getStoredBoard } from '@/lib/client/api'
import Splash from './Splash'

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
    <Splash>
      <p className="mt-3 text-[15px] text-ink-2">
        Open your board from the link you were sent. After that, this address opens it on this device.
      </p>
    </Splash>
  )
}
