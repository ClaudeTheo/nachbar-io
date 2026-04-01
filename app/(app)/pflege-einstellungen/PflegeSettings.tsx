"use client";

// Pflege-Einstellungen Client Component
// 4 Sektionen: Notfallmappe, KI-Gedaechtnis, Pflegegrad-Navigator, Besuchsbenachrichtigungen

import { useState, useCallback } from "react";
import {
  FileText,
  Brain,
  ClipboardList,
  Bell,
  Loader2,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface PflegeSettingsProps {
  userId: string;
  initialSettings: Record<string, string>;
}

// Einstellungs-Definitionen
const SETTINGS = [
  {
    key: "notfallmappe_freigabe",
    title: "Notfallmappe",
    description:
      "Geben Sie Ihre Notfallmappe fuer Ihr Pflegeteam frei, damit im Ernstfall alle wichtigen Informationen bereitstehen.",
    icon: FileText,
    type: "toggle" as const,
    defaultValue: "off",
    toggleLabel: "Notfallmappe fuer Pflegeteam freigeben",
  },
  {
    key: "ki_gedaechtnis_sichtbarkeit",
    title: "KI-Gedaechtnis",
    description:
      "Legen Sie fest, wer die Antworten der KI-Assistenz einsehen darf.",
    icon: Brain,
    type: "radio" as const,
    defaultValue: "nur_ich",
    options: [
      { value: "nur_ich", label: "Nur ich" },
      { value: "angehoerige", label: "Angehoerige" },
      { value: "pflegeteam", label: "Pflegeteam" },
      { value: "alle", label: "Alle" },
    ],
  },
  {
    key: "pflegegrad_teilen",
    title: "Pflegegrad-Navigator",
    description:
      "Teilen Sie das Ergebnis des Pflegegrad-Navigators mit Ihren Angehoerigen.",
    icon: ClipboardList,
    type: "toggle" as const,
    defaultValue: "off",
    toggleLabel: "Ergebnis mit Angehoerigen teilen",
  },
  {
    key: "besuchs_benachrichtigungen",
    title: "Besuchsbenachrichtigungen",
    description:
      "Erhalten Sie eine Push-Nachricht, wenn ein Pflegebesuch dokumentiert wird.",
    icon: Bell,
    type: "toggle" as const,
    defaultValue: "on",
    toggleLabel: "Push-Nachricht bei Pflegebesuch",
  },
] as const;

type SettingKey = (typeof SETTINGS)[number]["key"];

export function PflegeSettings({
  userId,
  initialSettings,
}: PflegeSettingsProps) {
  // Alle Einstellungswerte in einem State
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const s of SETTINGS) {
      initial[s.key] = initialSettings[s.key] ?? s.defaultValue;
    }
    return initial;
  });

  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  // Einstellung speichern (ueber user_memory_facts)
  const saveSetting = useCallback(
    async (key: SettingKey, value: string) => {
      setSaving(key);
      setSaved(null);

      try {
        const supabase = createClient();

        // Duplikat-Check: existierende Zeile suchen
        const { data: existing } = await supabase
          .from("user_memory_facts")
          .select("id")
          .eq("user_id", userId)
          .eq("category", "preference")
          .eq("key", key)
          .eq("source", "care_settings")
          .maybeSingle();

        if (existing) {
          // Update
          await supabase
            .from("user_memory_facts")
            .update({ value, updated_at: new Date().toISOString() })
            .eq("id", existing.id);
        } else {
          // Insert
          await supabase.from("user_memory_facts").insert({
            user_id: userId,
            category: "preference",
            consent_level: "basis",
            key,
            value,
            value_encrypted: false,
            visibility: "private",
            source: "care_settings",
            source_user_id: userId,
            confirmed: true,
          });
        }

        setSaved(key);
        setTimeout(() => setSaved(null), 2000);
      } catch {
        // Fehler stillschweigend behandeln
      } finally {
        setSaving(null);
      }
    },
    [userId]
  );

  // Toggle-Handler
  const handleToggle = (key: SettingKey) => {
    const newValue = values[key] === "on" ? "off" : "on";
    setValues((prev) => ({ ...prev, [key]: newValue }));
    saveSetting(key, newValue);
  };

  // Radio-Handler
  const handleRadio = (key: SettingKey, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    saveSetting(key, value);
  };

  return (
    <div className="space-y-4">
      {SETTINGS.map((setting) => {
        const Icon = setting.icon;
        const isSaving = saving === setting.key;
        const isSaved = saved === setting.key;

        return (
          <div
            key={setting.key}
            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
          >
            {/* Header */}
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4CAF87]/10">
                <Icon className="h-5 w-5 text-[#4CAF87]" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-[#2D3142]">
                  {setting.title}
                </h3>
              </div>
              {/* Speicher-Status */}
              {isSaving && (
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              )}
              {isSaved && (
                <Check className="h-4 w-4 text-[#4CAF87]" />
              )}
            </div>

            <p className="mb-4 text-sm text-gray-500">{setting.description}</p>

            {/* Toggle */}
            {setting.type === "toggle" && (
              <label className="flex cursor-pointer items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={values[setting.key] === "on"}
                  onClick={() => handleToggle(setting.key)}
                  className={`relative h-7 w-12 rounded-full transition-colors duration-200 ${
                    values[setting.key] === "on"
                      ? "bg-[#4CAF87]"
                      : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      values[setting.key] === "on"
                        ? "translate-x-5"
                        : "translate-x-0"
                    }`}
                  />
                </button>
                <span className="text-sm text-[#2D3142]">
                  {setting.toggleLabel}
                </span>
              </label>
            )}

            {/* Radio */}
            {setting.type === "radio" && (
              <div className="space-y-2">
                {setting.options.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-gray-50"
                  >
                    <input
                      type="radio"
                      name={setting.key}
                      value={option.value}
                      checked={values[setting.key] === option.value}
                      onChange={() => handleRadio(setting.key, option.value)}
                      className="h-4 w-4 border-gray-300 text-[#4CAF87] accent-[#4CAF87]"
                    />
                    <span className="text-sm text-[#2D3142]">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
