# Naechste-Session Handover (Stand 2026-04-25 Abend, vor Notar 27.04.)

**Kurzfassung:** Sicherheits-Cleanup ist 100% durch (bis auf Tavily, wo User Credentials vergessen hat). Prod 5/5 GRUEN, Legacy-JWTs disabled, alle Alt-Keys revoked, Copilot Opt-out gesetzt. **Nur noch eine Sache vor Notar 27.04. (Montag): nichts kritisches, alles ist bereit.** Nach Notar: AVV → Master-Push der 52 Welle-C-Commits.

---

## Pflicht-Reihenfolge fuer naechste Session

### 1. Lesen (3 Min)
- `memory/MEMORY.md` (Auto-geladen)
- `docs/plans/2026-04-25-cleanup-abgeschlossen-handover.md` (was am 25.04. autonom erledigt wurde)
- Dieses Dokument

### 2. Status-Check Prod (1 Min)
```bash
cd "/c/Users/thoma/Claud Code/Handy APP/nachbar-io"
bash scripts/smoke-test-prod.sh
```
Muss 5/5 GRUEN sein (war es zuletzt 2026-04-25 14:02 UTC nach Legacy-JWT-Disable).

### 3. Hauptaufgabe: Notar 27.04. (Montag) — ROTE ZONE

Theobase GmbH (i.Gr.) bei Notar Stadler in Bad Saeckingen.

**Vor dem Termin (kein Handlungsbedarf von mir):**
- Geschaeftskonto-Timing mit Notar klaeren (alte Docs widerspruechlich).
- Steuerberater Albiez ggf. parallel anschreiben.

**Nach erfolgreicher Eintragung:**

**3a. AVV mit Anthropic abschliessen**
- console.anthropic.com → Settings → Privacy/AVV / DPA-Anfrage stellen mit GmbH-Daten.
- Mistral parallel.
- Entry in `project_avv_nach_gmbh.md` aktualisieren.

**3b. Master-Push freigegeben**
```bash
cd "/c/Users/thoma/Claud Code/Handy APP/nachbar-io"
git status      # sollte clean sein
git log --oneline origin/master..HEAD | wc -l   # ~52 Commits
git push origin master
```
Aktueller HEAD: `c7c5250`. Origin: `5de2a58`. **Niemals vor AVV pushen** (DSGVO-Risiko: Privat = Hobbynutzung).

**3c. Vercel-Deploy verifizieren (passiert ueber GitHub Actions)**
- ~25s Build via prebuilt-Pfad.
- Smoke-Test danach erneut: `bash scripts/smoke-test-prod.sh`.

### 4. B4 Senior-Walkthrough (falls noch nicht erfolgt)

- Checkliste: `docs/plans/2026-04-24-baustein-4-walkthrough-checkliste.md`
- Vorbereitung durch Claude unmittelbar vor Termin (siehe Checkliste-Header).
- Ursprungstermin war 24.04. — falls verschoben, neu terminieren.

### 5. Tavily-Cleanup (Low-Prio, blocker offen)

User hat E-Mail/Passwort fuer Tavily-Account vergessen. Recovery-Wege:
- https://app.tavily.com/login → "Forgot password" mit allen E-Mail-Adressen probieren (thomasth@gmx.de, theovonbald@gmail.com).
- Falls erfolgreich: Settings → API Keys → alte → Delete.
- **Kein Sicherheitsrisiko** — Alt-Key wird seit Rotation 2026-04-21 nicht mehr genutzt.

---

## Aktueller Repo-Stand (Verifikation)

| Repo | HEAD | Stand |
|---|---|---|
| Parent | `ad58e89` | 2026-04-25 (Welle-1.5 Plan-Doc) |
| nachbar-io master | `4dd71df` | **54 Commits ungepusht (AVV-blockiert bis Notar 27.04.); Build + Tests verifiziert 2026-04-25** |
| nachbar-io feature/hausverwaltung | `10ac204` | GEPUSHT origin (2026-04-21) |
| nachbar-io origin/master | `5de2a58` | Welle-B LIVE |

### Master-Verifikation 2026-04-25 (vor AVV-Push erneut nicht mehr noetig)

- Vitest: **3644 passed / 3 skipped / 0 failed** (457 Test-Files)
- `npx tsc --noEmit`: 0 Errors
- `npm run build`: CLEAN (nach Cherry-Pick `4dd71df` von feature/hausverwaltung — master war ohne Cherry-Pick nicht build-bar wegen RangeError 16707002 in globals.css; Tailwind v4 las Windows-Pfade in docs/plans/*.md als CSS-Unicode-Escapes)

### Welle-1.5-Cleanup auf master (2026-04-25, kein Push)

- `ddc9765` chore(info-hub): remove dead static Apotheken constants — APOTHEKEN_BAD_SAECKINGEN + NOTDIENST_URL waren Tot-Code, Production nutzt municipal_config
- `4dd71df` fix(tailwind): exclude docs/memory/.claude from v4 source scanning (Cherry-Pick)
- Plan-Doc: `docs/plans/2026-04-25-welle-1.5-alltagshinweise-design.md` (im Parent-Repo)

**Untracked relevant:**
- `scripts/disable-supabase-legacy-jwts.sh` (Bugfix angewandt — Query-Param statt Body. Idempotent: HTTP 422 wenn bereits disabled wird als OK gewertet.)
- 6 Handover-Dokumente in `docs/plans/2026-04-2*-*.md`

---

## Sicherheits-Status (Stand 2026-04-25)

| Provider | Rotation (21.04.) | Alt-Key-Revoke (25.04.) |
|---|---|---|
| Supabase (Service-Role) | ✅ | ✅ Default-Secret entfernt + Legacy-JWTs disabled |
| Anthropic | ✅ | ✅ 5 Alt-Keys geloescht |
| OpenAI | ✅ | ✅ `nachbar-io-tts` (UgcA) revoked |
| Google AI | ✅ | ✅ 3 Alt-Keys (EYCE/Rkqg/cn74) geloescht |
| Stripe | ✅ | ⏳ Alt-Key laeuft 2026-04-28 auto ab (in 3 Tagen) |
| Twilio | ✅ | ✅ Alt-Token tot (HTTP 401 verifiziert 21.04.) |
| Tavily | ✅ | ⏸ User-Credentials vergessen, Recovery offen |
| Upstash | ✅ | ✅ (laut alter Doku) |
| Copilot Training-Opt-out | — | ✅ Disabled (25.04.) |

**Prod ist gruen seit 2026-04-21**, keine Incidents.

---

## Was diese Session NICHT mehr machen soll

| Task | Warum nicht |
|---|---|
| Master-Push | AVV-blockiert bis nach Notar 27.04. |
| Prod-DB-Migrations | Founder-Go-Pflicht (Rote Zone) |
| Billing-Aenderungen | Nur mit explizitem Founder-Go |
| Tavily-Klick ohne User-Login | User muss Account-Recovery selbst durchziehen |

---

## Risiken / Achtsamkeit fuer naechste Session

1. **AVV-Block:** Master-Push DARF NICHT vor GmbH-Eintragung passieren (DSGVO-Risiko: privat = Hobbynutzung, nicht erlaubt fuer Anthropic/Mistral-Daten).
2. **Notar-Timing:** Geschaeftskonto-Timing mit Notar klaeren (Widerspruch in alten Docs).
3. **Stripe-Alt-Key:** laeuft 28.04. auto ab — falls Push vor 28.04., nochmal smoke-testen nach 28.04.
4. **B4-Walkthrough:** Falls 24.04. verpasst, neu terminieren mit Senior-Probanden.

---

## Tooling-Hinweise (neu seit 25.04.)

- **Claude in Chrome Extension** ist installiert in Chrome-Profil "Nachbar". Browser-Automation in eingeloggten User-Sessions ist moeglich via `mcp__Claude_in_Chrome__*`.
  - Setup: Chrome (nicht Edge!), nicht Inkognito, nicht App-Window.
  - Beim Verbinden ggf. `switch_browser` aufrufen.
  - Details: `memory/reference_claude_in_chrome.md`.
- **Supabase Management-API:** `enabled` ist Query-Param, nicht Body. Skript korrigiert.

---

## Referenzen

- Cleanup-Status (heute): `docs/plans/2026-04-25-cleanup-abgeschlossen-handover.md`
- Vorheriger Handover: `docs/plans/2026-04-25-naechste-session-handover.md`
- Original-Cleanup: `docs/plans/2026-04-22-cleanup-morgen-handover.md`
- Rotation-End: `docs/plans/2026-04-21-session-end-handover.md`
- B4 Walkthrough: `docs/plans/2026-04-24-baustein-4-walkthrough-checkliste.md`
- Memory-Regeln: `feedback_env_cli_statt_dashboard.md`, `feedback_secret_hygiene.md`, `feedback_founder_go_autonomie.md`
- Skripte: `scripts/disable-supabase-legacy-jwts.sh` (gefixed), `scripts/smoke-test-prod.sh`

---

## Schnell-Befehle

```bash
# Smoke-Test
cd "/c/Users/thoma/Claud Code/Handy APP/nachbar-io"
bash scripts/smoke-test-prod.sh

# Status
git status
git log --oneline origin/master..HEAD | head -20

# Push (NUR nach AVV!)
git push origin master

# Build-Check (vor Push)
npm run build
npx tsc --noEmit
npm run test
```
