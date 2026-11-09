# ADR 0003: Prefer Cloudflare Workers with static assets

- Status: Accepted by Ivan on 2026-11-09
- Date: 2026-11-09

## Context

The app serves a small static frontend and proxies a handful of Seattle requests per explicit lookup. It does not need a database or a browser process. The owner has accounts on Netlify and Cloudflare and prefers TypeScript and Node.js.

## Comparison

| Concern                 | Cloudflare Workers + assets                             | Netlify                                             |
| ----------------------- | ------------------------------------------------------- | --------------------------------------------------- |
| Frontend traffic        | Static asset requests are free and unlimited            | Current credit plans meter bandwidth and requests   |
| Dynamic lookup          | Fetch-based Worker; Free tier has a daily request limit | Node.js Functions; compute consumes credits         |
| Node.js preference      | Node tooling locally; Workers runtime in production     | Native Node function runtime fits directly          |
| Preview workflow        | Workers versions and Git integration available          | Familiar deploy previews and Git workflow           |
| Current free offer      | 100,000 Worker requests/day; CPU limits apply           | 300 credits/month on the current Free plan          |
| Existing account caveat | Verify account and limits at deployment                 | Existing legacy plan may differ from public pricing |

The Netlify pricing page currently lists 15 credits per production deploy, 20 per GB bandwidth, and 2 per 10,000 web requests. Account-specific terms have not been inspected. Prices and limits were checked on 2026-11-09 and should be checked again before launch.

## Decision

Use Cloudflare Workers with static assets for this public utility. Static traffic does not consume Worker requests, and the API uses portable web primitives. Node.js still runs development and CI. The cost and runtime tradeoff is favorable for a small community tool.

Netlify is also viable, especially if an existing plan has favorable terms or native Node production execution matters more. A Netlify adapter would forward a standard `Request` to the existing handler and return its `Response`; no domain rewrite is necessary. Only the Cloudflare deployment is configured in this version.

## Consequences

Cloudflare Free is a reasonable starting point, not a guarantee of zero cost at arbitrary load. Lookups consume Worker CPU and requests; verify actual CPU usage under real traffic. Paid Workers currently starts at $5/month. The rate-limit binding provides approximate limits per Cloudflare location, not globally exact quotas.

The first deployment on 2026-11-09 passed a live address-to-calendar browser check from Cloudflare’s network. The app uses the account’s existing workers.dev subdomain; no custom DNS or paid plan change was made. Review the city’s integration terms before wider promotion, and choose a source-code license if publishing the repository. The undocumented API remains the main operational dependency on either host.

Live site: <https://seattle-trash-calendar.ivanstorck.workers.dev>. See [deployment notes](../deployment.md) for the verified version and checks.

## Sources

- [Cloudflare asset billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/).
- [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/).
- [Cloudflare rate limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).
- [Netlify pricing](https://www.netlify.com/pricing/).
