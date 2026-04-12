import { createClient } from "@/lib/supabase/server";
import { getCareProfile } from "@/modules/care/services/profile.service";
import { redirect } from "next/navigation";
import { ProfilView } from "@/components/senior/ProfilView";

export default async function SeniorProfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Load user data
  const { data: userData } = await supabase
    .from("users")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .single();

  // Load CareProfile for emergency contacts
  let contacts: Array<{ name: string; relationship: string; phone: string }> =
    [];
  try {
    const profile = await getCareProfile(supabase, user.id, user.id);
    if (profile?.emergency_contacts) {
      contacts = profile.emergency_contacts
        .filter((c: any) => c.name && c.phone)
        .map((c: any) => ({
          name: c.name,
          relationship: c.relationship || "",
          phone: c.phone,
        }));
    }
  } catch {
    // No profile — show empty contacts
  }

  return (
    <ProfilView
      displayName={userData?.display_name ?? "Senior"}
      avatarUrl={userData?.avatar_url ?? null}
      emergencyContacts={contacts}
    />
  );
}
