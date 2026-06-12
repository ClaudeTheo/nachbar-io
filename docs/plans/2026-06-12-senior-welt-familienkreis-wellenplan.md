# Wellen-Plan: Eine Senior-Welt + Senior-Hälfte des Familienkreises

> **Erstellt:** 2026-06-12 (Fable 5), beauftragt vom Founder („Go für alles") als Folge der App-Analyse.
> **Quelle der Befunde:** `2026-06-12-fable5-app-analyse-ergebnis.md` (Top-5-strategisch #3 + #4) und `2026-06-12-fable5-app-analyse-befunde-detail.md` (Befund-IDs unten verweisen dorthin).
> **Stand bei Erstellung:** master `f283c34` (Quickwins-PR #39 + Pseudonymisierung `9294485` gemerged).
> **Ziel:** Vor dem ersten Pilot-Haushalt. Beide Wellen sind die eigentliche Produktarbeit, die der Pilot braucht — kein „mehr", sondern „rund".

---

## Welle S1 — Eine Senior-Welt (Aufwand M)

**Problem:** Es existieren zwei kreuzverlinkte Senior-Oberflächen. Der Legacy-Pfad `app/senior/*` schreibt Check-ins in die seit Mig 032 deprecatete Tabelle `senior_checkins` und meldet IMMER Erfolg inkl. „Vertrauensperson wird informiert" — falsche Beruhigung, die kein Caregiver-Dashboard je sieht (A3:2). Der Senior pendelt zwischen zwei Startseiten (B1:6) und fällt bei „Hier bei mir" aus der Senior-Shell in die dichte Standard-UI (A4:4).

**Schritte (Reihenfolge = Empfehlung):**

1. **Pre-Check (Pflicht, erster Todo):** `lib/legacy-routes.ts` lesen — der Route-Gate-Hook ist dort bewusst erhalten (C1:1-Empfehlung) und kann die Redirects tragen. Grep auf `senior_checkins` + `/senior/` für die vollständige Verweisliste.
2. **Legacy stilllegen:** `app/senior/*` auf die `(senior)`-Pendants redirecten (`/senior/home` → `/kreis-start`, `/senior/checkin` → `/checkin`, Rest analog). Den Legacy-Check-in-Insert in `senior_checkins` ersatzlos entfernen.
3. **Rückwege korrigieren:** `SeniorStatusScreen`-Redirect von `/senior/home` auf `/kreis-start` (modules/care/components/senior/SeniorStatusScreen.tsx:23). Dabei B3:2 miterledigen: Auto-Redirect im SOS-Fall durch großen „Zurück zur Startseite"-Button ersetzen (Timing Adjustable, WCAG 2.2.1).
4. **„Hier bei mir" in die Senior-Shell:** Route `app/(senior)/hier-bei-mir` (oder Layout-Wrapper), die die Info-Hub-Inhalte mit 20px-Basis, 80px-Targets und 112-Leiste rendert. Die Datenhooks aus `app/(app)/hier-bei-mir` wiederverwenden (Adapter, kein Neubau).
5. **SOS-Entwarnung (A3:4, Teilumfang):** „Mir geht es wieder gut"-Button auf der SOS-Statusseite — die Cancel-API existiert bereits, nur das Senior-UI ruft sie nicht.

**Tests:** Redirect-Tests für alle Legacy-Routen; Vitest-Guard, dass kein Code mehr in `senior_checkins` schreibt (Grep-basiert); RTL-Test für den SOS-Status-Button.
**Mini-Audit:** nicht nötig (keine Auth-/RLS-Surface), Pre-Check reicht.
**Definition of Done:** Vom Geräte-Start bis zu jeder Kern-Aktion und zurück verlässt der Senior nie die Senior-Shell; `app/senior/*` rendert nichts mehr selbst.

---

## Welle S2 — Senior-Hälfte des Familienkreises (Aufwand M–L)

**Problem:** Das Phase-1-Versprechen ist einseitig: Die Familie sieht den Senior (Check-in-Kette ist vorbildlich), aber der Senior sieht niemanden — kaputter Kern-Link (C2:1), leere „Mein Kreis"-Ansicht (C2:2), Chat ohne Benachrichtigung (C2:3), kein Senior-startbarer Videoanruf (C2:4), Schreiben nur über die KI-Sackgasse (A1:2/A3:3), Family-Setup mit Kurzcode-Sackgasse (A2:1) und fehlender Pairing-Gegenseite (A2:3).

**Schritte:**

1. **Quick-Win Benachrichtigung (zuerst — größter Hebel):** `sendMessage` in `modules/chat/services/messages.service.ts` erzeugt serverseitig Notification + Push (`safeInsertNotification` + `sendPush` aus lib/notifications-server bzw. lib/care/channels/push existieren). **Datensparsam:** Payload nur „Neue Nachricht von <Vorname>", KEIN Nachrichteninhalt — die Alt-UI schickt heute 80 Zeichen Klartext mit (C2:3-DSGVO-Hinweis), das beim Umbau gleich entfernen.
2. **Kaputten Kern-Link fixen:** Dashboard „Verbundene Angehörige" löst zuerst die Konversation auf (`findOrCreateConversation` in modules/care/services/caregiver/caregiver-misc.service.ts generalisieren) und routet auf `/chat/{conversationId}` (C2:1).
3. **Chat vereinheitlichen:** `/chat/[id]` (medienfähig) wird kanonisch; `/messages/[id]` wird Redirect-Shim; Angehörigen-„Nachricht"-Button umrouten (C2:3).
4. **Mein-Kreis-Reverse-View:** Wenn der Nutzer `resident` in `caregiver_links` ist, zeigt `/mein-kreis` die verbundenen Angehörigen als große Kacheln (Name, Foto) mit zwei Aktionen: „Nachricht" → Schritt 2-Logik, „Anrufen" → `/call/{caregiverId}` (C2:2). Quick-Action-Logik von der Angehörigen-Detailseite spiegeln.
5. **Video für den Senior:** `GlobalCallListener` zusätzlich ins `(senior)`-Layout (heute klingelt es dort nicht einmal) + Anruf-Button in der Reverse-View (C2:4).
6. **Tipp-Fallback Schreiben:** „Lieber tippen"-Button (≥56px) in `MicView` direkt in den Editing-Zustand der `ReviewView` (Textarea existiert, ist nur unerreichbar); 503/aiDisabled ehrlich formulieren („…noch nicht freigeschaltet. Sie können die Nachricht tippen."); kreis-start-Kachel ohne KI-Versprechen, solange das Flag aus ist (A1:2, A3:3, A1:6).
7. **Family-Setup-Lücken schließen:** (a) „Link teilen"-Button (navigator.share / Copy `setupUrl`) in `SetupQrCard` (A2:1, S); (b) „Gerät verbinden"-Abschnitt auf `/care/meine-senioren/[seniorId]`, der `start-code` aufruft und den 6-stelligen Code groß anzeigt — der Senior-Numpad („Ich habe einen Code") existiert schon (A2:3).

**Tests:** TDD je Schritt (RED zuerst); mindestens: sendMessage-Push-Test (inkl. „kein Inhalt im Payload"), Conversation-Auflösung, Reverse-View-Query (resident-Richtung), MicView-Fallback-Test, start-code-UI-Test.
**Mini-Audit: JA, Pflicht** (Trigger: Push-Inhalte, Pairing-/Code-Pfad): Rate-Limit auf `start-code`-Erzeugung prüfen (Edge-konsistent?), Audit-Trail für Pairing-Claims, Push-Payload-Datensparsamkeit, caregiver_links-Scoping der Reverse-View.
**Definition of Done:** Ein Senior kann ohne fremde Hilfe (a) eine getippte ODER diktierte Nachricht in-app senden, (b) sehen wer zu seinem Kreis gehört, (c) einen Angehörigen anrufen und angerufen werden, (d) nach Geräteverlust mit Hilfe des Angehörigen wieder pairen — und der Angehörige erfährt von jeder Nachricht per Push.

---

## Welle S3 (optional, nach S2) — Erster gemeinsamer Moment (Aufwand S–M)

Die zwei besten Feature-Ideen aus der Analyse (C2), bewusst klein:

1. **„Erster gemeinsamer Moment":** Nach erfolgreichem Pairing wird der Angehörige aufgefordert, ein Foto/eine Sprachnachricht zu senden, die groß auf dem Senior-Home erscheint (Wiederverwendung chat-media; Daten bleiben Supabase EU).
2. **Foto auf Senior-Home:** Neuestes Familienfoto groß, mit Ein-Tap-Sprachantwort (media-upload.service + AudioRecorder existieren).

**DSGVO:** nur Kreis-interne Daten, keine neuen Provider. **Wording:** kein „Bericht"/„Monitoring" — es ist ein geteilter Moment, keine Statusmeldung.

---

## Abgrenzung / bewusst NICHT in diesen Wellen

- **KI-Gateway-Konsolidierung** (Top-5-strategisch #1) und **EU-Provider-Umstieg/AVV** (#2) laufen als eigene Welle vor dem KI-Go (§5 AVV) — Grundlage: Architektur-Teil des Analyse-Berichts, Stufe 0/1.
- **Pricing-/B2B-Claims trimmen + tote Marketing-Landing** (#5): kleine separate Doku-/Text-Welle, kein Code-Risiko.
- **Termine als Familienkalender** (C2:5): erst nach S2 bewerten — eventuell reicht die Reverse-View + Chat für den Pilot.

## Reihenfolge-Empfehlung

S1 → S2 (S1 zuerst: S2 baut Senior-UI-Flächen, die in der konsolidierten Shell landen sollen, nicht im Legacy-Pfad). S3 nur, wenn vor dem Pilotstart noch Luft ist — sonst erster Post-Pilot-Schritt.
