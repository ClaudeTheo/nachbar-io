# Twilio Auth-Token Rotation Runbook

**Status:** Redaktierte Vorlage, nicht ausfuehrbar.  
**Zweck:** Ablaufwissen fuer eine spaetere Twilio-Auth-Token-Rotation bewahren, ohne Account-IDs, Token oder produktive Kommandos als Script im Repo zu halten.

## Rote Linien

- Nur mit ausdruecklichem Founder-Go ausfuehren.
- Nicht vor HR/AVV-Freigabe fuer produktive Provider-Arbeiten ausfuehren.
- Keine Token in Chat, Logs, Shell-History, Commits oder Screenshots kopieren.
- Keine Vercel-Deploys, Provider-Aktionen oder Produktiv-Aenderungen aus diesem Dokument heraus automatisieren.

## Vorbereitung

1. In Twilio pruefen, welcher Account und welche Region fuer Nachbar.io aktiv sind.
2. In Vercel pruefen, in welchem Projekt und Environment `TWILIO_AUTH_TOKEN` gesetzt ist.
3. Vorab klaeren, ob SMS/Telefonie aktuell produktiv genutzt wird und ob ein Wartungsfenster noetig ist.
4. Lokalen Smoke-Test-Pfad festlegen, ohne echte Nachrichten an Dritte zu senden.

## Manueller Ablauf

1. Im Twilio-Dashboard einen neuen Secondary Auth Token erzeugen.
2. Den neuen Token nur in eine lokale, nicht geloggte Eingabe uebernehmen.
3. In Vercel den alten `TWILIO_AUTH_TOKEN` fuer das relevante Environment ersetzen.
4. Erst nach erfolgreichem Vercel-Update den betroffenen Deployment-Pfad nach Founder-Go neu deployen.
5. Smoke-Test gegen die App ausfuehren und pruefen, dass Twilio-konfigurierte Pfade weiterhin kontrolliert reagieren.
6. Wenn der neue Token sicher aktiv ist, den neuen Token in Twilio zum Primary Token promoten oder den alten Token gemaess Twilio-Dashboard-Prozess deaktivieren.
7. Danach erneut Smoke-Test ausfuehren.
8. Ergebnis im passenden Handover- oder Security-Cleanup-Dokument festhalten.

## Sicherheitsnotizen

- `read -s` oder ein vergleichbarer verdeckter Eingabepfad ist Pflicht, falls ein lokales Helferkommando benutzt wird.
- Shell-Kommandos duerfen Token nur via stdin oder lokale Variable verarbeiten und muessen die Variable danach entfernen.
- CLI-Ausgaben duerfen keine Token, Account-IDs oder vollstaendige Deployment-URLs protokollieren.
- Ein ausfuehrbares One-Shot-Script gehoert nicht dauerhaft ins Repo; bei Bedarf fuer eine konkrete Rotation frisch und redaktiert erstellen, danach wieder entfernen.

## Verifikation

- Vercel zeigt `TWILIO_AUTH_TOKEN` im erwarteten Environment als gesetzt.
- App-Smoke-Test laeuft ohne echte Nachricht an Dritte.
- Twilio-Dashboard zeigt den alten Token nicht mehr als nutzbaren Primary Token.
- Kein Token oder Account-Identifier taucht in `git diff`, Logs oder Handover-Antworten auf.
