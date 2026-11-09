# ADR 0006: Deploy main through GitHub Actions

- Status: Accepted
- Date: 2026-11-09

## Context

Ivan requested a public GitHub repository and automatic Cloudflare deployment when changes merge to main.

## Decision

Use `ivanoats/seattle-trash-calendar` and feature-branch pull requests. The CI workflow verifies types, lint, formatting, coverage, build and desktop/mobile Playwright tests on pull requests and pushes to main. Only a successful main push can start the dependent production deployment job.

Store the Cloudflare token as an encrypted GitHub production-environment secret. Restrict the environment to the main branch, use read-only repository permissions, and serialize production deployments. Pull-request jobs receive no deployment credentials. Use the pinned local Wrangler and Node.js 24 LTS.

## Consequences

Merging a passing PR triggers a verified build and deployment without a separate local CLI step. A failed verification prevents deployment. Branch protection requires the verify check and a PR; no approving reviewer is required because this is a single-maintainer repository. Live city tests remain opt-in to avoid blocking releases on external outages; deployment checks the hosted homepage.

The environment uses the account token already available for deployment. Rotate it in GitHub environment secrets when the account credential changes. Do not copy credentials into workflow files or logs. Custom domains are independent of this pipeline.
