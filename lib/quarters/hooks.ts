"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "./types";

// Hook fuer Benutzerrolle mit Hilfsfunktionen
export function useUserRole() {
  const [role, setRole] = useState<UserRole>("user");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();
        if (data?.role) setRole(data.role as UserRole);
      }
      setLoading(false);
    }
    load();
  }, []);

  return {
    role,
    loading,
    isSuperAdmin: role === "super_admin",
    isQuarterAdmin: role === "quarter_admin",
    isAdmin: role === "super_admin" || role === "quarter_admin",
  };
}
