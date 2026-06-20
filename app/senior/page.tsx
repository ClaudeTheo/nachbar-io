// app/senior/page.tsx
// Welle S1 (2026-06-12): Legacy-Einstieg stillgelegt — redirectet in die
// kanonische (senior)-Shell. Es gibt nur noch EINE Senior-Startseite.
import { redirect } from "next/navigation";

export default function SeniorEntryPage() {
  redirect("/kreis-start");
}
