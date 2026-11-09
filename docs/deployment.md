# Cloudflare deployment

## Current deployment

- URL: <https://seattle-trash-calendar.ivanstorck.workers.dev>
- Worker: `seattle-trash-calendar`
- Account: Ivan’s account, pinned by ID in `wrangler.jsonc`
- First deployed and verified: 2026-11-09
- Version: `b0aac4cb-15f5-40f8-9a4e-4cad2a12f1cc`
- ADR 0003: accepted by Ivan

The Worker serves the API and Cloudflare serves the static assets. Version preview URLs are disabled; the main workers.dev URL is public. Deployment did not change DNS records, custom domains, or the account’s billing plan. The public repository is [ivanoats/seattle-trash-calendar](https://github.com/ivanoats/seattle-trash-calendar). GitHub Actions deploys successful main builds automatically.

## Local Worker verification

```sh
npm run dev:cloudflare
```

This builds the frontend and starts the local Workers runtime at <http://127.0.0.1:8790>. In another terminal:

```sh
SMOKE_BASE_URL=http://127.0.0.1:8790 npm run test:live
```

This opt-in test makes real read-only Seattle requests for City Hall, downloads the calendar through Chromium, and compares parsed events with the API response. It should not run in routine CI. The rate limiter can reject repeated tests within a minute; wait for the window to expire instead of disabling the production limit.

Wrangler-generated declarations are ignored and excluded from the browser’s TypeScript project because Workers runtime globals conflict with DOM types. Regenerate them with `npx wrangler types` when inspecting changed bindings. The small runtime adapter remains explicitly typed in source.

## Deployment and verification

Use the existing account token or Wrangler login outside source control. Do not paste tokens into chat or place them in config. `.env*` and `.dev.vars*` files are ignored.

```sh
npm run check
npx wrangler deploy --dry-run
npm run deploy:cloudflare
SMOKE_BASE_URL=https://seattle-trash-calendar.ivanstorck.workers.dev npm run test:live
```

Confirm `wrangler whoami` identifies the intended account before deploying. The account ID is not a secret, but the token is. A new Worker requires account-level creation permissions; subsequent deploys require edit permission for this Worker. No database bindings or application secrets are required.

## Verified behavior

- The production browser test exported 189 upcoming City Hall service events, matching every normalized date and service returned by the hosted API.
- The HTML response carries the configured Content Security Policy and no-referrer policy.
- Cross-origin API requests are rejected with 403; API responses have `Cache-Control: no-store`.
- Local Workers runtime testing confirmed 429 responses with a 60-second retry hint after the configured limit; static pages remain available.
- All 50 unit tests passed, with 100% coverage across the configured core/adapter scope. Lint, formatting, TypeScript, production build, and deployment packaging passed.

The Worker runtime check found and fixed two portability issues: a stored native `fetch` function received the wrong receiver, and Workers does not implement `redirect: "error"`. The provider now invokes `globalThis.fetch` through a wrapper and uses `redirect: "manual"`, rejecting non-success responses without following redirects. A regression test covers both constraints. No upstream payloads or errors are logged by application code.

## Operations

API limits are approximate and local to each Cloudflare location: 20 requests per minute per client IP. Production Worker logs are disabled. The hosting platform can still retain normal traffic metadata.

Use Wrangler deployments and version commands to inspect releases. Before an authorized rollback, inspect the available versions and choose the intended version explicitly; do not assume the previous version is correct. The first release has no earlier application version to restore.

A custom domain remains optional follow-up work. Calendar imports in Apple Calendar, Google Calendar, and Outlook still need manual interoperability checks. The existing development-tool audit advisories are recorded in [integration notes](integration.md); deployment did not change those dependencies.

## Automatic deployments

Feature branches run CI through a pull request. Main requires the `verify` check and a pull request. On merge, the main workflow reruns verification, then deploys the same commit to Cloudflare. Failed checks prevent the deploy job from running. Production deploys are serialized.

The `production` GitHub environment allows only main. It holds the encrypted `CLOUDFLARE_API_TOKEN` secret and the non-secret `CLOUDFLARE_ACCOUNT_ID` variable. Workflow permissions are `contents: read`. Pull-request checks do not receive the deployment token.

Inspect the repository's Actions tab for failed jobs and environment deployment history. Retry a failed deployment only after checking its commit and failure reason. GitHub stores the version ID emitted by Wrangler in the deploy job log.
