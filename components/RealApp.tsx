'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { ApiError, clearPass, fetchBoard, forgetBoard, getStoredPass, httpApi, storeBoard, storePass } from '@/lib/client/api'
import { browserStorage } from '@/lib/client/browser-storage'
import { Parser, liveParser } from '@/lib/client/parser'
import { BoardStore, remoteStore } from '@/lib/client/store'
import Board from './Board'
import PasscodeGate from './PasscodeGate'
import Splash from './Splash'

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
          try {
            await fetchBoard(boardId, p) // throws on a bad passcode
          } catch (err) {
            // A 404 means the passcode was right but there's no such board. Accept the
            // passcode and let the store report the missing board, as it does on any load.
            if (!(err instanceof ApiError && err.status === 404)) throw err
          }
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
  // Only a board that loaded is worth sending this device back to from the site root,
  // and one the server doesn't have is forgotten (only if it's the one remembered).
  useEffect(() => {
    if (access === 'ready') storeBoard(boardId)
    if (access === 'missing') forgetBoard(boardId)
  }, [access, boardId])
  if (locked) return null
  if (access === 'missing') return <BoardMissing />
  return <Board store={store} parser={parser} />
}

function BoardMissing() {
  return (
    <Splash>
      <h2 className="mt-5 font-display text-xl font-semibold">No board at this link</h2>
      <p className="mt-2 text-[15px] text-ink-2">The board may have moved. Open the most recent link you were sent.</p>
    </Splash>
  )
}
