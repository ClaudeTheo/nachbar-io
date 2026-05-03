"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SeniorHomeActions } from "@/components/senior/SeniorHomeActions";
import { createClient } from "@/lib/supabase/client";
import { getCachedUser } from "@/lib/supabase/cached-auth";

export default function SeniorHomePage() {
  const [userName, setUserName] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function loadName() {
      const supabase = createClient();
      const { user } = await getCachedUser(supabase);
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

  return <SeniorHomeActions userName={userName} onNavigate={router.push} />;
}
