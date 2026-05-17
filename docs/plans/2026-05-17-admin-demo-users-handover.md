# Uebergabe - Admin Redirect und Demo-Nutzer - 2026-05-17

Stand: nach Registration-Fix, SOS-Kontrast-Fix, Admin-Redirect-Fix, Push und erfolgreichem Production-Deploy.

## Harte Linien

- Keine weiteren Prod-DB-Writes ohne neues explizites Founder-Go.
- Keine Prod-Migrationen ohne Founder-Go.
- Keine Auth-/Secret-/Billing-Aenderungen ohne Founder-Go.
- Keine neuen laufenden Kosten.
- Demo-Nutzer sind Testdaten in Production, aber ohne echte Pflege-, Medizin- oder Versicherungsdaten.
- Das Demo-Passwort steht nicht in diesem Repo-Handover. Es wurde dem Founder im Chat genannt.

## Aktueller Repo-Stand

- Workspace: `C:\Users\thoma\Claud Code\Handy APP\nachbar-io`
- Branch: `master`
- Remote: `origin/master`
- Status nach Deploy-Kontrolle: `master...origin/master`
- Production-URL: `https://nachbar-io.vercel.app`
- Letzter relevanter Head: `bb1fcad9c76598ed1bdfd5963f01c6bf3f039995`

Letzte relevante Commits:

- `bb1fcad fix(auth): send admins to admin dashboard after login`
- `57bede9 fix(sos): improve emergency contrast`
- `78939ef fix(registration): accept formatted pilot invite codes`

## Deployment

Admin-Redirect-Fix wurde nach Founder-Go gepusht und deployed.

- GitHub Actions Run: `https://github.com/ClaudeTheo/nachbar-io/actions/runs/25993235000`
- Run-Status: `completed`
- Conclusion: `success`
- Head SHA: `bb1fcad9c76598ed1bdfd5963f01c6bf3f039995`
- Live-Healthcheck nach Deploy: `/api/health` -> `200 {"status":"ok"}`

## Was erledigt wurde

### Registration-Fix

Problem:

- Formatierte Pilot-Invite-Codes konnten im Register-Flow abgelehnt werden.

Ergebnis:

- Invite-Check akzeptiert formatierte Pilot-Codes.
- Production-Smoke fuer `PILOT-MZPD-DZCS` war erfolgreich: valid true.
- Commit: `78939ef fix(registration): accept formatted pilot invite codes`

### SOS-Kontrast-Fix

Problem:

- SOS-Kategorie und Fehlermeldungen hatten zu schwachen Kontrast.

Geaendert:

- `modules/care/components/sos/SosCategoryPicker.tsx`
- Emergency Label/Error: `text-red-800`
- Beschreibung: `text-red-900`

Verifikation:

- Tests wurden ergaenzt.
- Deploy-Run `25992350111` erfolgreich.
- `/api/health` danach 200.
- `/sos` live im Browser geprueft.

Commit:

- `57bede9 fix(sos): improve emergency contrast`

### Admin-Redirect-Fix

Problem:

- `theovonbald@gmail.com` ist in Production Admin (`users.is_admin=true`), hat aber `ui_mode='youth'`.
- `/admin` selbst erlaubt den Account korrekt.
- Nach Login leitete `/after-login` trotzdem nach `/jugend`, weil nur `ui_mode` gelesen und ausgewertet wurde.

Geaendert:

- `app/after-login/page.tsx`
  - liest jetzt `ui_mode, is_admin`
  - ruft `resolvePostLoginPath(profile?.ui_mode, { isAdmin: profile?.is_admin })`
- `lib/auth/post-login-redirect.ts`
  - unterstuetzt Admin-Option
  - Admins gehen nach `/admin`
- `lib/user-modes.ts`
  - Post-Login-Path-Typ erlaubt jetzt `/admin`
- Tests:
  - `__tests__/lib/auth/post-login-redirect.test.ts`
  - `__tests__/app/after-login.test.tsx`

Verifikation vor Commit:

- `npx vitest run __tests__/lib/auth/post-login-redirect.test.ts __tests__/app/after-login.test.tsx` -> 11 passed
- ESLint auf geaenderten Dateien -> gruen
- `npx tsc --noEmit` -> gruen

Commit:

- `bb1fcad fix(auth): send admins to admin dashboard after login`

Erwartetes Verhalten:

- Login mit `theovonbald@gmail.com` sollte direkt nach `/admin` fuehren.
- Falls noch eine alte Session oder Browser-Cache stoert: ausloggen, neu einloggen, ggf. privaten Browser nutzen.

## Production-Demo-Nutzer

Auf Founder-Wunsch wurden sieben Demo-/Testnutzer in Production angelegt bzw. aktualisiert.

Alle Demo-Nutzer:

- sind mit `settings.is_test_user=true` markiert
- haben `test_user_kind='founder_demo_suite'`
- haben keine echten Medizin-, Pflege-, Adress- oder Versicherungsdaten
- nutzen interne Demo-Subscription-Daten, keine echte Stripe-Abrechnung

Demo-Accounts:

- Free Resident: `demo-free@test.nachbar.local`
- Elternteil: `demo-eltern@test.nachbar.local`
- Jugendlich: `demo-jugend@test.nachbar.local`
- Plus Angehoeriger: `demo-plus@test.nachbar.local`
- Senior: `demo-senior@test.nachbar.local`
- Pro Community: `demo-pro-community@test.nachbar.local`
- Pro Medical: `demo-pro-medical@test.nachbar.local`

Wichtige Modellierungsdetails:

- Jugendlicher nutzt `users.role='resident'`, weil der bestehende `users_role_check` keine Rolle `youth` erlaubt.
- Jugendmodus laeuft ueber `ui_mode='youth'` plus `youth_profiles`.
- Elternteil und Jugendlicher sind ueber `family_child_links` verbunden.
- Senior und Plus-Angehoeriger sind ueber `caregiver_links` verbunden.
- Plus-/Pro-Accounts haben Demo-Abos intern in `care_subscriptions`, ohne echte Stripe-Belastung.
- Pro Community hat ein Demo-`organizations`/`org_members`-Setup fuer das Pilotquartier.
- Pro Medical hat ein `doctor_profiles`-Setup.

Verifikation nach Anlage:

- Alle sieben Accounts konnten per Supabase Auth erfolgreich eingeloggt werden.
- Geprueft wurden Subscriptions, Caregiver-Link, Youth-Profil, Family-Link, Org-Membership und Doctor-Profil.

## Bekannte Admin-Details

Production-Read-only-Pruefung:

- `theovonbald@gmail.com`
  - Auth-User vorhanden
  - Profil vorhanden
  - `is_admin=true`
  - `role=doctor`
  - `ui_mode=youth`
  - `trust_level=admin`
- `thomasth@gmx.de`
  - Auth-User vorhanden
  - Profil vorhanden
  - `is_admin=false`
  - `role=resident`
  - `ui_mode=active`
  - `trust_level=verified`

Hinweis:

- `.env.cloud-current.local` enthaelt historisch `ADMIN_EMAIL="thomasth@gmx.de\n"`.
- Der aktuelle Admin-Gate-Code nutzt aber `users.is_admin`, nicht diese Env-Variable.

## Naechste sinnvolle Schritte

### 1. Live-Abnahme Admin

Im Browser:

1. `https://nachbar-io.vercel.app/login`
2. Mit `theovonbald@gmail.com` anmelden.
3. Erwartung: Redirect nach `/admin`.
4. Admin-Dashboard kurz pruefen: keine harte 500/403, Navigation sichtbar.

Wenn Redirect weiterhin falsch ist:

- Session loeschen oder privaten Browser nutzen.
- Network/Console pruefen.
- `/after-login` Response und Supabase-Profil fuer den eingeloggten User vergleichen.

### 2. Live-Abnahme vier Stufen

Mit vier Hauptrollen nacheinander oder parallel in getrennten Browser-Profilen testen:

- Free: `demo-free@test.nachbar.local`
- Plus: `demo-plus@test.nachbar.local`
- Pro Community: `demo-pro-community@test.nachbar.local`
- Pro Medical: `demo-pro-medical@test.nachbar.local`

Zusaetzlich Beziehungstests:

- Jugendlicher: `demo-jugend@test.nachbar.local`
- Elternteil: `demo-eltern@test.nachbar.local`
- Senior: `demo-senior@test.nachbar.local`
- Angehoeriger: `demo-plus@test.nachbar.local`

Minimaler Abnahmeplan:

- Login funktioniert.
- Post-Login-Redirect passt zur Rolle/UI-Mode.
- Geschuetzte Startseite laedt ohne 500.
- Jugendlicher sieht Jugend-Erlebnis, nicht Admin.
- Elternteil sieht Verbindung zum Jugendlichen, sofern UI vorhanden.
- Senior sieht Senior-/Care-Erlebnis.
- Angehoeriger sieht verbundenen Senior bzw. Care-Status, sofern UI vorhanden.
- Pro Community sieht Community-/Org-Kontext.
- Pro Medical sieht Arzt-/Doctor-Kontext.

### 3. Falls Login fuer Demo-Nutzer scheitert

Nicht sofort neue Nutzer anlegen.

Zuerst pruefen:

```powershell
cd "C:\Users\thoma\Claud Code\Handy APP\nachbar-io"
git status --short --branch
rg -n "after-login|resolvePostLoginPath|is_admin|care_subscriptions|family_child_links|caregiver_links|youth_profiles" app lib modules __tests__
```

Danach gezielt mit Supabase read-only pruefen:

- Auth-User existiert?
- `public.users`-Profil existiert?
- `ui_mode`, `role`, `is_admin`, `household_id` plausibel?
- Subscription vorhanden?
- Beziehungstabellen vorhanden?

Prod-Schreibaktionen erst nach neuem Founder-Go.

## Nicht als Naechstes tun

- Keine Demo-Passwoerter ins Repo committen.
- Keine echten Stripe-Abos fuer Demo-Nutzer erzeugen.
- Keine Prod-Migration nur wegen Demo-Nutzern.
- Keine bestehenden User-Rollen hart umstellen, bevor der Login-/Redirect-Pfad reproduziert ist.
- Keine Admin-Env-Umbauten, solange `users.is_admin` als Gate funktioniert.

