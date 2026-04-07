// app/senior/medications/page.tsx
// Redirect: /senior/medications → /medications (Route-Gruppe (senior))
import { redirect } from "next/navigation";

export default function SeniorMedicationsRedirect() {
  redirect("/medications");
}
