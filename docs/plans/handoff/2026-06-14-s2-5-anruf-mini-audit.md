# Mini-Audit — S2-5 Anruf für den Senior (Video-Calls)

> **Pflicht-Audit** (`.claude/rules/security-mini-audit.md`), gefahren 2026-06-14 vor dem Bau.
> **Read-only.** Trigger: neuer Call-Pfad für den Senior (caregiver_links-Scope).

## Scope
S2 Schritt 5 (Befund C2:4) baut zwei UI-Brücken zu **bestehender** Video-Call-Infra:
- (1) **`GlobalCallListener` zusätzlich ins `(senior)`-Layout** — heute hängt der Listener nur im
  `(app)`-Layout, das Senior-Gerät klingelt also nicht. Es ist **dieselbe Komponente**, kein neuer Code-Pfad.
- (2) **„Anrufen"-Button in `MyCaregiversList`** (Senior → Angehöriger) → navigiert auf die bestehende
  Route `/call/[userId]`. Die `userId` stammt aus `useMyCaregivers` (= `caregiver_links`-gescopt).

→ **Keine neue Route, keine neue Migration, keine neue API.** Audit-Fokus = `video_calls`-RLS.

## 5-Punkte-Checklist

1. **RLS auf `video_calls`** (Mig 075 + 076-Hardening): ✅
   - SELECT `video_calls_select_own`: `auth.uid() = caller_id OR auth.uid() = callee_id` → der
     `GlobalCallListener`-Realtime-Filter `callee_id=eq.<uid>` ist belt-and-suspenders; RLS erzwingt,
     dass ein Nutzer **nur eigene** Anrufe sieht. **Kein IDOR durch das breitere Mounten.**
   - INSERT `video_calls_insert_caller(_v2)`: `WITH CHECK (auth.uid() = caller_id …)` → ein Senior
     kann nur einen Anruf erzeugen, bei dem **er selbst** der Caller ist. Kein Spoofing fremder Caller.
   - UPDATE `video_calls_update_participants`: nur Teilnehmer (Accept/Reject durch callee ok).
2. **Trigger-Inventar:** Keine privilege-relevanten Trigger im Call-Pfad. `video_calls` hält nur
   Call-Status (ringing/active/rejected/missed), keine Rollen-/Trust-Spalten.
3. **Privilege-Spalten-Sweep:** Keine. Der Anruf setzt nur `status/started_at`. Die `userId` im
   Button kommt aus der `caregiver_links`-gescopten Liste, nicht aus freiem Client-Input.
4. **Audit-Trail:** Calls sind selbst der Nachweis (`video_calls`-Row mit caller/callee/status/Zeit).
   Kein dedizierter Security-Audit nötig (kein Auth-/Rollen-/Consent-Event).
5. **Rate-Limit:** Kein Code-/Token-Lookup → kein Brute-Force-Vektor. Anruf-Spam ist durch
   RLS (caller=self) + die `caregiver_links`-gescopte Sichtbarkeit praktisch begrenzt.

## Pflicht-Ausgabe

```text
Mini-Audit S2-5 (2026-06-14):
- RLS/Trigger geprueft: video_calls (select_own caller|callee, insert_caller WITH CHECK auth.uid()=caller_id, update_participants)
- Findings: 0 CRITICAL/HIGH/LOW — keine neue Auth-/RLS-Flaeche; bestehende RLS deckt das breitere Mounten + den Senior-Start ab
- Audit-Trail: implizit (video_calls-Row) | Rate-Limit: n/a (kein Code-/Token-Lookup)
```

## Verdict
**GRÜN — kein STOP.** S2-5 ist eine UI-Brücke zu bestehender, korrekt gegateter Call-Infra. Die
`/call/[userId]`-Route ist unverändert (validiert die Beziehung selbst nicht vor, identisch zur schon
live-genutzten Angehörigen→Senior-Richtung); Missbrauch ist durch `video_calls`-RLS (caller=self,
participant-only SELECT) + die `caregiver_links`-gescopte Personenliste unrealistisch. **Freigegeben.**
