// app/senior/news/page.tsx
// Welle S1 (2026-06-12): Legacy-Nachrichtenseite stillgelegt. Quartiersnews und
// lokale Infos leben jetzt im Info-Hub "Hier bei mir" (/hier-bei-mir), der in
// der Senior-Shell mit großer Schrift und 80px-Targets rendert.
import { redirect } from "next/navigation";

export default function SeniorNewsPage() {
  redirect("/hier-bei-mir");
}
