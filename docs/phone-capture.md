# Adding a listing from a phone

Burnoff reads a listing from its page text. On a computer you select all, copy and paste. On a
phone that usually fails: listing apps like Zillow and Redfin don't let you select a page's text,
and iPhone Safari has no Select All for ordinary web pages. This page lists every way in, from
the one built into Burnoff to two iPhone Shortcuts you can set up yourself.

## In Burnoff: Only have the link

In **Add listing**, choose **Only have the link**. Paste the listing's link (Share, then Copy, in
any listing app) and type what you can see: the address at least, plus rent and unit if you have
them. Then tap **Find it with Claude**.

Claude searches the web for the same building, above all the building's or property manager's
own site, and reads its pricing, fees, parking and contact pages. It takes a minute or two and
runs in the background: a card at the top of the board shows progress and turns into "Found it"
when it's done. The listing opens in the editor like a paste does, with a **Found on the web** box
listing each value and the page it came from. Nothing is saved until you tap Save.

What to expect:

- **It looks everywhere except the big listing sites.** Zillow, Trulia, HotPads, Redfin and
  Apartments.com block automated reading, so the lookup skips them. A building with its own
  website does best. A private owner who only posts on Zillow or Craigslist may not be findable.
- **Some details aren't published anywhere.** Fees and parking prices are often missing. They
  stay blank, and the questions worth asking go into **Ask about on the tour**.
- **Sources can disagree.** In testing, Redfin showed $5,640 for a unit the manager's own site
  listed at $5,895. Burnoff shows both and leaves the call to you.
- **It costs money.** About 40 cents a lookup, on the Anthropic key in `FIND_ANTHROPIC_API_KEY`
  (or `ANTHROPIC_API_KEY` if that isn't set). The public demo uses its one capped key for both
  pasting and lookups, so a busy month of lookups can use up the cap for both. Setting a separate
  key in its own workspace gives lookups their own limit.
- **It lives in the open tab.** Reloading the page drops a lookup that's still running.

## On an iPhone: two Shortcuts

If you'd rather paste the listing's own text, which is exact and free, an iPhone Shortcut can copy
it for you. Each takes a few minutes to set up once.

### Copy Listing Page Text (Browser)

Copies all the text of a page open in Safari, the same as Select All and Copy would. It works on
any site, including pages you're signed in to and pages built by scripts.

Get it: [Copy Listing Page Text (Browser)](https://www.icloud.com/shortcuts/97e9065c530f4d5582ab098cedc37995)

Set up once: Settings, then Apps, then Shortcuts, then Advanced, and turn on **Allow Running
Scripts**. The first time you use it on a site, tap **Allow**.

Use it: open the listing in Safari (from an app, tap Share, then Copy, and paste the link into
Safari). Scroll to the bottom so every section loads. Tap Share, then **Copy Listing Page Text**.
In Burnoff, paste into Add listing.

What it does inside: receives Safari web pages from the Share Sheet, runs
`completion(document.body.innerText);` with **Run JavaScript on Web Page**, and copies the result.

### Copy Listing From Link (Apps)

Works from a listing app's Share button: it downloads the page from the link the app shares and
copies its text. No setting to change.

It depends on the site. Zillow sends the page and it works. Redfin sends a blank page to anything
that isn't a browser, so for Redfin use the Browser Shortcut. It also downloads the listing site's
page on your phone, which some sites' terms of use don't allow. Using it is your call.

Build it in the Shortcuts app:

1. **Receive** URLs and Text from the **Share Sheet**. If there's no input: **Get Clipboard**.
2. **Get URLs from Input**, from Shortcut Input.
3. **If** URLs does not have any value: **Show Notification** "No link found. In the app, tap
   Share, then Copy, then run this again." and **Stop This Shortcut**. End If.
4. **Get Contents of URL**, from URLs (method GET).
5. **Make Rich Text from HTML**, from Contents of URL.
6. **Get Text from Input**, from Rich Text from HTML.
7. **Copy to Clipboard**, then **Show Notification** "Copied listing text".

## Why not fetch the page on the server?

Listing sites block cloud servers, and their terms forbid automated reading. Scraping services
get around that with proxy networks and paid plans, which this free-tier app doesn't use. The
lookup above reads only sites that allow it, and the Shortcuts run on your own phone, one tap at a
time. The tests behind these choices, with times and costs, are in [DECISIONS.md](../DECISIONS.md).
