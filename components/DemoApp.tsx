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
import Walkthrough from './Walkthrough'
import Welcome, { welcomeDismissed } from './Welcome'

const OWN_KEY = 'burnoff:own-board'

// Whether this browser's board is the visitor's own (started blank or imported)
// rather than the sample. It sets the banner and data-control copy and hides the welcome.
const ownBoard = {
  get(): boolean {
    try {
      return localStorage.getItem(OWN_KEY) === '1'
    } catch {
      return false
    }
  },
  set(own: boolean) {
    try {
      if (own) localStorage.setItem(OWN_KEY, '1')
      else localStorage.removeItem(OWN_KEY)
    } catch {}
  },
}

// Live parsing with no passcode; any failure falls back to a sample with a note.
const parser = withSampleFallback(liveParser(null), SAMPLES)

// Demo-mode composition root: the board lives in this browser, seeded with an
// invented search that a visitor can swap for a blank board of their own. The store reads localStorage, so it's built after mount. A first
// visit gets the welcome block, which offers the walkthrough rather than opening it.
export default function DemoApp() {
  const [store, setStore] = useState<LocalStore | null>(null)
  const [touring, setTouring] = useState(false)
  const [welcomeHidden, setWelcomeHidden] = useState(true)
  const [own, setOwn] = useState(false)
  const hideWelcome = (hidden: boolean) => {
    welcomeDismissed.set(hidden)
    setWelcomeHidden(hidden)
  }
  // Going back to the sample brings the welcome back with it.
  const markOwn = (mine: boolean) => {
    ownBoard.set(mine)
    setOwn(mine)
    if (!mine) hideWelcome(false)
  }

  useEffect(() => {
    setStore(localStore({ storage: browserStorage, seed: demoSeed(new Date()) }))
    setWelcomeHidden(welcomeDismissed.get())
    setOwn(ownBoard.get())
  }, [])

  if (!store) return null
  const startOwn = () => {
    store.startBlank()
    markOwn(true)
  }
  return (
    <Board
      store={store}
      parser={parser}
      slots={{
        top: <DemoBanner own={own} onHelp={() => setTouring(true)} />,
        intro: !welcomeHidden && !own && (
          <Welcome onTour={() => setTouring(true)} onDismiss={() => hideWelcome(true)} onStartOwn={startOwn} />
        ),
        settings: <DemoDataControls store={store} own={own} onStartOwn={startOwn} onOwnChange={markOwn} />,
        overlay: touring && <Walkthrough store={store} onClose={() => setTouring(false)} />,
      }}
    />
  )
}
