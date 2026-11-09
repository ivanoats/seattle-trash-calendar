# ADR 0005: Use Verdant while preserving the page layout

- Status: Accepted
- Date: 2026-11-09

## Context

Ivan chose Verdant Design System and asked to keep the existing layout and bin graphics.

## Decision

Install `@sustainablewebsites/verdant-design` 0.1.1 and Panda CSS 1.12.2. Use the published preset, its button, card and input recipes, semantic theme variables, system fonts, spacing and radius tokens. Preserve the page-specific hero typography, two-column layout and service-colored bin artwork. The artwork colors are decorative; interface text and controls use semantic tokens.

The package's theme runtime runs before first paint and provides System, Light and Dark controls. It persists only the theme preference; addresses remain transient. Panda emits CSS at build time. Generated CSS, recipe helpers and the copied theme script are ignored and rebuilt by `npm ci` through the prepare script.

## Consequences

Verdant's light/dark and increased-contrast tokens apply across the interface. Playwright verifies theme persistence, system preference changes and axe checks alongside the existing calendar workflow. Reduced motion follows the preset's media conditions.

Panda 2.x no longer exports the base preset path used by Verdant's documented setup. Pin Panda 1.12.2, the current compatible patch, until a deliberate migration is tested. This avoids the high-severity development-tool advisories present in 1.12.0. The remaining development dependency advisories are documented separately.

## Sources

- [Verdant](https://verdant-design.org)
- [Installation guide](https://github.com/ivanoats/verdant-wsg-demo/blob/main/docs/INSTALL.md)
