# ADR 0002: Use direct city lookup and explicit calendar dates

- Status: Accepted
- Date: 2026-11-09

## Context

Direct address lookup is essential to the requested product. Asking residents to copy a weekday and recycling anchor date does not satisfy that requirement. The portal has a working guest flow that returns explicit service dates.

## Decision

Mirror the portal’s read-only guest lookup through a server adapter. Present matching addresses for explicit selection; never silently choose the first match. Request a short-lived anonymous guest token for each selected-address lookup and retain it only in memory. Expose only address labels, premise identifiers, and normalized collections to the browser.

Export one all-day event per unique date and service using RFC 5545. Include every upcoming date returned by Seattle; do not synthesize recurrence, holiday shifts, or extra months. Treat an unknown service or missing service-point calendar as an upstream error.

## Consequences

The integration depends on an undocumented external contract. Schema checks and useful errors make failures visible but cannot prevent upstream changes. A personal login, account number input, database, or browser session is unnecessary for the observed guest flow.

The download is a snapshot. Stable UIDs help calendar identity but do not make imports synchronize or delete older events. Weather delays remain outside this source’s guarantees.

## Sources

- [Seattle collection lookup](https://myutilities.seattle.gov/eportal/#/accountlookup/calendar), observed 2026-11-09.
- [SPU collection calendar guidance](https://www.seattle.gov/utilities/your-services/collection-and-disposal/your-collection-day/look-up-collection-day).
- [RFC 5545](https://www.rfc-editor.org/rfc/rfc5545).
