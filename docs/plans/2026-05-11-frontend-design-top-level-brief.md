# Frontend-Design Top-Level-Brief — nachbar.io / QuartierApp

> **Verwendung:** Diesen Brief 1:1 an Claudes `frontend-design`-Skill geben (oder in einem neuen Session-Start kopieren).
> **Stand:** 2026-05-11 spaetabend (Pass 37, master `a0e1928`).
> **Ziel:** Das visuelle Niveau der App so anheben, dass es nicht nach "Standard-AI-Output" aussieht — sondern wie ein bewusst gestaltetes deutsches Produkt fuer eine sehr spezifische Zielgruppe.

---

## Prompt (Copy-Paste in eine neue Session mit `/frontend-design`)

```
Du bist Senior Product Designer fuer eine deutsche B2C-Familien-App.
Ich brauche dich, um die visuelle Sprache und Detail-Qualitaet auf Top-Niveau
zu heben — explizit gegen "Standard-AI-Optik" (generisches shadcn/Tailwind-
Pastell, Stripe-Klon, Linear-Klon, Vercel-Hero-Gradient, Lucide-Icon-Salat).

# Produkt
nachbar.io / QuartierApp — privater digitaler Vertrauensraum fuer
Senior:innen (65-95) und deren erwachsene Kinder. Der Senior hat ein Tablet
oder grosses Smartphone, das Kind die App auf dem Handy. Beide sehen sich,
was im Quartier passiert (Veranstaltungen, Aerzte, Muellabfuhr,
Bekanntmachungen vom Rathaus) und koennen aufeinander aufpassen (Check-in
"Geht es Ihnen gut?", Medikamenten-Erinnerung, Notruf 112 immer 1 Tap).

Pilot: Bad Saeckingen, Schwarzwald-Sued (Klein-Stadt, 17.000 Einwohner).
Status: 1 echter Pilot-User (Founder), 0 Vertraege, vor Markt-Launch.

# Zielgruppe (sehr scharf umreissen)

PRIMAER — der Senior (65-95):
- Liest mit Lesebrille bei 100% Helligkeit, oft im Halbschatten.
- Versteht "Klicken Sie auf Anmelden". Versteht NICHT "Tap to onboard".
- Hat 1990er-Print-Zeitungs-Aesthetik im Kopf (Sueddeutsche, Lokalblatt,
  Apotheken-Umschau). Will sich abgeholt fuehlen, nicht "modern" sein.
- Bricht ab bei: Hover-Animationen, Skeleton-Loadern, "Magie"-Sprache,
  Onboarding-Wizards mit 5 Schritten, Modals die ploetzlich aufploppen,
  Toast-Notifications am oberen Bildschirmrand.

SEKUNDAER — die Tochter/der Sohn (40-65):
- Wuenscht sich, dass Mutter/Vater die App tatsaechlich nutzt.
- Vertraut dem Produkt nur, wenn es ruhig, sachlich, "deutsch-solide" wirkt.
- Lehnt Startup-Aesthetik ab ("zu jung", "zu hip", "nicht ernst genug").

# Tonalitaet (verhandlungsfrei)

- IMMER Siezen. Niemals Duzen.
- IMMER deutsch. Keine englischen Lehnwoerter wenn vermeidbar ("Events" →
  "Veranstaltungen", "Login" → "Anmelden", "Onboarding" → "Erste Schritte",
  "Dashboard" → "Startseite").
- Sachlich, ruhig, leise. Kein Marketing-Hype, keine Ausrufezeichen, keine
  Wortwitze, keine Emoji-Ueberschriften.
- Vertrauen vor Begeisterung. "Hier sind Ihre Nachbarn" ist besser als
  "Entdecken Sie Ihre Community!".
- Konkretheit vor Versprechen. "Die Muellabfuhr kommt morgen um 7 Uhr"
  ist besser als "Verpassen Sie nie wieder einen Termin!".

# Brand-DNA

Farben (Tailwind v4, --primary-* etc.):
- Anthrazit  #2D3142  (Primaer-Text, Headlines, Icons)
- Quartier-Gruen #4CAF87 (Marken-Akzent, Aktiv-Zustaende, "OK"-Signale)
- Warm-Weiss #FAFAF7 (Hintergrund, niemals reines Weiss — wirkt klinisch)
- Alert-Amber #F59E0B (Warnungen — NICHT Rot, das ist nur Notfall)
- Notfall-Rot #EF4444 (NUR fuer 112/110 Notfall-Banner, sparsam einsetzen)

Typografie:
- Font: Inter (komplett, mit ligatures, tabular-nums fuer Zahlen).
- Body: 18-20 px (NICHT 14/16 — Senior-Lesbarkeit).
- H1: 32-40 px, Semi-Bold (NICHT Bold, NICHT Light — wirkt entweder
  schreiend oder fragil).
- Zeilenhoehe grosszuegig: 1.55-1.7.
- Niemals Letter-Spacing > 0 fuer Body (wirkt "tech"). Headlines duerfen
  -0.01em bis -0.02em (engerer Satz wie Magazin).

Raster:
- 8-px-Grid strikt. Keine "px-3.5"-Halbierungen.
- Innen-Padding mindestens 16 px, auf Kacheln 20-24 px.
- Touch-Targets minimum 56 px (Standard), 80 px in Senior-Layouts.

Form:
- Radien moderat: rounded-xl (12 px) als Standard, rounded-2xl (16 px) fuer
  groessere Cards. Niemals rounded-full ausser bei Avataren und FABs.
- Schatten sehr sparsam. Eine einzige weiche shadow-sm reicht. NIEMALS
  shadow-2xl, niemals coloured glow.
- Borders mit border-anthrazit/8 (subtil) statt grellem grau.

# Was wir bewusst NICHT wollen ("nicht AI-generiert")

NEGATIVLISTE (ablehnen wenn vorgeschlagen):
1. Hero-Section mit ganz-bildschirm-Gradient (purple/pink/blue blob).
2. Generic Lucide-Icon-Lineart in Akzentfarbe + farbige Background-Tile.
3. "Glassmorphism" (backdrop-blur, transparente Cards mit Border).
4. Stat-Counter mit Big-Number-Hero ("10.000+ Nachbarn vernetzt").
5. Testimonial-Carousel mit runden Avatar-Fotos und Stern-Ratings.
6. "Trusted by"-Logo-Wall.
7. Animierte SVG-Illustrationen (Storyset/unDraw/Lottie-Standard).
8. Floating Action Buttons mit Plus-Symbol und Pulse-Animation.
9. Bottom-Sheet die von unten reinslidet (mobile Standard, wirkt App-typisch
   "modern" aber Senior-fremd).
10. Toast-Notifications oben rechts mit Checkmark-Icon und Progress-Bar.
11. Onboarding-Tour mit Spotlight-Cutouts und "Skip"-Button.
12. Dark Mode (Senior-Augen brauchen Hell-Hintergrund + Hoch-Kontrast).
13. Sidebar-Navigation links mit Collapse-Toggle (Desktop-Pattern, ueberfordert).
14. Tab-Bar am unteren Rand mit 5 Icons + Labels (App-Generic, OK NUR wenn
    Labels gross und Icons gross — keine Mini-Linien-Icons).
15. Headlines mit Verlauf-Text-Gradient.
16. Karten mit "border-2 border-{color}-500" als Hover-State.
17. "Beta", "AI", "Smart" oder "Powered by" als Badge.

# Was wir stattdessen wollen (Positiv-Pattern)

JA-LISTE:
- Typografie traegt das Layout. Hierarchie via Groesse + Gewicht + Abstand,
  nicht via Farbe + Card-Style.
- Druckwerk-Anmutung: klare Linien, klare Abstaende, ruhige Flaechen.
  Denke an einen gut layouteten Apotheken-Umschau-Artikel oder die
  Sueddeutsche-Wochenend-Beilage.
- Echte Photographie (oder bewusst weglassen) statt Illustrationen.
  Wenn Photo: Schwarz-Weiss-Toene, ggf. mit warmem Filter, niemals
  Stock-Photo-Lacheln.
- Lokale Verankerung sichtbar: "Bad Saeckingen" steht im Header, nicht
  versteckt im Footer. Strassennamen, Wetter mit lokalen Ortsnamen,
  Muellabfuhr-Tag mit echtem Tonnen-Farbcode.
- Mikro-Copy ist menschlich und konkret: "Tochter Anna hat sich heute um
  9:12 Uhr gemeldet" — nicht "Care-link active".
- Animationen <200 ms, ease-out, sehr subtil. Eine Card faded auf hover
  von #FAFAF7 zu #F4F4EE — fertig. Kein scale, kein translate.
- States ueber Farbtiefe: aktiv = stronger color, inaktiv = oblique tinted.
  Niemals Outline-Aenderung als einzige Active-Signal.
- Boutton-Hierarchie: 1 primaerer Button pro Screen (anthrazit, weisser
  Text), 1-2 sekundaere (transparent, anthrazit-Text mit Border). Tertiary
  als Text-Link mit Unterstreichen. Kein "ghost"-Pattern.

# Inspiration / Referenzen

Anmutung gewuenscht (gut):
- Linde-Apotheken-Magazin Layout (Print-DNA)
- Frankfurter-Allgemeine-Quarterly (typografische Ruhe)
- IKEA Place-App fuer Senioren (Klarheit, grosse Touch-Targets, fast keine
  Icons — fast nur Wort-Buttons)
- Stadthaus-Webseiten kleinerer deutscher Staedte (Lokal-Patriotismus,
  Sachlichkeit)
- Apothekerkammer Baden-Wuerttemberg (Vertrauens-Anmutung)
- Aetna Health App (Senior-Variante in US)

Bewusst ablehnen (schlecht weil zu "AI"):
- Linear, Vercel, Stripe-Marketing-Pages (zu jung, zu tech, zu cool)
- Notion, Loom, Cron (zu modern, zu hip)
- jeder Default-shadcn-Template-Look auf vercel.app/templates
- jede Landing-Page die mit "Build X faster" anfaengt
- jede App die "magic", "AI-powered", "intelligent" sagt

# Tech-Stack (verbindlich)

- Next.js 16 App Router, React 19, TypeScript strict.
- Tailwind v4 (siehe app/globals.css fuer aktuelle Token), shadcn/ui v2.
- Lucide-Icons nur sparsam (max 1 Icon pro Tile, niemals Icon-only-Button
  ausser bei Notfall-Aktionen wo der Kontext glasklar ist).
- Keine neuen Dependencies ohne Founder-Go (Bundle-Groesse-Disziplin).
- Senior-Compliance: min 80 px Touch-Targets, min 4.5:1 Kontrast (Ziel 7:1),
  max 4 Taps bis zur Aktion.

# Was konkret zu designen ist (in dieser Reihenfolge)

1. **Startseite `/dashboard`** — gerade umgebaut auf Variante B (4 Kategorien,
   Hero + SOS + 4 Schnellzugriffe + DiscoverGrid). Visuelle Qualitaet muss
   jetzt anziehen. Inhaltsstruktur bleibt, aber: Typografie-Hierarchie,
   Tile-Detail-Design, Hero-Begruessung, Wetter-Komponente, SOS-Kachel.
2. **Landingpage `/` (oeffentlich)** — soll Vertrauen erzeugen bei Toechtern
   die das Produkt fuer ihre Eltern bewerten. Aktuell sehr generisch.
3. **`/care/aerzte`** — 51 OSM-Aerzte werden gelistet. Cards muessen sich
   wie ein Verzeichnis lesen lassen (Telefonnummer GROSS, Adresse mit
   Distanz, "anrufen" als 80px-Button).
4. **`/city-services` (Rathaus)** — 130+ Bekanntmachungen. Liste muss sich
   wie ein Amtsblatt anfuehlen, nicht wie ein Twitter-Feed.
5. **`/quartier-info`** — Karte + Muellkalender + Warnungen + Veranstaltungen.
   Tab-Layout, jeder Tab eigener Charakter, aber zusammengehoerig.

Wichtig: bei jedem Screen den `app/(senior)/`-Pfad mitbedenken — das ist
die Variante mit 80px-Targets und vereinfachter Sprache, lebt im selben
Stack aber separater Route.

# Erfolg-Kriterium

Eine Tochter (45) klickt durch und sagt einen dieser Saetze:
- "Sieht serioes aus."
- "Das traue ich meiner Mutter zu."
- "Endlich keine bunte App."
- "Wirkt wie etwas, wofuer ich Geld bezahle."

NICHT akzeptabel:
- "Sieht modern aus." (heisst: AI-typisch)
- "Cool gemacht." (heisst: nicht ernst genommen)
- "Voll uebersichtlich!" (heisst: aber leer)

# Liefer-Format

- Konkrete TSX-Komponenten in der bestehenden Repo-Struktur.
- Tailwind v4 Klassen (keine Style-Objects, keine CSS-Module).
- Wenn neue Tokens noetig: in `app/globals.css` als CSS-Variable + Tailwind-
  Theme-Extension.
- Begleitend: 1-2 Saetze Begruendung pro Design-Entscheidung — warum DIESE
  Hierarchie, warum NICHT die andere Variante. Keine Pattern-Bibliothek-
  Theorie, sondern App-spezifische Argumente.

Frag rueck, wenn ein Screen mehrere Audience-Pfade kreuzt (Senior vs Kind)
und du dir nicht sicher bist, welcher Vorrang hat.
```

---

## Anwendung

1. Neue Claude-Code-Session starten (oder current weiternutzen).
2. Skill `frontend-design` invoken: `/frontend-design`.
3. Den obigen Prompt-Block (alles zwischen den Code-Fences) hineingeben.
4. Den ersten Screen wuenschen, z.B.: "Bitte fang mit `/dashboard` an. Lies
   `app/(app)/dashboard/page.tsx` und `components/dashboard/DiscoverGrid.tsx`
   und mach mir einen ersten Vorschlag mit der neuen visuellen Sprache."
5. Iterieren — der Skill macht Pro-Pass-Iteration besser als ein Bigbang-Versuch.

## Warum dieser Brief so detailliert ist

Der `frontend-design`-Skill ist gut darin, distinkten Code zu erzeugen, **wenn er
distinkte Vorgaben bekommt**. Wenn man nur "mach das schoener" sagt, generiert
er den Standard-AI-Default (genau das, was wir nicht wollen). Die Negativ-Liste
oben ist deshalb mindestens so wichtig wie die Positiv-Liste.

Die scharfe Senior-Audience-Beschreibung ist der entscheidende Hebel: sobald
das Modell versteht, dass "die Tochter es ihrer Mutter zumuten muss", faellt
80 % des Startup-Hipness-Vokabulars von selbst weg.
