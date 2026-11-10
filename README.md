# Seattle pickup

Find a Seattle Public Utilities service address, preview its collection dates, and download an iCalendar (`.ics`) file. Direct lookup is implemented through the same guest endpoints used by Seattle’s collection calendar. No personal utility login is required.

The interface uses [Verdant Design System](https://verdant-design.org), including system fonts, semantic colors, and System/Light/Dark themes. The page layout and bin illustrations remain specific to this app.

## Run locally

Use Node.js 24 LTS (see `.nvmrc`).

```sh
npm ci
npm run dev
```

Open <http://127.0.0.1:5173>. Vite serves the interface and forwards `/api` to a Node.js server on port 8788. Explicit searches contact Seattle; typing does not send requests. Opting in to remember an address stores its label and location identifier in this browser. Returning with a saved address automatically fetches a fresh schedule. Change or forget the saved address from the homepage. No schedule is cached for offline answers; the downloaded calendar provides offline access.

The homepage answers the recycling-week question using Monday–Sunday weeks in Seattle time. Past dates returned for the current week support “was scheduled” wording, but are excluded from downloads. When only future dates are available, the answer describes the remainder of the week instead of inferring a past pickup.

## Verify

```sh
npm run check
npx playwright install chromium
npm run test:e2e
```

`check` runs TypeScript, ESLint, Markdownlint, Prettier, Vitest coverage, and a production build. Coverage gates require at least 80% of statements, branches, functions, and lines in the domain, application, and API/calendar adapters. Browser interaction is tested separately with Playwright and axe. Thin Node/Worker entry points are outside the unit coverage denominator.

Unit and browser tests use synthetic fixtures, not residents’ account data. Browser tests cover desktop and mobile widths, address selection, service filters, calendar downloads parsed by `ical.js`, error states, accessibility, and stale-result clearing. Live verification is deliberately separate from CI because it depends on Seattle’s availability.

## Hosting

**Hosted on Cloudflare Workers with static assets.** The frontend is static; a small fetch-based Worker performs guest lookups. Node.js powers development and CI; the deployed adapter runs in the Workers runtime. No database, browser service, or user secrets are needed.

Live site: <https://seattle-trash-calendar.ivanstorck.workers.dev>. ADR 0003 was accepted and the first deployment verified on 2026-11-09. The target account is pinned in `wrangler.jsonc`.

For subsequent authorized deployments:

```sh
npm run deploy:cloudflare
```

The configuration limits API calls to 20 per minute per client IP per Cloudflare location. This is an approximate abuse control, not a global quota. Production request logging is disabled. Platform-level traffic metadata may still exist; application code never logs addresses, tokens, account numbers, or schedule bodies.

See [the hosting ADR](docs/adr/0003-hosting.md) for Netlify tradeoffs and [deployment notes](docs/deployment.md) for verification and operations. The public [GitHub repository](https://github.com/ivanoats/seattle-trash-calendar) uses pull requests. Successful CI on main automatically deploys to Cloudflare.

## Limits

- Seattle’s guest API is undocumented and may change. Invalid or incomplete responses fail with a useful message and a link to Seattle’s lookup.
- Only dates returned by Seattle are exported. No recurrence or holiday rules are inferred; different services may have different collection days.
- The city says its calendar does **not** reflect weather delays. Check [SPU service updates](https://atyourservice.seattle.gov/).
- A downloaded calendar is a snapshot, not a subscription. Import into a separate calendar so it can be removed and replaced. Stable event IDs do not guarantee that every calendar app deduplicates repeated imports.
- Empty or inactive services are not offered. Unrecognized service types fail closed rather than silently dropping pickups.
- Live interoperability with Apple Calendar, Google Calendar, and Outlook is not yet verified; automated tests validate the file with an independent iCalendar parser.

## Architecture and decisions

- [Architecture](docs/architecture.md): boundaries, C4 views, data flow.
- [Architecture Decision Log](docs/adl.md): decisions and status.
- [Integration notes](docs/integration.md): observed guest API contract and verification.

No open-source license has been selected yet. Choose one before inviting code reuse or contributions.
