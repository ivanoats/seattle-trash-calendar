# ADR 0007: Recycling-week answer and device-local address preference

- Status: Accepted (requested by Ivan)
- Date: 2026-11-09

## Decision

Answer the recycling-week question on the homepage after address selection. Define a week as Monday–Sunday in America/Los_Angeles and show its date range. Use the schedule fetch timestamp so the answer and returned data describe the same check. Distinguish today, upcoming this week, a past scheduled date, later dates, and missing recycling dates. Never claim a scheduled collection actually occurred or infer a past pickup from recurrence.

The lookup use case preserves current-week past dates separately from upcoming collections. Calendar exports continue to contain only upcoming dates. The domain computes the recycling answer; the browser supplies presentation and storage behavior.

Remembering an address is an unchecked opt-in. Save only a version, service address label, and premise identifier in this browser's localStorage. Restore with a fresh API lookup on each visit. Provide change and forget controls, including when the restored lookup fails. Changing address alone does not delete the saved preference; explicitly remembering another address replaces it. Unchecking the preference removes it.

## Consequences

People sharing a browser can see its saved address. Explain this beside the preference. Browser storage can be blocked, cleared, or malformed; lookup and calendar download must still work. The app stores no server-side address preference and no offline schedule. The downloaded calendar remains the offline option.

The city may omit earlier dates. In that case, describe the remainder of the week rather than assert whether recycling occurred earlier. A page left open shows the date it was checked; reload to fetch an updated answer.

Unit tests cover Seattle midnight, daylight-saving transitions, year boundaries, missing dates, and storage failures. Browser tests cover opt-in, restoration, forgetting, stale-result clearing, accessibility, and failure recovery.
