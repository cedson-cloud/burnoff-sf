# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Burnoff** — a two-person SF apartment-search board. Next.js 15 App Router + React 19 + TypeScript, Tailwind v4, Upstash Redis (REST), Anthropic SDK for paste-to-parse. Deployed on Vercel Hobby (pushes to `main` auto-deploy). README.md is a public-facing portfolio piece; DECISIONS.md lists known trade-offs and their cliffs — read it before "fixing" something that looks like an oversight (thin auth, last-write-wins, polling, string-typed numbers).

## Commands

```bash
npm run dev                # http://localhost:3000 (redirects to /b/<BOARD_ID>)
npm run build              # production build; also the typecheck (there is no lint script)
npx tsc --noEmit           # typecheck only
npm test                   # node:test unit tests (lib/**/*.test.ts, run via tsx)
npm run smoke              # needs dev server running; API round-trip + passcode gate
npm run smoke -- --parse   # also hits /api/parse with a real Claude call (~1–3¢)
npm run icons              # regenerate PWA icons
```

Unit tests use `node:test` + `tsx` (no framework); `lib/client/store.test.ts` covers the queue and sync rules with a fake server. `scripts/smoke.mjs` is the end-to-end check. It reads `BOARD_ID`/`BOARD_PASSCODE` from `.env.local` and targets `SMOKE_BASE_URL` (default localhost:3000). In real mode (the default) the five uncommented env vars in `.env.example` are required; `BURNOFF_MODE` and `PARSE_MODEL` are optional. With `BURNOFF_MODE=demo` only `ANTHROPIC_API_KEY` is used (see `docs/design-demo-mode.md`).

## Architecture

**Single board, no accounts.** Every board route calls `guardBoard(req, boardId)` from `lib/auth.ts`: in real mode the `x-board-pass` header must match `BOARD_PASSCODE` (timing-safe), and `boardId` must equal `BOARD_ID` — so the API can't touch arbitrary Redis keys; in demo mode it always 404s. The parse route calls `guardParse(req)`, which returns the passcode denial or the mode's `{ maxChars, model }` limits. New routes must use one of these guards. Only the server pages (`app/page.tsx`, `app/b/[boardId]/page.tsx`) and `lib/auth.ts` may import `lib/mode.ts`.

**Storage layout** (`lib/redis.ts`): `board:<id>` is a Redis hash with one field per listing (so two people editing *different* listings never collide); `board:<id>:meta` holds the whole `Settings` object as one JSON blob. Routes under `app/api/board/[boardId]/` — `GET` the board, `PUT`/`DELETE` `listing/[id]`, `PUT` `settings`. The server stamps `updatedAt`.

**Client sync** (`lib/client/store.ts` + `queue.ts`): `Board` reads everything through the `BoardStore` interface via `useSyncExternalStore` and knows nothing about passcodes or HTTP. `components/RealApp.tsx` owns the passcode, builds a `remoteStore`, and shows `PasscodeGate` when the store reports `access: 'locked'`. In `remoteStore`, edits apply to local state immediately and are enqueued in a localStorage write queue, which coalesces superseded ops per listing. The queue flushes serially before each poll, on reconnect, and on tab return; it stops at the first retryable failure (network/5xx/429) to preserve order, drops permanently rejected 4xx ops, and locks on 401. Sent ops are removed from storage one at a time (`removeOp`) so edits made mid-flush survive. Polling runs every 15s only while the tab is visible (Redis free-tier budget). The poll merge must not overwrite listings with pending ops (`mergeServerListings`) — preserve this when touching sync, and add a test in `store.test.ts`.

**Modes** (`docs/design-demo-mode.md`): `app/page.tsx` renders `DemoApp` when `BURNOFF_MODE=demo` and otherwise redirects to `/b/<BOARD_ID>` (`RealApp`); in demo mode `/b/*` redirects to `/`. Both roots render the same `<Board store parser slots />`. `DemoApp` uses `localStore` (browser-only board seeded by `demoSeed`) and `withSampleFallback(liveParser(null), SAMPLES)`, and fills Board's `slots` with `DemoBanner`, `DemoDataControls` and `Walkthrough`. Slots reach the board only through the `BoardNav` context (`components/BoardNav.tsx`) and `data-tour` anchors — no component under Board reads the mode.

**Paste-to-parse** (`app/api/parse/route.ts`, `lib/parse-schema.ts`): the user pastes listing page text; one Claude call with a zod structured-output schema returns fields that prefill `ListingEditor`. Nothing is scraped server-side by design. The system prompt forbids inventing values — missing data must stay empty, because scoring treats unknowns specially. Route has `maxDuration = 60`.

**Scoring** (`lib/score.ts`, pure): all-in cost = rent + required monthly fees (if `priceBasis` is `base`) + parking (if `criteria.includeParking`), computed on the listing's `target` unit. 100-point score: cost 35, parking 20, commute 20, size 15, move-in 10; renormalizes to 80 when parking isn't required. Unknowns get half credit plus a flag. Thresholds come from Settings; curve shapes are hardcoded here. Numeric fields on `Listing`/`Unit` are strings — use `num()` to parse.

**Message templates** (`lib/messages.ts`): `buildTemplates(listing, settings)` generates inquiry/follow-up messages from listing fields, the parsed `hook`, and `Settings.profile`.

Views (`RankView`, `NowView`, `WeekView`, `SettingsView`) are tabs inside `Board.tsx`. Mobile-first, designed at 380px width.

## Gotchas

- `@anthropic-ai/sdk`'s `zodOutputFormat` needs `import * as z from 'zod/v4'`; plain `zod` (v3 types) fails typecheck. The parse model constant `PARSE_MODEL` lives in `lib/parse-schema.ts`; the `PARSE_MODEL` env var overrides it (applied in `guardParse`).
- Changing the `Listing` shape in `lib/types.ts` usually means updating `ParsedListingSchema`, the editor, scoring, and messages together; stored records are unversioned, so new fields must tolerate being absent on old listings.

## Constraints

- **No real personal data in the repo** (names, phones, addresses). Real data lives in Redis via the Settings screen; `scripts/seed.mjs` holds real data and is gitignored — never un-ignore or commit it. Defaults in `lib/types.ts` stay generic.
- Partner onboarding must remain "URL + passcode" — no account system. Stay within free tiers (Vercel Hobby, Upstash free, one model call per parse).
- The app intentionally refuses to store application paperwork (SSNs, bank numbers, income docs).
- The user runs all git commands themselves — don't commit or push.
