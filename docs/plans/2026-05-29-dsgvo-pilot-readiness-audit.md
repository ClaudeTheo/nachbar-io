# DSGVO / Pilot-Readiness-Audit nachbar-io — 2026-05-29

**Methodik:** Multi-Agent-Audit, 5 Compliance-Dimensionen (TOMs-Abgleich, Betroffenenrechte, Consent, Datenflüsse/Drittländer, Datenminimierung/Art.9). Jeder Befund gegen Code **und** TOMs/Datenschutzerklärung abgeglichen + adversarial verifiziert (read-only). 32 Agents, ~2,4 Mio Tokens.
**Ergebnis:** 27 gemeldet → **24 verifiziert** (7 BLOCKER, 11 WICHTIG, 6 EMPFEHLUNG), 3 FP.

> **Was solide ist (verifiziert, kein Drift):** Field-Encryption AES-256-GCM, Service-Role server-only, Medical-Blocklist, Voice-Guardrail „keine Diagnosen", Caregiver-Sicht ohne Notizen, AI-Off-Switch ohne Silent-Fallback, IP-Pseudonymisierung (SHA-256 + täglich rotierendes Salt) auf allen aktiven Schreibpfaden. Die Substanz der technischen Schutzmaßnahmen stimmt — die Findings betreffen **(A) Doku-vs-Code-Drift** und **(B) substanziell kaputte Betroffenenrechte**.

---

## 🔴 BLOCKER (7) — Pilot darf mit echten Nutzern so NICHT starten

### Cluster A — Transparenz/AVV-Drift (1)

**B1 — Datenschutzerklärung behauptet geltende AVVs/DPAs, die nicht abgeschlossen sind**
`app/datenschutz/page.tsx:462-584` vs. TOMs §6 + AVV-Tracker (Versand ausstehend) · *Art. 28, Art. 13, Art. 5 Abs. 1 lit. a*
Die Live-Datenschutzerklärung sagt im Präsens zu: Supabase „Es gilt ein AVV", Vercel „Es gilt ein DPA mit SCCs", Sentry/Twilio/Metered analog. TOMs + AVV-Register zeigen: **alle noch offen** (Versand erst nach HR möglich, jetzt aktionabel, aber nicht passiert). Sobald eine echte Familie sich einloggt, ist das eine **falsche Pflichtangabe** nach Art. 13. Die interne „Rote Linie" sagt selbst: keine echten Nutzer bis AVVs geklärt.
**Fix:** Entweder AVVs **tatsächlich gegenzeichnen** (min. Supabase, Vercel, Sentry, Twilio, Stripe, Metered) bevor „es gilt" behauptet wird — ODER DSE auf „wird vor Verarbeitung abgeschlossen" umformulieren. TOMs §6 als Single Source, DSE daraus ableiten.

### Cluster B — Betroffenenrechte + Retention substanziell kaputt (6)

> **Kernproblem:** Die Lösch-, Export- und Retention-Logik referenziert teils **nicht existierende Tabellen** (`profiles`, `checkins`) und **lässt die Care-/Art.-9-Daten komplett aus**. Effekt: Löschung/Auskunft **täuschen Erfolg vor, tun aber faktisch nichts oder nur die Hälfte** — bei echten Daten ein direkter Art.-15/17-Verstoß.

**B2 — Web-/Google-Play-Löschung schreibt in nicht existierende Tabelle `profiles` → tut faktisch nichts, meldet aber „Löschung beantragt"**
`lib/services/user-account.service.ts:93-99` + `app/account-loeschen/page.tsx:202-206` · *Art. 17; Google-Play-Deletion-Policy*

**B3 — Art.-17-Löschung schlägt für Care-/Senior-Nutzer fehl (FK NO ACTION blockiert users-Delete) ODER hinterlässt verwaiste Art.-9-Daten**
`lib/services/user-account.service.ts:122-198` (cascadeDeletes Z.138-146) vs. FK-`delete_rule` in Prod · *Art. 17, Art. 9*

**B4 — Care-Tabellen ohne CASCADE + nicht in Löschkaskade → jeder Senior mit Care-Daten unlöschbar**
`user-account.service.ts:138-198` vs. `migrations/021,023,024,026,028,029_care_*.sql` · *Art. 17, Art. 5 Abs. 1 lit. e*

**B5 — Art.-15/20-Export liest großteils nicht existierende Tabellen, lässt die sensibelsten Daten (Care/Memory) aus → Auskunft substanziell unvollständig**
`user-account.service.ts:208-359` + `lib/services/privacy-export.service.ts:37-181` (beide lesen `checkins`, keine `care_*`) · *Art. 15, Art. 20*

**B6 — Datenschutzerklärung §11 verspricht Löschung von Daten, die der Code nicht löscht**
`app/datenschutz/page.tsx:721-755` vs. `user-account.service.ts:138-146` · *Art. 17, Art. 5 Abs. 1 lit. a*

**B7 — Keine Retention/Löschfrist für Art.-9-Care-Daten; Retention-Cron läuft teils ins Leere (`checkins` statt `care_checkins`)**
`lib/services/cron-retention-cleanup.service.ts:18-49` · *Art. 5 Abs. 1 lit. e, Art. 9*

**Gemeinsamer Fix Cluster B:** Einen **einzigen** Lösch- und einen **einzigen** Export-Service als Single Source of Truth definieren, Tabellennamen gegen die reale DB korrigieren, **alle** personenbezogenen + `care_*`/`memory_*`-Tabellen aufnehmen (Export: verschlüsselte Felder für den Betroffenen entschlüsseln; Löschung: in FK-korrekter Reihenfolge). Die Referenztabellen-Liste aus `lib/admin/pilot-reset-users-cleanup.ts` existiert bereits und kann als Quelle dienen. Danach DSE §11 + Retention-Cron daran ausrichten. Test: Doku-Löschliste == Code-Löschliste.

---

## 🟠 WICHTIG (11) — vor Ausweitung / KI-/Voice-Aktivierung

| # | Thema | Ref | Norm |
|---|---|---|---|
| W1 | TOMs §1.4 beschreibt IP-Pseudonymisierung falsch („Oktette gehasht" — real: volle IP + Tagessalt gehasht) | TOMs §1.4 vs. `lib/security/client-key.ts:19-22` | Art. 32, Art. 5 Abs. 2 |
| W2 | „IP max 7 Tage" öffentlich zugesagt, aber `ip_hash`-Tabellen ohne Löschroutine | `datenschutz:646` vs. `migrations/144:48` | Art. 5 Abs. 1 lit. e |
| W3 | TOMs §7 „Encryption auf ALLEN Care-Feldern" überdeckt freie `jsonb metadata` mit Art.-9-Klartext | TOMs §7 vs. `028:16`, `144:16` | Art. 9, Art. 32 |
| W4 | **Art.-9-Klartext im Audit-Log** (SOS-Note, Medikamentenname) trotz verschlüsselter Quellspalte | `sos.service.ts:461`, `medications.service.ts:163` | Art. 9, Art. 32, Art. 5 lit. c |
| W5 | **`/api/alerts`** liefert volle Adresse + exakte GPS an alle — obwohl `getLocationForRole()` (rollenbasierte Präzision) schon existiert, aber ungenutzt | `app/api/alerts/route.ts:25` vs. `modules/alerts/services/location-visibility.ts` | Art. 5 lit. c, Art. 25 |
| W6 | **Sentry** ist aktiver Auftragsverarbeiter, fehlt komplett im AVV-Register + TOMs + VVT | `instrumentation-client.ts`, `sentry.*.config.ts` | Art. 28, Art. 30 |
| W7 | **AVV-Mismatch Voice:** Register nennt IONOS-Voxtral (STT) + Azure (TTS), Code nutzt ausschließlich **OpenAI/USA** (whisper-1, gpt-4o-mini-tts) | `modules/voice/services/transcribe.service.ts:35`, `tts.service.ts:160` | Art. 28, Art. 44 |
| W8 | Sentry `beforeSend` scrubbt **keine** Adressdaten; Edge-Config scrubbt Messages/Exceptions gar nicht | `sentry.*.config.ts` | Art. 25, Art. 32 |
| W9 | Auskunfts-/Export-Cluster (= B5, hier als Wichtig-Dublette zu Care-Daten + `checkins`) | `user-account.service.ts:208-359` | Art. 15, Art. 20 |
| W10 | Synthetische Testnutzer (1181) — Cleanup nur Dry-Run, Referenzzählung trifft falsche Care-Spalten (`user_id` statt `senior_id`) → unterzählt Art.-9-Referenzen | `lib/admin/ai-test-users-cleanup-dry-run.ts:108-129` | Art. 5 lit. c/e |
| W11 | Registrierung schreibt keine `legal_acceptance` (AGB-/DSE-Version + Zeitstempel) | `app/(auth)/register/page.tsx` | Art. 6, Art. 7 Abs. 1 (Nachweisbarkeit) |

---

## 🟡 EMPFEHLUNG (6)
- E1 Dormante Roh-IP-Spalten (`ip_address inet`) in `admin_audit_log` + `admin_access_logs` → auf `ip_hash` umstellen/entfernen.
- E2 Verarbeiter-Liste DSE vs. TOMs nicht abgeglichen (Anthropic direkt vs. Bedrock EU-Geo „geplant").
- E3/E6 Zwei nicht-synchrone KI-Kill-Switches (`AI_PROVIDER` env vs. `AI_PROVIDER_OFF` Flag) — Fehlbedienungsrisiko, in einem zentralen Guard koppeln.
- E4 Betroffenenrechte-Erreichbarkeit im Senior-/Betreuten-UI prüfen (Art. 12).
- E5 `open-meteo`, `MapTiler`, `CartoCDN`, `OSM-Tiles` erhalten standortnahe Daten, fehlen im Register (CSP `lib/security/csp.ts:49-51`).

---

## Empfehlung (priorisiert, Pre-Pilot)

**Vor jedem echten Nutzer (Pflicht):**
1. **Cluster B** (B2–B7): Lösch-/Export-/Retention-Logik reparieren — Single-Source-Service, reale Tabellennamen, Care-/Art.-9-Daten einschließen. **Größter Block, echte Code-Arbeit + Migration.**
2. **B1** + **W6/W7**: AVVs gegenzeichnen ODER DSE präzisieren; Sentry + tatsächlich genutzte Voice-/KI-Provider (OpenAI!) ins Register; AVV passend zum **realen** Code unterschreiben (nicht IONOS/Azure auf Papier, OpenAI im Code).
3. **W4 + W5**: Art.-9-Klartext aus Audit-Log raus; `/api/alerts` auf `getLocationForRole()` umstellen. (Überlappt mit Security H3 — gemeinsam fixen.)

**Vor Ausweitung:** W1–W3, W8, W10, W11.
**Laufend:** E1–E6.

> Alle DB-Änderungen: File-first + Mini-Audit + Test vor Prod-Apply. **Prod-Apply + AVV-Versand = Founder-Go (rote Zone).** AVV-Versand ist ohnehin Founder-Hand (Tracker steht bereit).
