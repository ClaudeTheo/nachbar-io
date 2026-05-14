# Jugend-Einladung durch Kinder: Guardian-Freigabe

Stand: 2026-05-14

## Regel

Kinder und Jugendliche duerfen keine fremden Kinder eigenstaendig in die App holen.
Sie duerfen Freunde vorschlagen. Die Freigabe erfolgt durch ein verantwortliches
Elternteil des einladenden Kindes.

## Produktlogik

- Normale Registrierung bleibt fuer U18 gesperrt.
- Ein Elternteil kann fuer eigene Kinder direkt Kinderaccounts anlegen.
- Maximal 5 Kinderaccounts pro Elternteil sind direkt moeglich.
- Weitere Kinder muessen als Antrag an das Admin-Team gehen.
- Ein Kind kann einen Freund/eine Freundin vorschlagen.
- Das Elternteil des einladenden Kindes muss bestaetigen, dass ein echtes
  Vertrauensverhaeltnis besteht.
- Die eingeladene Person bekommt nur den altersgerechten Jugend-Zugang.
- Kinderaccounts werden immer mit `users.ui_mode = 'youth'` angelegt.
- Nach Login fuehrt `/after-login` dadurch direkt nach `/jugend`.
- Die Jugend-App nutzt eine eigene moderne Oberflaeche, nicht die Erwachsenen-
  Startseite.
- U13 duerfen keine Aufgaben annehmen.
- U18 duerfen nur kostenlose, niedrig-riskante, altersgerechte Funktionen nutzen
  und benoetigen Freigabe fuer erweiterte Funktionen.

## Empfohlene Freigabe-Formulierung

> Ich bestaetige, dass mein Kind diese Einladung nur an ein Kind weitergibt,
> das wir persoenlich kennen und bei dem ein echtes Vertrauensverhaeltnis
> besteht. Mir ist bewusst, dass QuartierApp kein oeffentliches soziales Netzwerk
> ist. Einladungen sollen nur an Freunde, Nachbarskinder oder vertraute Familien
> im Quartier gehen. Ich gebe diese Einladung verantwortungsvoll frei.

## Hinweistext fuer Eltern

Diese Einladung ist vertraulich. Bitte geben Sie sie nur frei, wenn Sie das
Kind bzw. die Familie kennen und die Einladung in ein echtes
Vertrauensverhaeltnis passt. Der Code darf nicht oeffentlich geteilt,
weitergeleitet oder in Gruppen gepostet werden.

## Offene Umsetzung

- Eigener Elternbereich fuer Kinderaccounts.
- Zaehler: `guardian_user_id` darf bis 5 aktive Kinder direkt anlegen.
- Ab dem 6. Kind: Antrag statt direkter Erstellung.
- Kinder-Freundeinladung: Kind erstellt Vorschlag, Elternteil bestaetigt,
  dann wird ein einmaliger Code erzeugt.
- Eltern-Code-Login: eingeloggtes Kind bekommt direkt den `youth`-Modus und
  sieht die moderne Jugend-App (`/jugend`) mit altersgerechter Navigation.
- Admin-Uebersicht fuer Antraege und auffaellige Einladungen.
