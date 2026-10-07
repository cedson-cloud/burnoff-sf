'use client'

import { BoardData, Listing, Settings } from '../types'
import { ParsedListing } from '../parse-schema'
import type { RemoteApi } from './store'

const PASS_KEY = 'board-pass'

export function getStoredPass(): string | null {
  try {
    return localStorage.getItem(PASS_KEY)
  } catch {
    return null
  }
}

export function storePass(pass: string) {
  try {
    localStorage.setItem(PASS_KEY, pass)
  } catch {}
}

export function clearPass() {
  try {
    localStorage.removeItem(PASS_KEY)
  } catch {}
}

// The site root never names the board; a device that has opened it remembers where it is.
const BOARD_KEY = 'board-id'

export function getStoredBoard(): string | null {
  try {
    return localStorage.getItem(BOARD_KEY)
  } catch {
    return null
  }
}

export function storeBoard(boardId: string) {
  try {
    localStorage.setItem(BOARD_KEY, boardId)
  } catch {}
}

// Forget the remembered board, but only if it's this one: a mistyped link shouldn't
// erase the board this device really uses.
export function forgetBoard(boardId: string) {
  try {
    if (localStorage.getItem(BOARD_KEY) === boardId) localStorage.removeItem(BOARD_KEY)
  } catch {}
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

// A null pass sends no passcode header at all.
async function call<T>(path: string, pass: string | null, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(pass !== null ? { 'x-board-pass': pass } : {}),
        ...(init?.headers ?? {}),
      },
    })
  } catch {
    throw new ApiError(0, 'Network error') // offline / bad signal
  }
  if (!res.ok) {
    let msg = res.statusText
    try {
      const j = await res.json()
      if (j?.error) msg = j.error
    } catch {}
    throw new ApiError(res.status, msg)
  }
  return res.json() as Promise<T>
}

export const fetchBoard = (boardId: string, pass: string) =>
  call<BoardData>(`/api/board/${encodeURIComponent(boardId)}`, pass)

export const putListing = (boardId: string, pass: string, listing: Listing) =>
  call<{ ok: true }>(`/api/board/${encodeURIComponent(boardId)}/listing/${encodeURIComponent(listing.id)}`, pass, {
    method: 'PUT',
    body: JSON.stringify(listing),
  })

export const deleteListingApi = (boardId: string, pass: string, id: string) =>
  call<{ ok: true }>(`/api/board/${encodeURIComponent(boardId)}/listing/${encodeURIComponent(id)}`, pass, {
    method: 'DELETE',
  })

export const putSettings = (boardId: string, pass: string, settings: Settings) =>
  call<{ ok: true }>(`/api/board/${encodeURIComponent(boardId)}/settings`, pass, {
    method: 'PUT',
    body: JSON.stringify(settings),
  })

// The board API bound to one board and passcode, for remoteStore.
export const httpApi = (boardId: string, pass: string): RemoteApi => ({
  fetchBoard: () => fetchBoard(boardId, pass),
  putListing: l => putListing(boardId, pass, l),
  deleteListing: id => deleteListingApi(boardId, pass, id),
  putSettings: s => putSettings(boardId, pass, s),
})

export const parseListing = (pass: string | null, pageText: string, url: string) =>
  call<{ parsed: ParsedListing }>(`/api/parse`, pass, {
    method: 'POST',
    body: JSON.stringify({ pageText, url }),
  })
