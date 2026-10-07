'use client'

import { useEffect, useState } from 'react'
import { browserStorage } from '@/lib/client/browser-storage'
import { LocalStore, localStore } from '@/lib/client/local-store'
import { liveParser, withSampleFallback } from '@/lib/client/parser'
import { demoSeed } from '@/lib/demo-seed'
import { SAMPLES } from '@/lib/parse-samples'
import Board from './Board'
import DemoBanner from './DemoBanner'
import DemoDataControls from './DemoDataControls'
import Walkthrough, { walkthroughSeen } from './Walkthrough'

// Live parsing with no passcode; any failure falls back to a sample with a note.
const parser = withSampleFallback(liveParser(null), SAMPLES)

// Demo-mode composition root: the board lives in this browser, seeded with an
// invented search. The store reads localStorage, so it's built after mount.
export default function DemoApp() {
  const [store, setStore] = useState<LocalStore | null>(null)
  const [touring, setTouring] = useState(false)

  useEffect(() => {
    setStore(localStore({ storage: browserStorage, seed: demoSeed(new Date()) }))
    if (!walkthroughSeen()) setTouring(true)
  }, [])

  if (!store) return null
  return (
    <Board
      store={store}
      parser={parser}
      slots={{
        top: <DemoBanner onHelp={() => setTouring(true)} />,
        settings: <DemoDataControls store={store} />,
        overlay: touring && <Walkthrough store={store} onClose={() => setTouring(false)} />,
      }}
    />
  )
}
