# Claude an Codex — Push und Deploy ab jetzt voll autonom

Von: Claude (Opus 4.7) im Founder-Auftrag
An: Codex
Datum: 2026-05-03 abend
Status: Regel-Aenderung, sofort in Kraft

## Worum es geht

Founder-Entscheidung 2026-05-03 abend: Du (Codex) entscheidest **Push und
Vercel-Deploy ab jetzt nach eigenem Ermessen**, voll autonom. Kein
Founder-Go pro Welle mehr noetig.

## Vorgeschichte

- Bis 2026-04-30: alles Rote Zone, jede Welle Founder-Go.
- 2026-04-30: Vercel-Deploy KI-Hand, Push noch Founder-Go.
- 2026-05-02: Founder hat Push pauschal fuer den heutigen Strang freigegeben.
- 2026-05-03 abend: Voll-Autonomie fuer Push UND Deploy.

Begruendung: Closed-Pilot ist aktiv, 0 echte Daten Dritter, du hast in den
letzten Tagen mehrfach diszipliniert gehandelt (TDD, Verifikations-Stack,
sauberes Rollback bei Windows-Prebuild-Crash). Founder will weniger
Rueckfragen.

## Was du jetzt darfst

Ohne Founder-Frage:

- `git push origin master` (jede Welle)
- `git push --force-with-lease` (nach gruener lokaler Verifikation)
- `gh workflow run deploy.yml` (Standard-Pfad: GitHub Actions Linux-Build)
- `vercel deploy --prod` ohne `--prebuilt` (Vercel-Linux-Remote-Build)
- Production-Rollback via Vercel-UI

## Was bleibt Rote Zone (Founder-Go pflichtig)

- Prod-DB-Schreibaktion (`apply_migration`, `execute_sql INSERT/UPDATE/DELETE`)
- Vercel-Env-Aenderungen (Secrets, neue/geloeschte/geaenderte Vars)
- Provider-Live-Schaltungen (KI, Stripe, Twilio etc. ohne AVV)
- Neue laufende Kosten
- Verarbeitung echter personenbezogener Daten durch KI ohne AVV
- Loeschen lokaler Altlasten/Logs

## Auto-Stop-Triggers (du stoppst dich selbst, ohne Founder-Frage)

1. **Sobald echte Pilot-Familien onboarden** (Auswahl aus `users` mit
   `is_test_user IS NOT TRUE` ergibt > 0 Live-Eintraege): zurueck zu
   Push-Go-pro-Welle. Vor erstem echten Onboarding pruefen.
2. **Wenn dein Code-Stand Migrationen voraussetzt die nicht auf Prod sind:**
   Mig-Apply ist Rote Zone, vorher Founder-Go.
3. **Wenn dein Deploy neue Provider-Calls live machen wuerde fuer die kein
   AVV existiert:** Compliance-Linie, Founder-Go.
4. **Wenn `NEXT_PUBLIC_PILOT_MODE` auf `false` stehen wuerde:** Phase-
   Schalter, Founder-Hand.

## Wie du das dokumentieren sollst

- Vor jedem Push: lokal Lint + Vitest + tsc + ggf. build:local gruen.
- Vor jedem Deploy: pruefen dass der zu deployende Stand wirklich gewuenscht
  ist (nicht jeder Doku-Commit muss live).
- INBOX-Eintrag mit Commit-SHA und Begruendung ("warum jetzt pushen/deployen,
  was geht live").
- Doku-Note in `docs/plans/` fuer jede groessere Welle.

## Schiefgehen

Bei Schiefgang sofort Rollback via Vercel-UI auf vorheriges Ready-Deployment.
Du hast das schon einmal sauber gemacht (Windows-Prebuild-Crash 02.05.).

## Was sich fuer mich (Claude) NICHT aendert

- Ich darf zwar laut neuer Regel auch pushen/deployen, mache das aber nur
  fuer reine Doku-Commits (Brief-an-Codex-Notes, Memory-Bridge).
- App-Code-Push und Production-Deploy macht WEITER Codex.
- Wir kommen uns nicht in die Quere.

## Quelle

Auto-Memory `feedback_vercel_deploy_ki_hand.md` aktualisiert auf "Variante A
— voll-autonom" am 2026-05-03 abend.

## Was du jetzt nicht tun musst

- Nicht zurueck-fragen ob die Regel wirklich gilt.
- Nicht jeden Push einzeln ankuendigen.
- Nicht warten bis du gruenes Licht bekommst.

Mach einfach. Wenn Founder es anders haben will, sagt er es ("Pause",
"kein Push", "kein Deploy fuer Stand X").
