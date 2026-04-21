# Sprechvorlagen — Vercel-Security-Incident

**Kontext:** Vercel hat am 2026-04-20 per Security Bulletin informiert, dass es unauthorized access zu internen Systemen gab. Laut Mail sind deine Credentials nicht im bestaetigten Kompromittiert-Set, aber Vercel empfiehlt allen Kunden Rotation + Activity-Log-Review + Sensitive-Flag.

Unten vier Text-Vorlagen, je nach Szenario. Alle in "du-Form an Support" geschrieben — Vercel-Support und andere reagieren auf deutsch und englisch.

---

## Vorlage 1 — Activity-Log ist SAUBER

**Nicht versenden.** Du musst nichts sagen, wenn alles sauber ist. Rotation einfach durchziehen wie geplant.

Falls du trotzdem eine Rueckmeldung geben willst (z.B. an Codex/dein Team), hier der Status-Text:

> Activity-Log-Review abgeschlossen (Vercel Account + Team). Keine Auffaelligkeiten in den letzten 30 Tagen (keine fremden Logins, keine unerwarteten Env-Var-Reads, keine neuen Deploy-Hooks / Team-Mitglieder). Rotation P0+P1 laeuft wie geplant, Vercel-Envs werden dabei auf Sensitive umgestellt.

---

## Vorlage 2 — Auffaelligkeit gefunden, moechte Vercel-Support kontaktieren

**An:** Vercel Support — entweder via https://vercel.com/help oder per E-Mail an support@vercel.com.

### Deutsch

```
Betreff: Security-Incident Bulletin — auffaellige Activity festgestellt

Hallo Vercel-Team,

ich habe heute Ihre Security-Incident-Benachrichtigung erhalten und
wie empfohlen das Activity-Log in meinem Account geprueft.

Ich habe dabei folgende Auffaelligkeit(en) gefunden:

- [KURZ BESCHREIBEN was du gesehen hast. Beispiel:]
- [Login aus Land/IP-Region X am Datum Y, die nicht von mir stammt]
- [Env-Variable-Read fuer Projekt Z am Datum Y, den ich nicht ausgeloest habe]
- [neuer Deploy-Hook / Webhook / Team-Member am Datum Y]

Bevor ich meine Credentials rotiere, wollte ich sichergehen, dass
ich nicht versehentlich Evidence vernichte, die fuer Ihre Incident-Response
relevant ist. Bitte teilen Sie mir mit:

1. Ob diese Activity im Rahmen des aktuellen Incidents verdaechtig ist
2. Ob Sie mein Account als betroffen klassifizieren
3. Welche Reihenfolge Sie fuer Rotation / Logs-Erhalt empfehlen

Meine Account-Daten:
- E-Mail: [deine Vercel-Login-E-Mail]
- Team / Account-Name: [falls Team vorhanden]
- Relevante Projekt(e): nachbar-io, nachbar-arzt

Vielen Dank fuer schnelle Rueckmeldung.

Gruss,
Thomas Theobald
```

### English (falls Support nur EN antwortet)

```
Subject: Security Incident Bulletin — suspicious activity in account

Hi Vercel team,

I received your Security Incident notification today and reviewed my
account activity log as recommended.

I found the following suspicious entry/entries:

- [BRIEFLY describe what you saw, e.g.:]
- [Login from country/IP region X on date Y that was not me]
- [Env variable read on project Z on date Y that I did not trigger]
- [New deploy hook / webhook / team member on date Y]

Before I rotate my credentials, I want to make sure I do not destroy
evidence that may be relevant for your incident response. Please advise:

1. Whether this activity is considered suspicious in the current incident
2. Whether my account is classified as affected
3. What order you recommend for rotation vs. log preservation

My account details:
- Email: [your Vercel login email]
- Team / Account name: [if team]
- Relevant projects: nachbar-io, nachbar-arzt

Thanks for a quick reply.

Best,
Thomas Theobald
```

---

## Vorlage 3 — Update an Codex (oder wer immer mit-arbeitet)

Kurzer Status-Ping, damit Codex weiss wo wir stehen:

```
Vercel hat heute Security-Incident-Bulletin ausgerollt (unauthorized
access zu internen Systemen). Unser Account ist laut Vercel NICHT im
bestaetigten Kompromittiert-Set, aber die Empfehlung lautet
Rotation + Sensitive-Flag + Activity-Log-Review.

Status:
- Claude hat Checkliste + Sprechvorlagen erweitert
  (docs/plans/2026-04-20-secret-rotation-checklist.md,
   docs/plans/2026-04-21-vercel-incident-sprechvorlagen.md).
- Ich pruefe morgen das Activity-Log (VOR der Rotation).
- Danach regulaere P0+P1 wie gehabt, aber NACH Rotation jede
  nicht-NEXT_PUBLIC-Variable als Sensitive in Vercel eintragen.

Dauer-Impact: +5 Min Activity-Log + ~2 Min pro Sensitive-Toggle. Roadmap unveraendert.
```

---

## Vorlage 4 — Falls Vercel-Support nachfragt / E-Mail von Vercel kommt

Wenn du von Vercel direkt kontaktiert wirst ("wir haben festgestellt dass auch dein Account betroffen war"):

```
Antwort:

Vielen Dank fuer die Info. Ich hatte meinen Activity-Log bereits geprueft
und [keine Auffaelligkeiten gefunden | folgende Auffaelligkeiten gefunden: ...].

Rotation fuer alle relevanten Env-Vars und Provider-Keys (Anthropic,
OpenAI, Google AI, Supabase, Stripe, Twilio, Resend, Upstash) laeuft
parallel. Ich werde die rotierten Werte bei Vercel als "Sensitive"
eintragen.

Bitte schicken Sie mir alle Infos die ich fuer weitere Schritte brauche
(Art des Incidents, empfohlene zusaetzliche Massnahmen, PITR-Zeitraum
der potenziell betroffenen Projekte).

Bei Rueckfragen bin ich unter [Telefon / E-Mail] erreichbar.

Gruss,
Thomas Theobald
```

---

## Was du **nicht** sagen sollst

- Keine vollstaendigen Key-Werte in E-Mails an Support (weder alte noch neue).
- Keine Bestaetigung von Vermutungen, die der Support nicht bestaetigt hat ("ja, mein Account war definitiv betroffen" — lieber "es gab eine Auffaelligkeit, bitte pruefen Sie").
- Keine Panik-Formulierungen ("wir sind alle in Gefahr") — sachlich bleiben.

---

## Hinweis

Diese Vorlagen sind Staendige fuer den Fall, dass du sie brauchst. Wenn dein Activity-Log sauber ist (wahrscheinlich), brauchst du nur Vorlage 1 optional fuer einen Status-Ping. Rotation laeuft unabhaengig.
