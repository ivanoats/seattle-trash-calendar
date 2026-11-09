# ADR 0001: TypeScript and hexagonal boundaries

- Status: Accepted
- Date: 2026-11-09

## Context

The project needs direct Seattle lookup, reliable calendar output, roughly 80% test coverage, and a deployment choice that can change without rewriting collection rules.

## Decision

Use strict TypeScript, Node.js 24 for development and CI, Vite for a small browser bundle, and ports and adapters around schedule access and calendar output. Use native browser controls rather than a UI framework for this single-screen workflow.

Use Vitest with 80% minimum coverage in all four coverage dimensions for the core and adapters, plus Playwright for browser behavior. ESLint, Prettier, Markdownlint, and a GitHub Actions workflow enforce routine checks.

## Consequences

The domain is usable in Node, Workers, and browsers. Tests substitute an in-memory provider and mocked fetch responses. Platform wiring remains small. If UI complexity grows into multiple routes or persistent client state, revisit the framework choice. Runtime schema validation belongs at the external data boundary, not in the domain.
