# npm audit Snapshot — 2026-04-21

**Projekt:** nachbar-io
**Gemessen:** 2026-04-21
**Ergebnis:** 0 critical / 1 high / 4 moderate / 0 low

## Vulnerabilities im Detail

| Severity | Paket | Problem | Fix verfuegbar |
|---|---|---|---|
| HIGH     | `next`            | Denial of Service via Server Components                                                         | ja |
| MODERATE | `axios`           | NO_PROXY Hostname Normalization Bypass → SSRF; Unrestricted Cloud Metadata Exfiltration         | ja |
| MODERATE | `dompurify`       | ADD_TAGS bypasses FORBID_TAGS (short-circuit eval)                                              | ja |
| MODERATE | `follow-redirects`| Leaks Custom Authentication Headers auf Cross-Domain Redirect                                   | ja |
| MODERATE | `hono`            | Improper JSX Attribute Handling → HTML Injection in hono/jsx SSR                                | ja |

## Bewertung

- **High `next` DoS:** Next.js selbst. Fix typischerweise via `npm i next@latest`. Vorsicht: Next 16.x ist aktuelle Major — Patches kommen laufend. Pruefe ob wir schon auf neuestem Patch-Level sind und ob das Update einen Breaking-Change bringt.
- **Moderate `axios`:** SSRF + Cloud-Metadata-Exfil sind in einem Serverless/Vercel-Context realistisch exploitbar (EC2-IMDS-Analogon gibts bei Vercel nicht, aber Downstream-Services koennten betroffen sein). **Sollte gefixt werden.**
- **Moderate `dompurify`:** Nur relevant wenn wir User-HTML durch DOMPurify jagen. Grep auf `DOMPurify` zeigt evtl. nur 1-2 Stellen.
- **Moderate `follow-redirects`:** Transient dependency (meist via axios / http-libs). Durch axios-Fix wahrscheinlich mitgeschleppt.
- **Moderate `hono`:** Wahrscheinlich Edge-Middleware. Wenn wir SSR-JSX in hono nutzen, pruefen.

## Empfohlener Vorgehen

1. **Erst `npm audit fix` trocken**:
   ```
   npm audit fix --dry-run
   ```
   Zeigt welche Versionen geaendert werden. Wenn keine Major-Sprunge: einfach `npm audit fix` ausfuehren.

2. **Bei Breaking-Change-Warnung (`--force` noetig)**: manuell pro Paket pruefen. `next`-Major-Updates gehoeren ohnehin in separate PRs.

3. **Nach Fix**: Tests laufen lassen (`npm run test`, `npx tsc --noEmit`) und Smoke-Test (`bash scripts/smoke-test-prod.sh`). Bei Gruen: committen.

4. **Nicht jetzt**: wir sind mitten in Secret-Rotation. Dependency-Updates bringen Regression-Risiko, das sollte nicht mit dem Rotation-Chaos mischen. **Nach Push 27.04. in einer eigenen Session** — ist ein 30-60-Min-Task.

## Nicht-Audit-Anmerkung

`total dependencies: 0` in der JSON-Antwort ist ein npm-Bug/-Quirk (metadata ist manchmal leer bei workspaces). Vuln-Counts sind korrekt.
