'use client'

import { createContext, useContext } from 'react'

export type View = 'rank' | 'now' | 'week' | 'settings'
export type EditorSection = 'messages'

// What Board's slots may do to the board: move between views and open its
// sheets. The walkthrough drives the board only through this, never Board's state.
export type BoardNav = {
  go(view: View): void
  openPaste(): void
  openListing(id: string, section?: EditorSection): void
}

export const BoardNavContext = createContext<BoardNav | null>(null)

export function useBoardNav(): BoardNav {
  const nav = useContext(BoardNavContext)
  if (!nav) throw new Error('useBoardNav must be used inside Board')
  return nav
}
