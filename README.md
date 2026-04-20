# nachbar-io

Next.js 16 / TypeScript / Tailwind v4 / Supabase (EU Frankfurt).

Siehe Parent-CLAUDE.md (`../CLAUDE.md`) fuer Gesamt-Architektur, Pilot-Kontext und Regeln.

## Dev-Modi

`nachbar-io` kann gegen **zwei Backends** laufen:

| Script | Supabase-Ziel | Zweck |
|---|---|---|
| `npm run dev` | lokaler Docker-Stack (`127.0.0.1:54421`) | **Default** — sicheres Arbeiten, keine Prod-Beruehrung |
| `npm run dev:cloud` | Prod-Cloud (`uylszchlyhbpbmslcnka.supabase.co`) | Nur fuer Prod-Debugging oder finale Integrations-Tests |

Die Env-Files:

- `.env.local` — lokale Konfiguration (Default-Supabase-Ziel: `127.0.0.1:54421`)
- `.env.cloud.local` — Cloud-Konfiguration (wird nur von `npm run dev:cloud` geladen, via `scripts/dev-cloud.mjs`)
- `.env.local.example` — Template fuer neue Entwickler

Beide `.env*.local`-Dateien sind via `.gitignore` ausgeschlossen.

## Lokaler Supabase-Stack

Voraussetzung: Docker Desktop (oder Rancher) laeuft.

```bash
npm run supabase:start    # Docker-Stack hochfahren (Ports 54421-54427)
npm run supabase:status   # URLs + Keys anzeigen
npm run dev               # gegen lokalen Stack
npm run supabase:stop     # Stack runterfahren
npm run supabase:reset    # DB auf Migrations-Snapshot zuruecksetzen + Seed laden
```

Der Stack laeuft auf Ports **54421-54427** (Shift +100 gegenueber Supabase-Standard), damit er parallel zum Nahkreis-Projekt (`projekt-nahraum-app`, Standard-Ports) laufen kann.

| Dienst | URL |
|---|---|
| API | http://127.0.0.1:54421 |
| DB  | postgresql://postgres:postgres@127.0.0.1:54422/postgres |
| Studio | http://127.0.0.1:54423 |
| Inbucket (Mail) | http://127.0.0.1:54424 |

### Bekannter Blocker (Stand 2026-04-20)

`npm run supabase:reset` bricht aktuell bei Migration `019_care_shared_functions.sql` ab (`relation "care_helpers" does not exist`). Grund: historische Migrationen referenzieren Tabellen, die erst spaeter erzeugt werden — das reproduziert den **Prod-Drift** (siehe `.claude/rules/db-migrations.md`).

Aktuelle Strategie: **struktureller Local-Stack ist vorbereitet**, aber das Migrations-Replay muss separat geloest werden (Baseline-Umbau oder Prod-Snapshot-Import). Bis dahin ist `dev:cloud` der einzige funktionierende Modus.

## Cloud-Modus (Prod-Supabase)

```bash
npm run dev:cloud
```

Das Script `scripts/dev-cloud.mjs` laedt `.env.cloud.local` vor Next.js-Start in `process.env`. Laut Next.js-Precedence-Regel gewinnen Shell-Env-Werte gegen `.env.local`-Werte — damit wird der lokale Default ueberschrieben.

**Rote Zone beachten:** Im Cloud-Modus trifft jeder DB-Zugriff Prod. Keine Migrations applyen, keine Seed-Skripte laufen lassen ohne Founder-Go.

## Tests

```bash
npm run test             # Vitest Unit + Integration
npm run test:e2e         # Playwright E2E (Single-Browser)
npm run test:e2e:multi   # Multi-Browser + Agent-Scenarien
npx tsc --noEmit         # Type-Check
npm run lint             # ESLint
```

## Supabase-Types generieren

```bash
npm run db:types
```

Generiert `lib/supabase/database.types.ts` aus dem Prod-Schema (braucht Internet + Login).

## Deployment

Siehe Parent-CLAUDE.md-Abschnitt "Deployment (Vercel)".

## Next.js Docs

- [Next.js Documentation](https://nextjs.org/docs)
- [Environment Variables](https://nextjs.org/docs/app/guides/environment-variables)
