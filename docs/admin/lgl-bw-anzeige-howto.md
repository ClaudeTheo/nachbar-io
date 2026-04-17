# LGL-BW Anzeige-Formular — Anleitung fuer Founder

## Hintergrund

Laut GeoNutzV-BW muss die Nutzung von LGL-BW-Geodaten (Hausumringe)
bei kommerzieller Nutzung beim Landesamt angezeigt werden. Solange
QuartierApp kein Nachbar-Plus-Abo (8,90 EUR) verkauft, ist die Nutzung
nicht-kommerziell. Trotzdem sollte die Anzeige vor dem ersten Abo
eingereicht werden.

## Schritte

1. Gehe zu https://www.lgl-bw.de
2. Navigiere: Geodatenzentrum -> Nutzungshinweise -> GeoNutzV-BW
3. Suche nach dem Anzeige-Formular (PDF oder Online-Formular)
4. Ausfuellen:
   - Nutzer: Thomas Theobald / QuartierApp
   - Datensatz: ALKIS Hausumringe (WMS)
   - Nutzungszweck: Anzeige von Gebaeudegrundrissen in einer
     Quartiersmanagement-Web-App
   - Kommerziell: Ja (geplant, ab Nachbar-Plus-Abo)
5. Formular einreichen (E-Mail oder Online)
6. Bestaetigungs-Mail aufheben

## Nach Einreichung

Feature-Flag `LGL_BW_BUILDING_OUTLINES_ENABLED` kann in der Admin-UI
auf `enabled=true` gestellt werden.

## Frist

Vor dem ersten kostenpflichtigen Nachbar-Plus-Abo.
Bis dahin: Flag bleibt `false`.
