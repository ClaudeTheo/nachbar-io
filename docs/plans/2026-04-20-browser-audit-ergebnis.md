# Browser-Audit Ergebnis

## Getestet mit
- Git-HEAD: 587fe9f
- Dev-Server-URL: http://localhost:3000
- Datum: 2026-04-20 19:56 +02:00
- Tool: Lighthouse CLI + Playwright CLI Browser-Tool

## Kurzfazit
Der öffentliche Fehlerpfad ist aktuell nicht sauber: `/einladung/{token}` läuft bei ungültigem Token in einen echten `500` und zeigt den internen Schema-Cache-Fehler für `public.housing_invitations` an. Der unauthentifizierte Accept-Pfad leitet plausibel auf `/login?next=...` weiter, aber der echte End-to-End-Flow mit erzeugtem validem Token war lokal nicht vollständig prüfbar, weil sowohl die Housing-Tabelle im laufenden Backend fehlt als auch die vorhandenen E2E-Logins/Sessions nicht nutzbar waren.

## Findings nach Schwere
| Severity | Route | Befund | Repro-Schritte | Fix-Vorschlag |
| --- | --- | --- | --- | --- |
| crit | `/einladung/invalid-token-123` | Öffnen eines ungültigen Tokens führt nicht zu einem sauberen 404/Expired-State, sondern zu `GET /api/housing/invitations/invalid-token-123/info -> 500`; die UI zeigt den internen Fehler `Could not find the table 'public.housing_invitations' in the schema cache`. | 1. `http://localhost:3000/einladung/invalid-token-123` öffnen. 2. Warten, bis der Request fertig ist. 3. Network/Console prüfen: `500` auf der Info-Route, Alert mit Rohfehler sichtbar. | `housing_invitations` im genutzten Backend sicher bereitstellen und den Public-Info-Endpoint bei fehlender/ungültiger Einladung auf einen stabilen 404/Expired-Response ohne interne DB-Details hart machen. |
| high | `/hausverwaltung/einladen` | Der echte Resident-Create-Flow war lokal nicht erreichbar: die Route landet ohne Session auf `/login`, die repo-eigenen E2E-Credentials für den Test-Login liefern `401 Invalid login credentials`, und die vorhandenen `.auth`-States sind abgelaufen (`Invalid Refresh Token: Refresh Token Not Found`). | 1. `http://localhost:3000/hausverwaltung/einladen` öffnen. 2. Redirect auf `/login` sehen. 3. `GET /api/test/login?...` oder Supabase-Password-Login mit den repo-E2E-Daten probieren. 4. `401 Invalid login credentials` bzw. Refresh-Token-Fehler sehen. | Eine funktionierende lokale Audit-Session für einen Bewohner wiederherstellen: gültige E2E-Testnutzer oder frisch erzeugte Auth-States, damit Invite-Erzeugung und validToken-Flow real testbar werden. |
| med | `/hausverwaltung/einladen` | Der Redirect vom geschützten Invite-Einstieg verliert den Rückweg: statt `/login?next=%2Fhausverwaltung%2Feinladen` landet man nur auf `/login`. | 1. Ohne Session `http://localhost:3000/hausverwaltung/einladen` öffnen. 2. Finale URL prüfen. 3. Es fehlt `next=/hausverwaltung/einladen`. | Beim Auth-Redirect den `next`-Parameter mitschicken, damit der Nutzer nach Login wieder in den Invite-Flow zurückkommt. |

## Lighthouse-Scores
| Route | Perf | A11y | BP | SEO | Kommentar |
| --- | --- | --- | --- | --- | --- |
| `/hausverwaltung/einladen` | 45 | 100 | 96 | 92 | Lighthouse wurde auf die Zielroute gestartet, landete aber real auf `/login`; Warnung wegen Redirect. |
| `/einladung/invalid-token-123` | 60 | 100 | 100 | 92 | Wegen fehlendem validen Token wurde der reale Fehlerpfad auditiert; Warnung, dass der Load zu langsam/unvollständig war. |
| `/einladung/invalid-token-123/accept` | 60 | 100 | 100 | 92 | Wegen fehlendem validen Token wurde der unauthentifizierte Accept-Pfad auditiert; Browser-Check zeigte `401` auf `POST /api/housing/invitations/consume` und Redirect auf `/login?next=%2Feinladung%2Finvalid-token-123%2Faccept`. |

## Nicht prüfbar
- Echter Invite-Create-Flow mit erzeugtem validem Token, weil lokal keine nutzbare Bewohner-Session verfügbar war.
- `GET /api/housing/invitations/[token]/info` mit validem Token, weil das laufende Backend `public.housing_invitations` nicht im Schema-Cache hatte.
- `POST /api/housing/invitations/consume` im validen, eingeloggten Auto-Consume-Fall, weil dafür weder gültiger Token noch funktionierende Hausverwaltungs-Session vorlagen.

## Empfohlene nächste 3 Fixes
1. `housing_invitations` im tatsächlich genutzten Backend/Schema verfügbar machen; ohne das bleibt der Flow in der roten Zone.
2. Public-Info-Fehlerpfad härten: bei ungültigem oder backend-seitig fehlendem Invite nie rohe DB-/Schema-Fehler an die öffentliche Landing durchreichen.
3. Lokale Audit-Authentifizierung für den Resident-Flow wiederherstellen und beim Redirect von `/hausverwaltung/einladen` den `next`-Parameter erhalten.

## Blocker / Rote Zone
- Laufzeit-Backend meldet für `GET /api/housing/invitations/[token]/info`: `Could not find the table 'public.housing_invitations' in the schema cache`.
- Im Repo liegt zwar `supabase/migrations/180_housing_invitations.sql`, aber im laufenden Audit-Backend war der Baustein nicht verfügbar.
- Ohne gültige lokale Bewohner-Session plus verfügbare `housing_invitations`-Tabelle war kein echter validToken-End-to-End-Check möglich, ohne gegen die No-DB-Write-/No-Migration-Vorgaben zu verstoßen.
