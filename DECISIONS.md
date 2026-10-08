# Decisions I'd revisit if this outlives the two-week search

Choices below were right for a two-person, two-week sprint. Each one has a cliff further out.

1. **Passcode-in-a-header instead of auth.** Correct for two people who trust each other; the
   moment a third person or any sensitive data shows up, switch to real sessions (even just
   signed cookies + an httpOnly token). The passcode also lives in localStorage, which any XSS
   would expose — acceptable now because the app renders only its own data, but it's the first
   thing to harden. Nothing rate-limits wrong guesses either. A lockout would need a Redis read
   on every request, so instead the server refuses passcodes under 12 characters and the site
   root never reveals the board URL.

2. **Last-write-wins on same-listing edits.** The Redis hash makes different-listing edits safe,
   which is the actual two-person collision case. If two people edited the *same* listing offline,
   the later flush wins silently. Past a sprint: add a version number per listing and surface a
   conflict instead of overwriting (the `updatedAt` stamp is already there to build on).

3. **Polling instead of push.** 15s polling is simple and free-tier friendly. With more users or
   longer life, move to SSE or Upstash's pub/sub — mostly to cut Redis command burn, not latency.

4. **No service worker.** Add-to-Home-Screen works, and mid-session signal loss is covered by the
   write queue, but a cold open with no connectivity shows nothing. A small SW caching the shell
   would fix that; it wasn't worth the cache-invalidation tax during daily-deploy season.

5. **Scoring curves are hardcoded shapes.** The thresholds live in Your criteria but the interpolation
   (linear, the 0.88/0.6/1.1 knees) lives in `lib/score.ts`. Fine while the two of us agree on
   the model; a portfolio version would expose the curve constants or at least document them in
   the UI.

6. **The parse schema is expansive but unversioned.** If Anthropic model behavior shifts or the
   schema grows, there's no migration story for listings parsed under an older shape. Fields are
   all strings, which is forgiving, but a longer-lived app would version the `Listing` record.

7. **Settings are one JSON blob, last-write-wins.** Two people saving Settings simultaneously can
   clobber each other. Rare enough to accept now; split criteria/profile into separate keys (or
   into the hash) if it ever bites.

8. **`tourAt` and numeric fields are strings.** Matches the spec and keeps forms trivial, at the
   cost of lenient parsing sprinkled through `lib/score.ts`. A longer-lived version would store
   numbers and dates properly and validate at the API boundary with zod (which is already a
   dependency).

9. **Tests cover the parts that can lose data or spend money, not the UI.** `npm test` runs 109
   unit tests (`node:test`, no framework) across 10 files: the write queue and poll merge against
   a fake server (edits made mid-flush survive, a poll never overwrites a pending edit, a 401
   locks while a 5xx shows "unreachable" and a 404 on first load shows "No board at this link"), the passcode and mode guards, the parse length caps, the demo's parse
   fallback, the browser-only store's import/reset, the demo seed (no real-looking contact
   data, unknowns flagged), To do's queues, the message each status opens on, and Find it with Claude's prompt, guard and sources. `npm run smoke` covers the API contract and a real parse call end to
   end, and the live demo was checked with curl and on a phone before launch. The gaps: `lib/score.ts` has
   no tests of its own (only a sanity check through the demo seed), and there are no browser
   tests, so layout and the walkthrough are verified by hand.

10. **Phones get "Find it with Claude", which is slow and costs money, on purpose.** Pasting the
    page is exact and free, but on a phone the listing apps won't let you copy it. Tested on
    2026-10-07: two iPhone Shortcuts (one copies a Safari page, one downloads the link an app
    shares) work for Zillow, but Redfin sends a blank page to non-browsers and the setup was too
    fiddly to ask of anyone. Screenshots meant too many of them per listing. A paid scraping API
    would break the free-tier rule and move scraping onto the server. The lookup searches the open
    web with the big listing sites blocked: the first run took 12½ minutes and $1.51 and found
    everything; tuned budgets brought it to one or two minutes and about 40¢, and on one run it skipped the
    floor-plans page and said fees weren't itemized when they were. So found values are shown with
    their sources and checked before saving, never trusted silently. The cliffs: on the demo it shares
    the paste key's monthly cap, so heavy lookup use can stop pasting too (a separate
    `FIND_ANTHROPIC_API_KEY` in its own workspace fixes that); a lookup lives in the open tab and a reload drops it; small
    landlords who only post on Zillow often can't be found; and the tool budgets in `lib/find.ts`
    trade completeness for speed. The Shortcuts are documented in `docs/phone-capture.md` for anyone
    who wants the exact text instead.
