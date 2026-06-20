// app/senior/help/page.tsx
// Welle S1 (2026-06-12): Legacy-Hilfeseite stillgelegt. Sie war nur über die
// abgelöste /senior/home erreichbar. Wir redirecten zurück in die Shell
// (/kreis-start) statt direkt in den Notfall-Flow — der Senior wählt dort
// bewusst zwischen "Notfall 112" und den übrigen Kacheln.
import { redirect } from "next/navigation";

export default function SeniorHelpPage() {
  redirect("/kreis-start");
}
