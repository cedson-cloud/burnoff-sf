# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Burnoff** — a two-person SF apartment-search board. Next.js 15 App Router + React 19 + TypeScript, Tailwind v4, Upstash Redis (REST), Anthropic SDK for paste-to-parse. Deployed on Vercel Hobby (pushes to `main` auto-deploy). README.md is a public-facing portfolio piece; DECISIONS.md lists known trade-offs and their cliffs — read it before "fixing" something that looks like an oversight (thin auth, last-write-wins, polling, string-typed numbers).

## Commands

```bash
npm run dev                # http://localhost:3000 (redirects to /b/<BOARD_ID>, in dev only)
npm run build              # production build; also the typecheck (there is no lint script)
npx tsc --noEmit           # typecheck only
npm test                   # node:test unit tests (lib/**/*.test.ts, run via tsx)
npm run smoke              # needs dev server running; API round-trip + passcode gate
npm run smoke -- --parse   # also hits /api/parse with a real Claude call (~1–3¢)
npm run icons              # regenerate PWA icons
```

Unit tests use `node:test` + `tsx` (no framework); `lib/client/store.test.ts` covers the queue and sync rules with a fake server. `scripts/smoke.mjs` is the end-to-end check. It reads `BOARD_ID`/`BOARD_PASSCODE` from `.env.local` and targets `SMOKE_BASE_URL` (default localhost:3000). In real mode (the default) the five uncommented env vars in `.env.example` are required; `BURNOFF_MODE` and `PARSE_MODEL` are optional. With `BURNOFF_MODE=demo` only `ANTHROPIC_API_KEY` is used (see `docs/design-demo-mode.md`).

## Architecture

**Single board, no accounts.** Every board route calls `guardBoard(req, boardId)` from `lib/auth.ts`: in real mode the `x-board-pass` header must match `BOARD_PASSCODE` (timing-safe; a configured passcode under `MIN_PASSCODE_LENGTH` = 12 chars 500s every request, since nothing rate-limits guesses), and `boardId` must equal `BOARD_ID` — so the API can't touch arbitrary Redis keys; in demo mode it always 404s. The parse route calls `guardParse(req)`, which returns the passcode denial or the mode's `{ maxChars, model }` limits. New routes must use one of these guards. Only the server pages (`app/page.tsx`, `app/b/[boardId]/page.tsx`) and `lib/auth.ts` may import `lib/mode.ts`.

**Storage layout** (`lib/redis.ts`): `board:<id>` is a Redis hash with one field per listing (so two people editing *different* listings never collide); `board:<id>:meta` holds the whole `Settings` object as one JSON blob. Routes under `app/api/board/[boardId]/` — `GET` the board, `PUT`/`DELETE` `listing/[id]`, `PUT` `settings`. The server stamps `updatedAt`.

**Client sync** (`lib/client/store.ts` + `queue.ts`): `Board` reads everything through the `BoardStore` interface via `useSyncExternalStore` and knows nothing about passcodes or HTTP. `components/RealApp.tsx` owns the passcode, builds a `remoteStore`, and shows `PasscodeGate` when the store reports `access: 'locked'`, or a "No board at this link" screen (and forgets the stored `board-id`) on `'missing'`, which a 404 on the first load sets. In `remoteStore`, edits apply to local state immediately and are enqueued in a localStorage write queue, which coalesces superseded ops per listing. The queue flushes serially before each poll, on reconnect, and on tab return; it stops at the first retryable failure (network/5xx/429) to preserve order, drops permanently rejected 4xx ops, and locks on 401. Sent ops are removed from storage one at a time (`removeOp`) so edits made mid-flush survive. Polling runs every 15s only while the tab is visible (Redis free-tier budget). The poll merge must not overwrite listings with pending ops (`mergeServerListings`) — preserve this when touching sync, and add a test in `store.test.ts`.

**Modes** (`docs/design-demo-mode.md`): `app/page.tsx` renders `DemoApp` when `BURNOFF_MODE=demo` and otherwise renders `RootRedirect`, which sends a device to the board it last loaded (`board-id` in localStorage, set by `RealApp` once the board is `ready`) and shows a dead end to everyone else. Only `npm run dev` redirects `/` to `/b/<BOARD_ID>`; in demo mode `/b/*` redirects to `/`. Both roots render the same `<Board store parser slots />`. `DemoApp` uses `localStore` (browser-only board seeded by `demoSeed`) and `withSampleFallback(liveParser(null), SAMPLES)`, and fills Board's `slots` with `DemoBanner`, `Welcome` (the first-visit block at the top of Ranked, which offers the tour instead of opening it), `DemoDataControls` and `Walkthrough`. Slots reach the board only through the `BoardNav` context (`components/BoardNav.tsx`) and `data-tour` anchors — no component under Board reads the mode.

**Paste-to-parse** (`app/api/parse/route.ts`, `lib/parse-schema.ts`): the user pastes listing page text; one Claude call with a zod structured-output schema returns fields that prefill `ListingEditor`. The parse route never fetches the listing. The system prompt forbids inventing values — missing data must stay empty, because scoring treats unknowns specially. Route has `maxDuration = 60`.

**Find it with Claude** (`app/api/find/route.ts`, `lib/find.ts`, `docs/phone-capture.md`): for a phone, where listing apps won't let you copy. The user gives a link and what they can see (the address at least); `guardFind` applies the parse passcode rule. Two calls: research with the web search and web fetch server tools (Zillow, Trulia, HotPads, Redfin and Apartments.com blocked; budgets in `FIND_TOOLS`), then structure with `FoundListingSchema` (the parse schema plus `sources` and `askAbout`). Same never-invent rule. It runs in the background: `Board` holds the lookups in memory and `FindCards` shows them; the editor shows a "Found on the web" box, and `foundToListing` keeps the sources in Notes so the stored `Listing` shape is unchanged. No sample fallback for find. It uses `FIND_ANTHROPIC_API_KEY` if set, for a separate spend cap, else `ANTHROPIC_API_KEY` (the demo currently shares its key); `maxDuration = 300` (Hobby with Fluid compute).

**Scoring** (`lib/score.ts`, pure): all-in cost = rent + required monthly fees (if `priceBasis` is `base`) + parking (if `criteria.includeParking`), computed on the listing's `target` unit. 100-point score: cost 35, parking 20, commute 20, size 15, move-in 10; renormalizes to 80 when parking isn't required. Unknowns get half credit plus a flag. Thresholds come from Settings; curve shapes are hardcoded here. Numeric fields on `Listing`/`Unit` are strings — use `num()` to parse.

**Message templates** (`lib/messages.ts`): `buildTemplates(listing, settings)` generates inquiry/follow-up messages from listing fields, the parsed `hook`, and `Settings.profile`. `openingTemplate` picks the one a listing's status calls for; only a Lead's first message offers "Copy and mark sent", which moves it to Inquired.

**UI** (`app/globals.css`, `components/`): two tabs, Ranked (`RankView`) and To do (`TodoView`, the old Now and Week merged; its queues are `todoQueues` in `lib/tours.ts`), plus Add listing (`PasteParse`). Your criteria (`SettingsView`) opens from Ranked. Board keeps one open sheet at a time; every sheet (`Sheet`) is full screen on a phone (the board behind goes `inert`) and a side panel beside the list on desktop (≥1024px). Design tokens are CSS variables on `:root` mapped to Tailwind through `@theme inline` (`bg-paper`, `text-ink-2`, `bg-sun`…); use them, not raw Tailwind colors. Unknown score factors are "fog": the `fog-hatch` utility plus a "?" or `FogMark`, never color alone. Amber/sun is only the accent: the score mark, primary buttons (the `btn-primary` utility), the current status step, the top card's outline, tour days on To do's week strip, chosen stars and the walkthrough's highlight ring. Nothing else. Icons are inline SVG in `components/Icon.tsx`; no icon dependency. Display formatting for listings lives in `components/listing-format.ts` (US dates and times, whole-dollar money, ft²); `lib/format.ts` holds the helpers messages share with it. Mobile-first, designed at 380px width.

## Gotchas

- `@anthropic-ai/sdk`'s `zodOutputFormat` needs `import * as z from 'zod/v4'`; plain `zod` (v3 types) fails typecheck. The parse model constant `PARSE_MODEL` lives in `lib/parse-schema.ts`; the `PARSE_MODEL` env var overrides it (applied in `guardParse`).
- Changing the `Listing` shape in `lib/types.ts` usually means updating `ParsedListingSchema`, the editor, scoring, and messages together; stored records are unversioned, so new fields must tolerate being absent on old listings.

## Constraints

- **The repo is public and git history is permanent, so every commit stays clean.** No real personal data (names, phones, addresses) and no credentials in tracked files. Real data lives in Redis via Your criteria; `scripts/seed.mjs` holds real data and is gitignored — never un-ignore or commit it. Defaults in `lib/types.ts` stay generic.
- **Secrets live in `.env.local`**, which `.gitignore` covers (every `.env*` except the placeholder-only `.env.example`). Never hardcode a secret, and never echo, log or copy a value from it into source, tests, docs or output.
- **`/api/parse` is the one place dev work costs money** (about 1–3¢ a call). `npm run smoke -- --parse` makes one call, and so does the redesign's `capture.mjs`. Flag anything that would loop model calls, and don't change `PARSE_MODEL` without asking.
- Partner onboarding must remain "URL + passcode" — no account system. Stay within free tiers (Vercel Hobby, Upstash free, one model call per parse). The one paid exception is Find it with Claude: about 40¢ a lookup, on `FIND_ANTHROPIC_API_KEY` if set, else the parse key.
- Never reveal `BOARD_ID` from a public surface (the root page, the manifest, metadata, error messages). Once the board ID is known, only the passcode protects the board.
- The app intentionally refuses to store application paperwork (SSNs, bank numbers, income docs).
- **Calvin runs all git. Never commit or push.** Don't run any git command beyond `git status`, `git log` and `git diff`; delete and move files with `rm` and `mv`. A `git checkout` once wiped uncommitted work.
- End every pull request description with: "Built with Claude Code. Scope, design decisions and review by Calvin Edson." Deploys go straight to `main` without a pull request, so every commit message Calvin runs carries that line too, followed by a `Co-Authored-By: Claude …` trailer as the last line.

## Working agreements

- Calvin reads code and directs builds; he isn't an engineer. Lean on him for product and design judgment, not syntax. Give terminal commands one line at a time and say what each one does.
- Don't rewrite code you weren't asked to touch. Prefer small, reviewable changes. Match the style of the file you're editing, and don't add comments that restate the code.
- When there are several reasonable approaches, name them briefly, recommend one and move on.
- Ask before adding any npm dependency: justify it in one line and name the alternative. `next/font/google` is approved.
- When Calvin reports an error, ask for what you need (steps, logs, a screenshot) instead of guessing.
- End substantial work by naming what can be checked on disk: file paths, function names, and the `npm test` count before and after.
- User-visible copy is plain and in sentence case, with no em dashes anywhere a user sees it (UI, message templates, demo data and samples). Avoid "leverage," "delve," "robust," "seamless" and "game-changer." README prose is in Calvin's voice: don't rewrite it without asking.
