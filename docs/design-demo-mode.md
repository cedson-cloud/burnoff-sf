# Design: demo mode vs real mode

Burnoff runs in one of two modes from the same codebase and the same Vercel deployment model:

- **Real mode**: one shared board in Upstash Redis, gated by a passcode. For self-hosters.
- **Demo mode**: no passcode and no Redis. Each visitor's board lives in their browser's
  localStorage, and parse stays live. This is what runs on the public URL.

The goal is to choose the mode in as few places as possible, without `if (demo)` checks
spread through the code. That works out to **one switch point per tier**, and each one reads
the mode once:

1. **Client:** the composition roots pick the tree: `app/page.tsx` renders `<DemoApp />` or
   `RootRedirect`, and `app/b/[boardId]/page.tsx` renders `<RealApp />`.
   No client component reads the mode.
2. **Server:** the guards in `lib/auth.ts` decide what the API allows. The browser can't stop
   itself from calling Redis routes or spending parse tokens, so the server enforces the mode
   on its own.

Only the server pages (`app/page.tsx`, and `app/b/[boardId]/page.tsx` to redirect to `/` in
demo mode) and `lib/auth.ts` import `lib/mode.ts`.

## Hosting

Both modes deploy to Vercel Hobby. Mode is an environment variable, not a separate build.

| | Real mode | Demo mode |
|---|---|---|
| `BURNOFF_MODE` | unset or `real` | `demo` |
| `ANTHROPIC_API_KEY` | required | required: a separate workspace key with a spend cap |
| `BOARD_ID`, `BOARD_PASSCODE` | required | not used |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | required | not used |
| `PARSE_MODEL` (optional) | overrides the default model | overrides the default model |

The public URL runs demo mode. Self-hosters deploy their own copy in real mode.

## Why the code needs reshaping first

Today, `components/Board.tsx` contains the whole sync engine: the passcode state, the
flush-then-fetch loop, the poll merge that protects pending edits, 15s polling, the visibility
and online listeners, and the 401 handling. `lib/client/api.ts` and `lib/client/queue.ts` are
shallow, so Board has to know about passcodes, HTTP status codes and queue internals.
`PasteParse` reads the stored passcode directly.

If demo mode were added to this as it stands, mode checks would land in at least five places:
the gate, sync, the header indicator, polling and parse. Instead, storage and parsing each move
behind a small interface, and each mode gets its own adapter.

## Shared interface 1: `BoardStore` (`lib/client/store.ts`)

```ts
type BoardState = {
  access: 'loading' | 'ready' | 'locked' | 'missing' | { unreachable: string }
  listings: Listing[]
  settings: Settings
  pendingIds: Set<string>
  sync: { status: 'idle' | 'syncing' | 'offline' | 'error'; lastSync: number | null; pending: number } | null
}

interface BoardStore {
  getSnapshot(): BoardState
  subscribe(fn: () => void): () => void   // first subscriber starts polling, last one stops it
  upsertListing(l: Listing): void
  removeListing(id: string): void
  saveSettings(s: Settings): void
  refresh(): Promise<void>
}
```

Board uses it through `useSyncExternalStore` and needs to know nothing else about storage.

**`remoteStore({ boardId, pass, api, storage, now })`** handles everything Board does today:

- the write queue, including coalescing and serial flushing
- the poll merge that must not overwrite listings with pending ops
- 15s polling while the tab is visible, plus re-syncing on reconnect and on tab return
- `access: 'locked'` on a 401, `'missing'` on a 404 before the board has loaded, and
  `{ unreachable }` on a 5xx or network error. This is the
  phase-1 fix that lets the lock screen tell a bad passcode apart from a server or database
  error.

Its dependencies are passed in, so the queue and merge rules can be tested without React or a
server.

**`localStore({ storage, seed })`** writes synchronously to localStorage and returns
`sync: null`. When `sync` is null, the header's sync indicator doesn't render, so the header
needs no mode check.

## Shared interface 2: `Parser` (`lib/client/parser.ts`)

```ts
type ParseOutcome = { listing: Listing; origin: 'claude' | 'sample'; note?: string }

interface Parser {
  parse(text: string, url: string): Promise<ParseOutcome>
  samplePaste?: { url: string; text: string }   // when set, the sheet shows "Try a sample listing"
}
```

- `toListing` moves out of `PasteParse` and into this module, so callers get a `Listing` back.
- **`liveParser(pass | null)`** calls `/api/parse`. It is the same in both modes.
- **`withSampleFallback(parser, samples)`** wraps any parser. If the parse fails for any reason,
  it returns a sample result with an honest `note`. **This is used in demo mode only.** In real
  mode, a fallback would put an invented listing into someone's actual board.
- `PasteParse` shows the note when `note` is set, and the sample button when `samplePaste` is
  set. Both are checks on what the parser provides, not on the mode.

## Client switch point: composition roots

`app/page.tsx` is a server component. It reads `mode()` once and renders `DemoApp` or
`RootRedirect`; `app/b/[boardId]/page.tsx` renders `RealApp`. In demo mode, `/b/[id]` redirects to `/`.

| | `RealApp` | `DemoApp` |
|---|---|---|
| store | `remoteStore`, recreated on unlock | `localStore({ seed: demoSeed(new Date()) })` |
| parser | `liveParser(pass)` | `withSampleFallback(liveParser(null), SAMPLES)`. Find it with Claude passes through with no sample fallback, on the same capped key unless `FIND_ANTHROPIC_API_KEY` is set |
| lock state | `PasscodeGate` when `access` is `locked`; "No board at this link" when `missing` (and it forgets the stored `board-id` if it names this board); an "unreachable" screen otherwise | never locks |
| `slots.top` | nothing | `DemoBanner`: "Sample board. Your changes stay in this browser.", Deploy your own, and a ? that reopens the tour |
| `slots.intro` | nothing | `Welcome`: what Burnoff is, with Add listing and Take the tour; dismissed per browser |
| `slots.settings` | nothing | `DemoDataControls`: Reset, Export, Import |
| `slots.overlay` | nothing | `Walkthrough` |

Both roots render the same `<Board store parser slots />`.

**Rule: `BoardStore` contains only what Board needs.** Extras that belong to one mode are
called on the concrete adapter, which only its own root holds:

- `local.reset()`, `local.exportJSON()` and `local.importJSON()` are used by
  `DemoDataControls`.
- Unlocking with a passcode is handled by `RealApp`.

This keeps the shared interface small.

**Walkthrough.** Board renders its slots inside a small `BoardNav` context:

```ts
{ go(view), openPaste(), openListing(id, section?), openCriteria() }
```

Board also puts `data-tour` anchors on its tabs and sections. These are harmless in real mode.
The walkthrough (Ranked → Add listing → the message → To do) moves through the board using
only that context, never Board's internals. It is skippable. It opens from the welcome block's
"Take the tour" or the banner's "?", never on its own, and its card sits beside what it points
at rather than over it.

## Server switch point: `lib/mode.ts` + `lib/auth.ts`

```ts
export function mode(): 'real' | 'demo'       // reads BURNOFF_MODE

export function guardBoard(req, boardId)      // real: passcode + board check; demo: always 404
export function guardParse(req): { denied } | { limits: { maxChars, model } }
```

`guardBoard` replaces `checkPass(req) ?? checkBoard(boardId)` in the three board routes. New
board routes must call it.

`guardParse` handles the differences between modes:

- **Real:** passcode required, 60k-character input cap.
- **Demo:** no passcode, a much smaller input cap, and the model from `PARSE_MODEL` if it is set.

The parse route itself is the same in both modes. The demo's spend cap and usage alert are
configured on the Anthropic workspace, not in code.

## Phase-1 changes in this design

### One normalization step at every entry point

`normalizeBoardData(raw: unknown): BoardData` in `lib/board-data.ts` is validated with zod and
runs wherever data comes in:

- the server's GET route
- `localStore` loading from browser storage
- `importJSON`

Today only listings are normalized on read. Settings come back raw, so an old board that lacks
the new Profile fields would crash on `.trim()`. All rename shims live here, so Redis records,
browser storage and imported files all upgrade the same way.

### New Profile shape

```ts
type Profile = {
  yourName: string
  phone: string
  movingFrom: string
  moveInWindowText: string
  companionName: string    // "Searching with (optional)"; read from old partnerName
  companionPhrase: string  // how messages describe them: "my sister", "my cofounder"
  aboutUs: string          // free text; replaces partnerEmployer
  qualifications: string   // free text
}
```

- `partnerEmployer` is dropped rather than turned into generated copy. `aboutUs` replaces it.
- On listings, `partnerScore` becomes `companionScore`, and `owner: 'Partner'` becomes
  `'Companion'`. Both are mapped in `normalizeBoardData`.
- `lib/messages.ts` loses its hardcoded homeowner, mortgage and "partner's job" copy, and uses
  `aboutUs` and `qualifications` instead. Code defaults stay generic.

### `household(profile)`: one place for the solo-or-pair rule

```ts
household(profile) → { solo, we: 'I' | 'we', us, our, companion, companionLabel }
```

This function owns the fallback rule: phrase → name → solo "I". It is used by:

- `buildTemplates`
- the ListingEditor's owner menu and score labels, which are hidden when `solo`
- the walkthrough copy

Whether the search is solo or pair comes from the profile, never from the mode. So the demo's
fictional pair of friends is just seed data running through the same code.

### `demoSeed(today)`

This is a pure function that returns `BoardData`:

- 8–10 invented SF listings, some with unknowns that show as fog
- tour dates relative to `today`
- the friends' profile

A test can check that the seed survives `normalizeBoardData` and scores sensibly.

## Deletion test

- **Delete `remoteStore`:** queue handling, merging and polling reappear in Board.
- **Delete `Parser`:** passcode reads and fallback branches reappear in `PasteParse`.
- **Delete `household`:** solo/pair ternaries spread across messages and the editor.

Each of these modules is doing real work. `lib/mode.ts` is meant to be trivial: its only job is
to keep the "which mode?" question to the two server pages and `lib/auth.ts`.

## Build order

**Phase 1: foundation (real mode only, no visible demo yet)**

1. `normalizeBoardData`, with settings normalized too.
2. The Profile changes, `household`, and new message templates.
3. Extract `BoardStore` with `remoteStore` only. This is a pure refactor, and
   `npm run smoke` must still pass afterwards.
4. Lock screen: show the passcode prompt on a 401 and an "unreachable" message on other errors.
   A tour booking that is past due is flagged, not hidden.

**Phase 2: demo**

5. `localStore` and `demoSeed`.
6. `Parser`, `liveParser` and `withSampleFallback`, plus the "Try a sample listing" button.
7. `lib/mode.ts`, `guardBoard` and `guardParse`.
8. The `DemoApp` / `RealApp` composition roots, plus the banner, data controls and walkthrough.

After phase 1, phase 2 is almost entirely new files.
