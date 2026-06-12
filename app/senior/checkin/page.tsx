// app/senior/checkin/page.tsx
// Welle S1 (2026-06-12): Legacy-Check-in stillgelegt. Die alte Seite schrieb in
// die seit Mig 032 deprecatete Tabelle senior_checkins und meldete IMMER Erfolg
// inkl. "Vertrauensperson wird informiert" — eine falsche Beruhigung, die kein
// Caregiver-Dashboard je sah (Befund A3:2). Der kanonische Check-in liegt unter
// /checkin (Route-Gruppe (senior)) und schreibt ins aktive care_checkins-System.
import { redirect } from "next/navigation";

export default function SeniorCheckinPage() {
  redirect("/checkin");
}
