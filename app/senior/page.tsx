// app/senior/page.tsx
// Einstiegspunkt fuer den Seniorenmodus.
import { redirect } from "next/navigation";

export default function SeniorEntryPage() {
  redirect("/senior/home");
}
