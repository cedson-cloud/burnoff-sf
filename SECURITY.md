# Security policy

## Reporting a vulnerability

Please report security problems privately through GitHub: open the **Security** tab of this repository and click **Report a vulnerability**. Don't open a public issue.

This is a personal project maintained by one person, so responses are best effort. I aim to reply within a week.

## Scope

- The live demo at [burnoff-sf.vercel.app](https://burnoff-sf.vercel.app). It runs in demo mode: board data stays in the visitor's browser, and the only server routes that do work are paste-to-parse (`/api/parse`) and Find it with Claude (`/api/find`).
- The code in this repository, including real mode for anyone who self-hosts it.

Examples of what I want to hear about:

- Reading or changing a board without its passcode, or reaching any Redis key other than the configured board.
- Getting a parse or find call past its guards or length caps.
- Anything that exposes an API key, the board ID or the passcode.
- Cross-site scripting or other injection through listing text, parsed fields or message templates.

## Known trade-offs

[DECISIONS.md](DECISIONS.md) lists choices made on purpose for a two-person tool, along with where each one stops being safe. They include a shared passcode sent in a header instead of user accounts, the passcode kept in the browser's localStorage, and no rate limit on wrong guesses (the server instead refuses passcodes shorter than 12 characters). Reports that one of these matters more than I think are welcome, but they aren't new findings on their own.

The public demo has no passcode, so anyone can spend parse and find calls. Its API key sits in its own workspace with a monthly spend cap, so the worst case is that parsing falls back to saved samples and lookups stop working until the month resets.

## Please don't

- Load test or run automated scanners against the demo. Every parse and find call costs real money.
- Try findings against Vercel, Upstash or Anthropic themselves. Report those to the provider.

The app doesn't store rental application paperwork (Social Security numbers, bank details or income documents) by design.
