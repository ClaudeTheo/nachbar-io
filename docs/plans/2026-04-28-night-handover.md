# 2026-04-28 Nacht — Handover nach Push-Bewertung

## TL;DR

- `master` steht lokal auf dem Doku-Abschlusscommit `docs(handoff): add push assessment night handover`.
- App-Code-Stand vor dem Doku-Abschluss: `a85b76e docs(handoff): mark block 3 done`.
- `master` ist 63 Commits vor `origin/master`; nichts wurde gepusht.
- Block 3 AI-Stufen-Settings ist implementiert, lokal verifiziert und committet.
- Push-Bewertung wurde erstellt und erweitert: `docs/plans/2026-04-28-push-bewertung-master-ahead.md`.
- Code-/Testlage auf `a85b76e`: laut Claude-Audit `npx tsc --noEmit` exit 0 und `npx vitest run` exit 0.
- Realer technischer Deploy-Blocker: Vercel Production hat laut Claude `PILOT_MODE`, aber `NEXT_PUBLIC_PILOT_MODE=true` fehlt.
- Kein Push, kein Deploy, keine Prod-DB-Aktion, keine Vercel-Env-Schreibaktion in dieser Abschlussrunde.

## Aktueller Git-Stand

```text
Repo: C:\Users\thoma\Claud Code\Handy APP\nachbar-io
Branch: master
HEAD: docs(handoff): add push assessment night handover
App-Code-HEAD vor Doku-Abschluss: a85b76e docs(handoff): mark block 3 done
Ahead: 63 Commits gegen origin/master
Bewerteter Push-Scope initial: origin/master..97593a2 (53 Commits)
Erweiterter App-Code-Scope: 97593a2..a85b76e (9 Commits Block 3)
Abschluss-Doku-Commit: docs(handoff): add push assessment night handover (Push-Bewertung + Nacht-Handover)
```

Der Bewertungsbericht ist bewusst als Doku-Artefakt angelegt und sollte zusammen mit diesem Handover lokal committed werden. Alte untracked Logs, `output/`, `.playwright-cli/` und aeltere untracked Plan-Dateien wurden nicht aufgeraeumt und nicht in den Scope gezogen.

## Heute relevante Commits nach `97593a2`

```text
e97b3f0 docs(handoff): mark block 3 in progress
5c44f59 docs(plan): add ai assistance settings implementation plan
0130372 feat(ki-help): add shared ai assistance levels
296bbf9 feat(ki-help): add ai assistance level picker
0bc44eb refactor(register): use shared ai assistance level picker
242e8e6 feat(settings): choose ai assistance level in memory settings
cbacc35 feat(ai): persist assistance level in user settings
69f8b87 feat(api): accept ai assistance level settings
a85b76e docs(handoff): mark block 3 done
docs(handoff): add push assessment night handover
```

## Push-Bewertung — aktuelles Urteil

Datei: `docs/plans/2026-04-28-push-bewertung-master-ahead.md`

Konsolidiertes Urteil:

- Code-/Testlage auf `a85b76e`: pushfaehig.
- Migration 175: laut Claude bereits auf Prod applied, Backfill komplett.
- Auto-Deploy: laut Claude/Memory kein direkter Push-Trigger fuer `nachbar-io`; Deploy laeuft ueber Cron/SHA-Check bzw. manuell.
- Block 3: bewertet, DB-frei, nicht push-blockierend.
- KI-Route-Statuscodes `503`: gelb/akzeptiert, nicht push-blockierend.
- Pi/Kiosk-Removal: braucht Founder-Bestaetigung oder bewusstes Akzeptieren.
- Harte Deploy-Vorbedingung: `NEXT_PUBLIC_PILOT_MODE=true` in Vercel Production setzen, synchron zu `PILOT_MODE`.
- Organisatorisch bleibt HR/AVV/Founder-Go fuer Master-Push zu beachten.

## Neuer Env-Befund

Mehrere Client-/Bundle-nahe Codepfade lesen `process.env.NEXT_PUBLIC_PILOT_MODE`. Wenn Vercel nur `PILOT_MODE` ohne `NEXT_PUBLIC_` hat, werden diese Pfade im Browser-Bundle als Non-Pilot gebaut.

Kritische Bereiche:

- Praevention-Buchungen und Payment-Konfiguration.
- Invitations.
- Feature-Flag-Bypaesse.
- TTS-/Pilot-Hinweise.

Empfehlung vor Build/Deploy:

```text
Vercel Production: NEXT_PUBLIC_PILOT_MODE=true
optional Preview: NEXT_PUBLIC_PILOT_MODE=true
```

Danach erst neu bauen/deployen, weil `NEXT_PUBLIC_*` zur Build-Zeit in den Client-Bundle eingebettet wird.

## Naechste Session

1. Zuerst diesen Handover und `docs/plans/2026-04-28-push-bewertung-master-ahead.md` lesen.
2. Falls Push-Block weitergeht: Founder-Go/AVV/HR-Regel klaeren.
3. Vor Deploy: `NEXT_PUBLIC_PILOT_MODE=true` in Vercel Production setzen oder bestaetigen lassen.
4. Danach optional finalen Build-/Smoke-Block planen.
5. Keine alten untracked Logs/Outputs/Scripts anfassen, wenn sie nicht explizit Thema sind.

## Nicht tun ohne neues Go

- Kein `git push origin master`.
- Kein Vercel-Deploy.
- Kein `vercel env add/rm`.
- Keine Prod-DB-Schreibung.
- Kein Cleanup-Execute fuer AI-Testnutzer.
- Keine Secrets lesen, anzeigen oder rotieren.
