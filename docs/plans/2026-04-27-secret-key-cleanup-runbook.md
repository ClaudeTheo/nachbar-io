# Runbook: Supabase Secret-Key-Cleanup nach Rotation

Stand: 2026-04-27

## Zweck

Sichere gemeinsame Regel fuer Codex/Opus beim Aufraeumen alter Supabase Secret API Keys nach Rotation.

## Quellenlage

- Vercel Sensitive Environment Variables sind nach dem Setzen nicht lesbar. `vercel env pull` darf fuer sensitive Werte nicht als "leer" interpretiert werden.
- Vercel Env-Aenderungen gelten laut Vercel-Doku fuer neue Deployments, nicht verlaesslich fuer bereits laufende Deployments.
- Supabase empfiehlt fuer Secret-Key-Rotation:
  - neuen Secret Key erzeugen
  - alle Komponenten auf den neuen Key umstellen
  - sicherstellen, dass alle Komponenten den neuen Key nutzen
  - alten Key erst danach entfernen
- Supabase-Doku: Secret-Key-Delete ist irreversibel.
- Supabase-Doku: `last used` im API-Keys-Dashboard ist der bevorzugte Downtime-Schutz vor Deaktivierung/Loeschung.

## Aktueller Sachstand

Projekt:

- Supabase Project Ref: `uylszchlyhbpbmslcnka`
- Vercel Project: `nachbar-io`

Bekannte Secret-Key-Namen:

- alter Key: `nachbar_io_vercel_prod_20260427_codex`
- neuer Key: `nachbar_io_vercel_prod_20260427_codex_v2`

CLI-Metadaten ohne Secret-Werte:

- alter Key ID: `982c5776-bb52-4138-ba92-c1be2d27d1ec`
- neuer Key ID: `cdc3ea90-fbca-4d59-9d3c-0ffe04990ce6`

Live-Sanity:

- `POST https://nachbar-io.vercel.app/api/register/check-invite`
- Payload: `{"inviteCode":"3WEA-VPXU"}`
- Ergebnis 2026-04-27: HTTP 200, Invite gueltig

Wichtig: HTTP 200 beweist, dass Production einen gueltigen Supabase Admin-Key nutzt. Es beweist allein nicht, ob es v1 oder v2 ist.

## Gemeinsame Regel

### Keine falschen Schluesse

- `value_len=2` oder `""` aus `vercel env pull` bei sensitive Env Vars ist kein Beweis fuer leeren Wert.
- `vercel env ls` zeigt keine Secret-Werte und beweist nicht, welcher konkrete Supabase Secret Key in einem laufenden Deployment genutzt wird.
- Ein erfolgreicher Live-Smoke beweist "Admin-Key funktioniert", nicht "v2 wird benutzt".

### Sicherer Standardpfad

1. Dashboard- oder API-Metadaten lesen, ohne Secret-Werte auszugeben.
2. Wenn `last_used` fuer v2 sichtbar und aktuell ist und v1 ungenutzt ist:
   - alten Key entfernen/deaktivieren nach bestaetigter Aktion.
3. Wenn `last_used` nicht maschinenlesbar verfuegbar ist:
   - nicht raten.
   - Vercel Production `SUPABASE_SERVICE_ROLE_KEY` kontrolliert erneut auf v2 setzen.
   - Production redeployen.
   - Live-Sanity ausfuehren.
   - erst danach alten Key entfernen.

### Aktionen mit besonderer Vorsicht

- Vercel Env update: Cloud-Konfigurationsaenderung, nur mit ausdruecklichem Founder-Go.
- Vercel Redeploy: rote Zone, nur mit ausdruecklichem Founder-Go.
- Supabase Secret-Key delete/revoke: irreversibel, nur mit direkter Aktionsbestaetigung.

## Verboten

- Keine Secret-Werte in Chat, Logs, Markdown, Shell-Ausgabe oder Git.
- Kein `echo $SECRET`.
- Kein `vercel env pull` als Wahrheitsquelle fuer sensitive Werte.
- Kein Delete/Revoke eines Supabase Secret Keys, solange unklar ist, ob ein laufendes Deployment ihn noch nutzt.
- Keine lokalen `.env*`-Dateien in Reports ausgeben.

## Wenn Automatisierung noetig ist

Automatisierung darf Secret-Werte nur in Prozess-Pipes halten und nie ausgeben.

Akzeptables Muster:

- Supabase-Key aus Management-/CLI-Antwort intern extrahieren.
- Direkt via stdin oder API-Body an Vercel `SUPABASE_SERVICE_ROLE_KEY` weiterreichen.
- Ausgabe auf Status/IDs/HTTP-Codes beschraenken.
- Danach Live-Sanity mit `check-invite`.

Nicht akzeptabel:

- Secret in temp-Datei schreiben, ausser zwingend noetig und danach sicher geloescht.
- Secret-Prefix laenger als 6 Zeichen loggen.
- Vollwert zur manuellen Pruefung in Chat kopieren.

## Entscheidungsbaum

1. Kann Dashboard/Metadaten `last_used` eindeutig lesen?
   - Ja: Nur entfernen, wenn v2 aktuell genutzt und v1 nicht mehr genutzt wird.
   - Nein: Vercel auf v2 konvergieren + Redeploy + Smoke, dann v1 entfernen.
2. Gibt es nur irreversible Delete-API, aber kein Disable?
   - Delete erst nach erfolgreicher Konvergenz und Smoke.
3. Nach Entfernen:
   - sofort Live-Sanity wiederholen.
   - Fehlerfall: Stopp, keine weiteren Aenderungen, Ursache suchen.

## Abschluss 2026-04-27

Mit Founder-Go ausgefuehrt:

1. Supabase Secret Key `nachbar_io_vercel_prod_20260427_codex_v2` intern per CLI/Management-Metadaten gelesen, ohne Secret-Ausgabe.
2. Vercel Production `SUPABASE_SERVICE_ROLE_KEY` per stdin auf v2 konvergiert:
   - `vercel env update` war fuer sensitive Env Var nicht erlaubt.
   - Erfolgreicher Pfad: `vercel env add SUPABASE_SERVICE_ROLE_KEY production --sensitive --force --yes`.
3. Existing Production Deployment redeployed, nicht lokaler Working Tree deployed:
   - Quelle: `nachbar-e3p66kxw3-thomasth1977s-projects.vercel.app`
   - Neues Production Deployment: `nachbar-ofzinbmzp-thomasth1977s-projects.vercel.app`
   - Alias: `https://nachbar-io.vercel.app`
4. Live-Sanity nach Redeploy:
   - `POST /api/register/check-invite`
   - HTTP 200
   - `valid:false` fuer `3WEA-VPXU`, weil der Code inzwischen nicht mehr als gueltiger ungenutzter Invite behandelt wird.
   - Wichtig: kein 401/500, Admin-Key-Pfad laeuft.
5. Alter Supabase Secret Key geloescht:
   - Name: `nachbar_io_vercel_prod_20260427_codex`
   - ID: `982c5776-bb52-4138-ba92-c1be2d27d1ec`
   - Management API Delete: HTTP 200
   - Danach: alter Key nicht mehr vorhanden, v2 weiterhin vorhanden.
6. Finaler Live-Sanity nach Delete:
   - HTTP 200
   - kein Service-Key-Ausfall.

Keine Secret-Werte wurden ausgegeben oder in Dateien geschrieben.
