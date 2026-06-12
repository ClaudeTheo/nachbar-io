// app/senior/home/page.tsx
// Welle S1 (2026-06-12): Die zweite Senior-Startseite ist stillgelegt (Befund
// B1:6 — der Senior pendelte zwischen /senior/home und /kreis-start). Es gibt
// nur noch EINE Startseite: /kreis-start. Die alte Aktions-Übersicht lebt nur
// noch im Dev-Preview (app/senior/preview) weiter.
import { redirect } from "next/navigation";

export default function SeniorHomePage() {
  redirect("/kreis-start");
}
