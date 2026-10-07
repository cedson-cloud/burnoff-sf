'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { clearPass, fetchBoard, getStoredPass, httpApi, storeBoard, storePass } from '@/lib/client/api'
import { browserStorage } from '@/lib/client/browser-storage'
import { Parser, liveParser } from '@/lib/client/parser'
import { BoardStore, remoteStore } from '@/lib/client/store'
import Board from './Board'
import PasscodeGate from './PasscodeGate'

// Real-mode composition root: owns the passcode and builds a remoteStore for it. A new
// passcode means a new store; a 401 from the store sends us back to the gate.
export default function RealApp({ boardId }: { boardId: string }) {
  const [pass, setPass] = useState<string | null | undefined>(undefined) // undefined = not yet read
  useEffect(() => setPass(getStoredPass()), [])

  const store = useMemo(
    () => (pass ? remoteStore({ boardId, api: httpApi(boardId, pass), storage: browserStorage }) : null),
    [boardId, pass],
  )
  const parser = useMemo(() => (pass ? liveParser(pass) : null), [pass])

  if (pass === undefined) return null
  if (!store || !parser) {
    return (
      <PasscodeGate
        onSubmit={async p => {
          await fetchBoard(boardId, p) // throws on bad pass
          storePass(p)
          setPass(p)
        }}
      />
    )
  }
  return (
    <Unlocked
      boardId={boardId}
      store={store}
      parser={parser}
      onLocked={() => {
        clearPass()
        setPass(null)
      }}
    />
  )
}

function Unlocked({ boardId, store, parser, onLocked }: {
  boardId: string
  store: BoardStore
  parser: Parser
  onLocked: () => void
}) {
  const access = useSyncExternalStore(store.subscribe, () => store.getSnapshot().access, () => 'loading' as const)
  const locked = access === 'locked'
  useEffect(() => {
    if (locked) onLocked()
  }, [locked, onLocked])
  // Only a board that loaded is worth sending this device back to from the site root.
  useEffect(() => {
    if (access === 'ready') storeBoard(boardId)
  }, [access, boardId])
  return locked ? null : <Board store={store} parser={parser} />
}
