# QuartierApp — Overview HTML

Single-file HTML overviews of the project (technical + conceptual). Self-contained, no build step, no external assets.

- [`index.html`](./index.html) — Deutsch
- [`index-en.html`](./index-en.html) — English

## Purpose

- Onboarding for new collaborators (devs, advisors, investors, hiring interviews)
- Single source for the elevator-pitch + technical depth in one document
- Print-friendly (Ctrl+P → PDF)

## Update policy

- Owner: Founder + Claude (Auto-Memory keeps the canonical numbers)
- Both files must stay in sync — if you update one, mirror the change in the other
- Reality-Check section (last section) is intentionally honest, do not soften it
- Tonality follows repo rule: "Siezen, ruhig, sachlich, kein Startup-Hype"

## Hosting (optional, not configured yet)

If you want to publish under a route like `/uebersicht`:

1. Move `index.html` + `index-en.html` to `public/uebersicht/` (or similar)
2. Add `closed-pilot` whitelist entry if 503-default applies
3. Verify CSP-Nonces are not stripped (these files use inline `<style>`, which CSP allows because they are static HTML, not script)

Currently kept under `docs/` so they are versioned but not deployed.
