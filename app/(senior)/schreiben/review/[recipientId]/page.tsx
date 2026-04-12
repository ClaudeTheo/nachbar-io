// app/(senior)/schreiben/review/[recipientId]/page.tsx
// Task H-3: Server-Komponente fuer die Review-Seite im Voice-Flow.
//
// Laedt den Empfaenger aus dem CareProfile des angemeldeten Seniors und
// rendert die ReviewWrapper-Komponente. Ungueltige Indizes oder fehlende
// Telefonnummern fuehren zu notFound().

import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCareProfile } from "@/modules/care/services/profile.service";
import { toSchreibenContacts } from "@/lib/messaging/schreiben-contacts";
import { ReviewWrapper } from "@/components/senior/ReviewWrapper";
import type { EmergencyContact } from "@/lib/care/types";

interface ReviewPageProps {
  params: Promise<{ recipientId: string }>;
}

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { recipientId } = await params;
  const index = parseInt(recipientId, 10);

  if (isNaN(index) || index < 0) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let emergencyContacts: EmergencyContact[] = [];
  try {
    const profile = await getCareProfile(supabase, user.id, user.id);
    if (profile?.emergency_contacts) {
      emergencyContacts = profile.emergency_contacts as EmergencyContact[];
    }
  } catch {
    emergencyContacts = [];
  }

  const contacts = toSchreibenContacts(emergencyContacts);
  const contact = contacts[index];

  if (!contact || contact.phone === null) {
    notFound();
  }

  return (
    <ReviewWrapper
      recipientName={contact.name}
      recipientIndex={contact.index}
      recipientPhone={contact.phone}
    />
  );
}
