# Seattle guest lookup integration

## Observed contract

On 2026-11-09, the public portal’s JavaScript and a live request sequence confirmed this flow under `https://myutilities.seattle.gov/rest`:

| Step     | POST path                   | Input                                         | Relevant output                                          |
| -------- | --------------------------- | --------------------------------------------- | -------------------------------------------------------- |
| Search   | `/serviceorder/findaddress` | `address.addressLine1`, empty city and zip    | `address[]` with label fields, `premCode`, inactive flag |
| Resolve  | `/serviceorder/findAccount` | `address.premCode`                            | Account number and company code                          |
| Guest    | `/auth/guest`               | Empty form body                               | `access_token`                                           |
| Services | `/guest/swsummary`          | Guest customer ID and account context         | Service points, descriptions, and updated context        |
| Calendar | `/solidwastecalendar`       | Guest customer ID, context, service point IDs | Map of service point IDs to `MM/DD/YYYY` date arrays     |

The last two requests use the anonymous bearer token. This is the public calendar flow, not a resident login. No write endpoints are called.

The app recognizes `Garbage`, `Recycle`, and `Food/Yard Waste`. It preserves returned dates exactly after normalization to `YYYY-MM-DD`. It does not infer service frequencies from names.

## Evidence and maintenance

City Hall’s public address, 600 4th Ave, was used for live investigation. The guest API returned 108 dates for each of three services, including dates in 2026. This is an observation from a public facility, not a promise about every address or future API responses. Calendar horizons and service frequencies vary.

Playwright opened the actual portal and identified its street-address form. The opt-in `scripts/inspect-portal.mjs` script repeats that initial browser inspection. Routine CI uses synthetic fixtures and does not query the city.

The community Home Assistant integration independently corroborates the same endpoint sequence: [Seattle source adapter](https://github.com/mampfes/hacs_waste_collection_schedule/blob/master/custom_components/waste_collection_schedule/waste_collection_schedule/source/seattle_gov.py). This project’s TypeScript implementation was written against the observed portal contract; it does not vendor that implementation.

Do not commit raw portal payloads, tokens, account numbers, resident addresses, or screenshots containing private data. When a schema changes, inspect the live portal with a public test address, update the schema and synthetic contract tests, and verify the downloaded dates against the official view.

## Completed verification

The app’s live browser flow exported 189 upcoming service events for City Hall, from November 9, 2026 through January 18, 2028. The parsed `.ics` events matched every normalized API date and service. Desktop and mobile screenshots were reviewed. These dates describe that lookup response, not a fixed export horizon.

With the local dev server running, repeat the opt-in check with `node scripts/live-smoke.mjs`. It makes live city requests, uses the public City Hall address, and writes screenshots to the operating system’s `/tmp` directory. Do not run it as part of routine CI.

The final local checks passed: 49 unit tests, eight Playwright tests, TypeScript, ESLint, Markdownlint, Prettier, production build, and a Cloudflare deployment dry run. Unit coverage is 100% across the configured core/adapter scope; UI interactions and thin runtime entry points are not included in that percentage. Browser tests cover UI behavior separately.

The dependency audit reported zero production advisories and 14 development-tool advisories (11 moderate, three low) involving transitive `minimatch` and `katex` dependencies. Compatible automatic fixes were unavailable. Do not blindly apply `npm audit fix --force`, which proposes major tooling downgrades; revisit upstream tool updates before publishing the repository. Local verification used Node.js 26; the supplied CI configuration targets Node.js 24 LTS and has not run remotely.

After adding Verdant with Panda 1.12.2, the audit reports 25 development-tool advisories (17 moderate, eight low), no high or critical advisories, and no production advisories. The automated browser suite now includes theme persistence and increased-contrast checks.
