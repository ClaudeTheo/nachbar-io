# Nachbar.io — Setup-Anleitung

## 1. Supabase-Projekt erstellen (5 Minuten)

1. Gehe zu **https://supabase.com** und melde dich an (kostenlos)
2. Klicke **New Project**
3. Einstellungen:
   - **Name:** `nachbar-io`
   - **Region:** `Central EU (Frankfurt)`
   - **Password:** (merken!)
4. Warte bis das Projekt erstellt ist (~2 Min)
5. Gehe zu **Settings > API** und kopiere:
   - `Project URL` → das ist deine `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` Key → das ist dein `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2. Datenbank-Schema anlegen

1. Gehe im Supabase-Dashboard zu **SQL Editor**
2. Klicke **New Query**
3. Öffne die Datei `supabase/migrations/001_initial_schema.sql` und kopiere den gesamten Inhalt
4. Füge ihn ein und klicke **Run**
5. Dann öffne `supabase/seed.sql`, kopiere und führe es ebenfalls aus

## 3. .env.local aktualisieren

Ersetze die Platzhalter in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://DEIN-PROJEKT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...DEIN_KEY
```

Die VAPID-Keys sind bereits generiert und müssen nicht geändert werden.

## 4. GitHub Repository (optional)

```bash
# GitHub CLI installieren: https://cli.github.com
gh auth login
gh repo create nachbar-io --private --source=. --push
```

Oder manuell auf github.com ein neues Repo erstellen und dann:
```bash
git remote add origin https://github.com/DEIN-USER/nachbar-io.git
git push -u origin master
```

## 5. Vercel Deployment

1. Gehe zu **https://vercel.com** und verbinde dein GitHub-Konto
2. Importiere das `nachbar-io` Repository
3. Setze die **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
4. Klicke **Deploy**

Die App ist dann unter `nachbar-io.vercel.app` erreichbar.

## 6. PWA auf dem Handy installieren

1. Öffne die Vercel-URL auf deinem Handy (Safari/Chrome)
2. **iOS:** Teilen-Button → "Zum Home-Bildschirm"
3. **Android:** Drei-Punkte-Menü → "App installieren"
