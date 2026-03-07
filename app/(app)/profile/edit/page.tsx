"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, Save } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/lib/supabase/types";

export default function ProfileEditPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();
      if (data) {
        setUser(data as User);
        setDisplayName(data.display_name);
      }
    }
    load();
  }, []);

  async function handleSave() {
    if (!user || !displayName.trim()) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("users")
        .update({ display_name: displayName.trim() })
        .eq("id", user.id);

      if (updateError) {
        setError("Speichern fehlgeschlagen.");
        setSaving(false);
        return;
      }

      setSuccess(true);
      setSaving(false);
      // Kurz warten, dann zurück zum Profil
      setTimeout(() => router.push("/profile"), 1000);
    } catch {
      setError("Netzwerkfehler. Bitte versuchen Sie es erneut.");
      setSaving(false);
    }
  }

  if (!user) {
    return <div className="py-12 text-center text-muted-foreground">Laden...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/profile" className="rounded-lg p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-anthrazit">Profil bearbeiten</h1>
      </div>

      {/* Avatar */}
      <div className="flex justify-center">
        <div className="relative">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-quartier-green/10 text-4xl">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt=""
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              "👤"
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 rounded-full bg-white p-1 shadow-md">
            <Camera className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Avatar-Upload kommt bald
          </p>
        </div>
      </div>

      {/* Formular */}
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="displayName" className="text-sm font-medium text-anthrazit">Anzeigename</label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Ihr Anzeigename"
            maxLength={50}
          />
          <p className="text-xs text-muted-foreground">
            Dieser Name wird anderen Nachbarn angezeigt.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-anthrazit">E-Mail</label>
          <Input value={user.email_hash ? "***@***" : "Nicht angegeben"} disabled />
          <p className="text-xs text-muted-foreground">
            Die E-Mail-Adresse kann aus Datenschutzgründen nicht angezeigt werden.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-anthrazit">Mitglied seit</label>
          <Input
            value={new Date(user.created_at).toLocaleDateString("de-DE", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            disabled
          />
        </div>
      </div>

      {error && <p className="text-sm text-emergency-red">{error}</p>}
      {success && (
        <p className="text-sm text-quartier-green font-medium">
          Profil gespeichert!
        </p>
      )}

      <Button
        onClick={handleSave}
        disabled={saving || !displayName.trim() || displayName.trim() === user.display_name}
        className="w-full bg-quartier-green hover:bg-quartier-green-dark"
      >
        <Save className="mr-2 h-4 w-4" />
        {saving ? "Speichern..." : "Änderungen speichern"}
      </Button>
    </div>
  );
}
