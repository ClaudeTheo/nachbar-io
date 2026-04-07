"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ChevronRight, Lock } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AvatarPicker } from "@/components/AvatarPicker";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { getProfile, updateProfile } from "@/lib/services";
import type { User } from "@/lib/supabase/types";

interface HouseholdAddress {
  street_name: string;
  house_number: string;
}

export default function ProfileEditPage() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [hasSkills, setHasSkills] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Adresse — DSGVO-konform: Nur eigene Adresse anzeigen, NIE alle Haushalte
  const [currentHouseholdId, setCurrentHouseholdId] = useState<string | null>(null);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string | null>(null);
  const [currentAddress, setCurrentAddress] = useState<HouseholdAddress | null>(null);
  const [showAddressEdit, setShowAddressEdit] = useState(false);
  const [addressStreet, setAddressStreet] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [addressMatching, setAddressMatching] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  // Passwort-Aenderung
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    async function load() {
      if (!authUser) return;
      const supabase = createClient();

      try {
        const data = await getProfile(authUser.id);
        setUser(data);
        setDisplayName(data.display_name);
        setAvatarUrl(data.avatar_url);
        setBio(data.bio || "");
        setPhone(data.phone || "");
      } catch {
        // Profil konnte nicht geladen werden
      }

      // Eigenen Haushalt + Adresse laden (NICHT alle Haushalte — DSGVO BUG-23)
      const { data: membership } = await supabase
        .from("household_members")
        .select("household_id, households(street_name, house_number)")
        .eq("user_id", authUser.id)
        .maybeSingle();
      if (membership?.household_id) {
        setCurrentHouseholdId(membership.household_id);
        setSelectedHouseholdId(membership.household_id);
        const hh = membership.households as unknown as HouseholdAddress | null;
        if (hh) {
          setCurrentAddress(hh);
        }
      }

      // Skills pruefen
      const { count } = await supabase
        .from("skills")
        .select("id", { count: "exact", head: true })
        .eq("user_id", authUser.id);
      setHasSkills((count ?? 0) > 0);
    }
    load();
  }, [authUser]);

  // Adresse serverseitig matchen (DSGVO-konform, BUG-23 Fix)
  async function matchHousehold() {
    if (!addressStreet.trim() || !addressNumber.trim()) {
      setAddressError("Bitte Straße und Hausnummer eingeben.");
      return;
    }
    setAddressMatching(true);
    setAddressError(null);
    try {
      const res = await fetch("/api/profile/match-household", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          street_name: addressStreet.trim(),
          house_number: addressNumber.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.household_id) {
        setSelectedHouseholdId(data.household_id);
        setCurrentAddress({ street_name: data.street_name, house_number: data.house_number });
        setShowAddressEdit(false);
        setAddressError(null);
        toast.success(`Adresse gefunden: ${data.street_name} ${data.house_number}`);
      } else {
        setAddressError(data.error || "Adresse nicht gefunden.");
      }
    } catch {
      setAddressError("Netzwerkfehler. Bitte erneut versuchen.");
    }
    setAddressMatching(false);
  }

  const addressChanged = selectedHouseholdId !== null && selectedHouseholdId !== currentHouseholdId;
  const hasChanges = user && (
    displayName.trim() !== user.display_name ||
    avatarUrl !== user.avatar_url ||
    bio.trim() !== (user.bio || "") ||
    phone.trim() !== (user.phone || "") ||
    addressChanged
  );

  // Profil-Vollstaendigkeit — IDs fuer Scroll-to-Field (BUG-24)
  const completionSteps = [
    { done: !!avatarUrl, label: "Avatar", id: "avatarPicker" },
    { done: bio.trim().length > 0, label: "Über mich", id: "bio" },
    { done: hasSkills, label: "Kompetenzen", id: "skills" },
    { done: phone.trim().length > 0, label: "Telefon", id: "phone" },
  ];
  const completedCount = completionSteps.filter((s) => s.done).length;

  async function handleSave() {
    if (!user || !displayName.trim()) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      try {
        await updateProfile(user.id, {
          display_name: displayName.trim(),
          avatar_url: avatarUrl,
          bio: bio.trim() || null,
          phone: phone.trim() || null,
        });
      } catch {
        toast.error("Speichern fehlgeschlagen.");
        setError("Speichern fehlgeschlagen.");
        setSaving(false);
        return;
      }

      // Adresse aendern falls geaendert
      if (addressChanged && selectedHouseholdId) {
        const supabase = createClient();
        const { error: addrError } = await supabase
          .from("household_members")
          .update({ household_id: selectedHouseholdId })
          .eq("user_id", user.id);
        if (addrError) {
          toast.error("Adresse konnte nicht geändert werden.");
          setError("Adresse konnte nicht geändert werden.");
          setSaving(false);
          return;
        }
        setCurrentHouseholdId(selectedHouseholdId);
      }

      toast.success("Profil gespeichert!");
      setSuccess(true);
      setSaving(false);
      // Aktualisierte Daten im User-State speichern damit hasChanges korrekt ist
      setUser({ ...user, display_name: displayName.trim(), avatar_url: avatarUrl, bio: bio.trim() || null, phone: phone.trim() || null });
      setTimeout(() => {
        router.push("/profile");
        router.refresh();
      }, 1000);
    } catch {
      toast.error("Netzwerkfehler. Bitte versuchen Sie es erneut.");
      setError("Netzwerkfehler. Bitte versuchen Sie es erneut.");
      setSaving(false);
    }
  }

  // Passwort aendern
  async function handlePasswordChange() {
    if (!newPassword || !confirmPassword) {
      toast.error("Bitte füllen Sie alle Passwortfelder aus.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Das neue Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Die Passwörter stimmen nicht überein.");
      return;
    }

    if (!currentPassword) {
      toast.error("Bitte geben Sie Ihr aktuelles Passwort ein.");
      return;
    }

    setChangingPassword(true);
    try {
      const supabase = createClient();

      // Aktuelles Passwort pruefen: Re-Authentifizierung via signInWithPassword
      if (authUser?.email) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: authUser.email,
          password: currentPassword,
        });
        if (signInError) {
          toast.error("Das aktuelle Passwort ist nicht korrekt.");
          setChangingPassword(false);
          return;
        }
      }

      // Neues Passwort setzen
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        toast.error("Passwort konnte nicht geändert werden: " + updateError.message);
      } else {
        toast.success("Passwort erfolgreich geändert!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setShowPasswordForm(false);
      }
    } catch {
      toast.error("Netzwerkfehler. Bitte versuchen Sie es erneut.");
    }
    setChangingPassword(false);
  }

  if (!user) {
    return <div className="py-12 text-center text-muted-foreground">Laden...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Profil bearbeiten" backHref="/profile" />

      {/* Profil-Vollstaendigkeit — fehlende Schritte klickbar (BUG-24 Fix) */}
      {completedCount < 4 && (
        <div className="rounded-lg border border-quartier-green/20 bg-quartier-green/5 p-3">
          <p className="text-sm font-medium text-quartier-green">
            Profil {completedCount}/4 vervollständigt
          </p>
          <div className="mt-1.5 flex gap-1">
            {completionSteps.map((step, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full ${
                  step.done ? "bg-quartier-green" : "bg-quartier-green/20"
                }`}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {completionSteps.filter(s => !s.done).map((step) => (
              <button
                key={step.label}
                type="button"
                onClick={() => {
                  if (step.id === "skills") {
                    router.push("/profile/skills");
                  } else {
                    document.getElementById(step.id)?.focus();
                    document.getElementById(step.id)?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }
                }}
                className="rounded-full border border-quartier-green/30 bg-white px-2.5 py-1 text-xs font-medium text-quartier-green transition-colors hover:bg-quartier-green/10 active:bg-quartier-green/20"
              >
                + {step.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Avatar-Picker */}
      <div id="avatarPicker" className="flex justify-center">
        <AvatarPicker
          currentAvatarUrl={avatarUrl}
          onAvatarChange={setAvatarUrl}
          userId={user.id}
        />
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
          <label htmlFor="bio" className="text-sm font-medium text-anthrazit">Über mich</label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Erzählen Sie etwas über sich (z.B. 'Hobbygärtner, 2 Kinder, immer für einen Kaffee zu haben')"
            maxLength={200}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            {bio.length}/200 Zeichen
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="phone" className="text-sm font-medium text-anthrazit">Telefonnummer (optional)</label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+49 ..."
            maxLength={20}
          />
          <p className="text-xs text-muted-foreground">
            Nur für Nachbarn sichtbar, wenn Sie es wünschen.
          </p>
        </div>

        {/* Adresse — DSGVO-konform: Nur eigene Adresse sichtbar (BUG-23 Fix) */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-anthrazit">Adresse</label>

          {!showAddressEdit ? (
            <>
              <div className="flex items-center gap-2">
                <Input
                  value={currentAddress
                    ? `${currentAddress.street_name} ${currentAddress.house_number}`
                    : "Keine Adresse hinterlegt"}
                  disabled
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddressEdit(true)}
                >
                  Ändern
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Ihre aktuelle Adresse im Quartier.
              </p>
            </>
          ) : (
            <div className="space-y-2 rounded-lg border border-input p-3">
              <p className="text-xs text-muted-foreground">
                Geben Sie Ihre neue Adresse ein:
              </p>
              <div className="flex gap-2">
                <Input
                  value={addressStreet}
                  onChange={(e) => setAddressStreet(e.target.value)}
                  placeholder="Straße (z.B. Sanarystraße)"
                  className="flex-1"
                />
                <Input
                  value={addressNumber}
                  onChange={(e) => setAddressNumber(e.target.value)}
                  placeholder="Nr."
                  className="w-20"
                />
              </div>
              {addressError && (
                <p className="text-xs text-emergency-red">{addressError}</p>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={matchHousehold}
                  disabled={addressMatching || !addressStreet.trim() || !addressNumber.trim()}
                  className="bg-quartier-green hover:bg-quartier-green-dark"
                >
                  {addressMatching ? "Suche..." : "Adresse prüfen"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddressEdit(false);
                    setAddressError(null);
                    setAddressStreet("");
                    setAddressNumber("");
                  }}
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Kompetenzen-Link */}
        <Link
          href="/profile/skills"
          className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
        >
          <div>
            <p className="text-sm font-medium text-anthrazit">Kompetenzen bearbeiten</p>
            <p className="text-xs text-muted-foreground">
              {hasSkills ? "Ihre Fähigkeiten sind hinterlegt" : "Teilen Sie Ihre Fähigkeiten mit Nachbarn"}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>

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

      {/* Passwort aendern — aufklappbar */}
      <div className="rounded-lg border border-border">
        <button
          onClick={() => setShowPasswordForm(!showPasswordForm)}
          className="flex w-full items-center justify-between p-3"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-anthrazit">
            <Lock className="h-4 w-4" /> Passwort ändern
          </span>
          <span className="text-xs text-muted-foreground">{showPasswordForm ? "▲" : "▼"}</span>
        </button>

        {showPasswordForm && (
          <div className="space-y-3 border-t px-3 pb-3 pt-2">
            <p className="text-xs text-muted-foreground">
              Ändern Sie hier Ihr Passwort. Ideal nach der ersten Anmeldung mit einem temporären Passwort.
            </p>

            <div className="space-y-2">
              <label htmlFor="currentPassword" className="text-sm font-medium text-anthrazit">
                Aktuelles Passwort
              </label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Ihr aktuelles Passwort"
                autoComplete="current-password"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="newPassword" className="text-sm font-medium text-anthrazit">
                Neues Passwort
              </label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mindestens 8 Zeichen"
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-anthrazit">
                Neues Passwort bestätigen
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Passwort wiederholen"
                autoComplete="new-password"
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-emergency-red">Die Passwörter stimmen nicht überein.</p>
              )}
              {newPassword && newPassword.length < 8 && (
                <p className="text-xs text-alert-amber">Mindestens 8 Zeichen erforderlich.</p>
              )}
            </div>

            <Button
              onClick={handlePasswordChange}
              disabled={
                changingPassword ||
                !currentPassword ||
                !newPassword ||
                newPassword.length < 8 ||
                newPassword !== confirmPassword
              }
              variant="outline"
              className="w-full"
            >
              <Lock className="mr-2 h-4 w-4" />
              {changingPassword ? "Wird geändert..." : "Passwort ändern"}
            </Button>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-emergency-red">{error}</p>}
      {success && (
        <p className="text-sm text-quartier-green font-medium">
          Profil gespeichert!
        </p>
      )}

      <Button
        onClick={handleSave}
        disabled={saving || !displayName.trim() || !hasChanges}
        className="w-full bg-quartier-green hover:bg-quartier-green-dark"
      >
        <Save className="mr-2 h-4 w-4" />
        {saving ? "Speichern..." : "Änderungen speichern"}
      </Button>
    </div>
  );
}
