# ADR 0004: Use Playwright for investigation and browser verification

- Status: Accepted
- Date: 2026-11-09

## Context

The user proposed Playwright as a simulated browser for the Seattle lookup. Browser execution can discover the real form and requests, and can verify that this app produces a downloadable calendar.

## Decision

Use Playwright Chromium to inspect the public portal and run this app’s desktop and mobile browser tests. Keep deterministic CI tests separate from live city requests. Browser tests assert interaction outcomes and parse the downloaded file with an independent iCalendar library. Axe checks cover the initial and populated screens.

Use direct HTTP requests in the production schedule adapter because the observed guest endpoints work without a browser. Do not launch Chromium for each resident lookup.

## Consequences

Playwright gives evidence about rendering, interactions, downloads, and browser accessibility without adding browser infrastructure to hosting. If Seattle later requires browser execution, investigate a browser adapter and revise the hosting ADR. Do not silently replace direct address lookup with manual schedule entry.
