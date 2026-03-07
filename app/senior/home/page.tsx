"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SeniorButton } from "@/components/SeniorButton";
import { createClient } from "@/lib/supabase/client";

export default function SeniorHomePage() {
  const [userName, setUserName] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function loadName() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("users")
          .select("display_name")
          .eq("id", user.id)
          .single();
        if (data) setUserName(data.display_name);
      }
    }
    loadName();
  }, []);

  return (
    <div className="space-y-6">
      {/* Begrüßung */}
      <div className="text-center">
        <p className="senior-heading text-anthrazit">
          Guten Tag{userName ? `, ${userName}` : ""}!
        </p>
        <p className="senior-text mt-2 text-muted-foreground">
          Was möchten Sie tun?
        </p>
      </div>

      {/* 4 große Buttons */}
      <div className="space-y-4">
        <SeniorButton
          icon="🆘"
          label="Hilfe anfragen"
          onClick={() => router.push("/senior/help")}
          variant="alert"
        />

        <SeniorButton
          icon="📰"
          label="Nachrichten"
          onClick={() => router.push("/senior/news")}
          variant="neutral"
        />

        <SeniorButton
          icon="✅"
          label="Alles in Ordnung"
          onClick={() => router.push("/senior/checkin")}
          variant="success"
        />

        <SeniorButton
          icon="📞"
          label="Nachbarn kontaktieren"
          onClick={() => router.push("/senior/help")}
          variant="primary"
        />
      </div>
    </div>
  );
}
