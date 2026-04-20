"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { invalidateFlagCache } from "@/lib/feature-flags";
import type { FeatureFlag } from "@/lib/feature-flags";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Settings2 } from "lucide-react";

// Beschreibungen fuer bekannte Flag-Keys
const FLAG_DESCRIPTIONS: Record<string, string> = {
  PILOT_MODE: "Pilotmodus — alle Features freigeschaltet",
  CARE_MODULE: "Heartbeat & Check-in System",
  VIDEO_CALL_PLUS: "Video-Call fuer Angehoerige (Plus)",
  VIDEO_CALL_MEDICAL: "Video-Sprechstunde (Pro Medical)",
  MARKETPLACE: "Marktplatz-Modul",
  LOST_FOUND: "Fundbuero-Modul",
  EVENTS: "Veranstaltungen-Modul",
  NEWS_AI: "KI-Nachrichtenzusammenfassung",
  PUSH_NOTIFICATIONS: "Push-Benachrichtigungen",
  KOMMUNAL_MODULE: "Kommunal-Modul (Mängelmelder, Müllkalender, Rathaus)",
  // Gesundheits-Features
  MEDICATIONS_ENABLED: "Medikamentenplan (Care) - Plus-Feature",
  DOCTORS_ENABLED: "Aerzte-Verzeichnis (Care)",
  APPOINTMENTS_ENABLED: "Terminbuchung (Care)",
  VIDEO_CONSULTATION: "Online-Sprechstunde (Video-Termin)",
  HEARTBEAT_ENABLED: "Lebenszeichen / Check-in (Care)",
  GDT_ENABLED: "GDT-Schnittstelle (Arzt-Portal)",
  // Care-Access (QR-Scan)
  CARE_ACCESS_FAMILY:
    "Familie/Freunde duerfen Senior per QR scannen (Gruppe A, Default ON)",
  CARE_ACCESS_INDIVIDUAL_CAREGIVER:
    "Einzel-Pflegerin darf Senior scannen (Gruppe B, Stufe 2)",
  CARE_ACCESS_CARE_COMPANY:
    "Pflegefirma/Heim darf scannen (Gruppe C, Stufe 3 - nach Zulassung)",
  CARE_ACCESS_EMERGENCY:
    "Oeffentliche Notfall-Karte per QR-Token (Ersthelfer, Default ON)",
  // KI-Provider (nur genau EINER sollte true sein)
  AI_PROVIDER_CLAUDE:
    "KI-Provider Claude Haiku 4 (Pilot-Default, beste Qualitaet)",
  AI_PROVIDER_MISTRAL:
    "KI-Provider Mistral Small Paris (volle EU-DSGVO-Alternative)",
  AI_PROVIDER_OFF:
    "KI komplett aus - Formular-only-Onboarding (Paranoia-Modus)",
  // Externe APIs
  NINA_WARNINGS_ENABLED: "NINA-Katastrophenwarnungen (BBK)",
  DWD_WEATHER_WARNINGS_ENABLED: "DWD-Unwetter- und Hitzewarnungen",
  UBA_AIR_QUALITY_ENABLED: "Umweltbundesamt Luftqualitaet",
  DELFI_OEPNV_ENABLED: "DELFI OePNV-Abfahrten",
  LGL_BW_BUILDING_OUTLINES_ENABLED: "LGL-BW Hausumringe als Karten-Layer",
  OSM_POI_LAYER_ENABLED: "OpenStreetMap POIs in der Quartierkarte",
  BKG_GEOCODER_FALLBACK_ENABLED: "BKG Geocoder als Nicht-BW-Fallback",
  BFARM_DRUGS_ENABLED: "BfArM Medikamenten-Lookup",
  DIGA_REGISTRY_ENABLED: "DiGA-Verzeichnis",
  GKV_CARE_REGISTRY_ENABLED: "GKV-Pflegedienst-Verzeichnis",
  // Hausverwaltung (Mig 177)
  HOUSING_MODULE_ENABLED:
    "Master-Schalter Hausverwaltungs-Modul (muss an sein, damit Teilfunktionen wirken)",
  HOUSING_REPORTS: "Teilfunktion: Maengelmeldung an Hausverwaltung",
  HOUSING_ANNOUNCEMENTS: "Teilfunktion: Hausmitteilungen an Bewohner",
  HOUSING_DOCUMENTS: "Teilfunktion: Dokumenten-Postfach (Briefe der HV)",
  HOUSING_APPOINTMENTS: "Teilfunktion: Termine (Handwerker, Wartung, etc.)",
  HOUSING_SHADOW_QUARTER:
    "Free-first: Registration ohne Quartier-Wahl moeglich (Schatten-Quartier 'Offenes Quartier Deutschland')",
};

// HEARTBEAT wurde aus "Kern-Module" in "Gesundheit" verschoben (mit den neuen
// Health-Flags). Reihenfolge im UI: Gesundheit zuerst, weil zentrale Feature-
// Gruppe fuer den Pilot.
const FLAG_GROUPS: Array<{ title: string; pattern: RegExp }> = [
  {
    title: "Care-Access",
    pattern: /^(CARE_ACCESS_|AI_PROVIDER_)/,
  },
  {
    title: "Gesundheit",
    pattern: /^(MEDICATIONS|DOCTORS|APPOINTMENTS|VIDEO_CONSULT|HEARTBEAT|GDT)/,
  },
  {
    title: "Kern-Module",
    pattern:
      /^(BOARD|EVENTS|NEWS|MARKETPLACE|BUSINESSES|INVITATIONS|CARE_MODULE|KOMMUNAL_MODULE|LOST_FOUND|PUSH_NOTIFICATIONS)/,
  },
  { title: "Care / Plus", pattern: /^(CAREGIVER|VIDEO_CALL)/ },
  { title: "Hausverwaltung", pattern: /^HOUSING_/ },
  { title: "Organisation", pattern: /^(ORG_|MODERATION|QUARTER_STATS)/ },
  {
    title: "Externe APIs",
    pattern: /^(NINA|DWD|UBA|DELFI|LGL_BW|OSM|BKG|BFARM|DIGA|GKV)/,
  },
  {
    title: "Admin / Sonstige",
    pattern: /^(ADMIN|REFERRAL|QUARTER_PROGRESS|PILOT)/,
  },
];

/**
 * Admin-Komponente zur Verwaltung von Feature-Flags.
 * Zeigt alle Flags in einer Tabelle mit Toggle-Switch.
 */
export function FeatureFlagManager() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  // Flags aus der Datenbank laden
  const loadFlags = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("feature_flags")
      .select(
        "key, enabled, required_roles, required_plans, enabled_quarters, admin_override",
      )
      .order("key", { ascending: true });

    if (error) {
      toast.error("Feature-Flags konnten nicht geladen werden.");
      setLoading(false);
      return;
    }

    const parsed: FeatureFlag[] = (data ?? []).map((row) => ({
      key: row.key,
      enabled: Boolean(row.enabled),
      required_roles: Array.isArray(row.required_roles)
        ? row.required_roles
        : [],
      required_plans: Array.isArray(row.required_plans)
        ? row.required_plans
        : [],
      enabled_quarters: Array.isArray(row.enabled_quarters)
        ? row.enabled_quarters
        : [],
      admin_override: Boolean(row.admin_override),
    }));

    setFlags(parsed);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFlags();
  }, [loadFlags]);

  const groupedFlags = useMemo(() => {
    const buckets = FLAG_GROUPS.map((group) => ({
      title: group.title,
      flags: flags
        .filter((flag) => group.pattern.test(flag.key))
        .sort((left, right) => left.key.localeCompare(right.key)),
    })).filter((group) => group.flags.length > 0);

    const groupedKeys = new Set(
      buckets.flatMap((group) => group.flags.map((flag) => flag.key)),
    );
    const unsorted = flags
      .filter((flag) => !groupedKeys.has(flag.key))
      .sort((left, right) => left.key.localeCompare(right.key));

    if (unsorted.length > 0) {
      buckets.push({ title: "Unsortiert", flags: unsorted });
    }

    return buckets;
  }, [flags]);

  // Flag aktivieren/deaktivieren
  const handleToggle = async (flagKey: string, newValue: boolean) => {
    setUpdatingKey(flagKey);
    const supabase = createClient();

    const { error } = await supabase
      .from("feature_flags")
      .update({ enabled: newValue })
      .eq("key", flagKey);

    if (error) {
      toast.error(`Fehler beim Aktualisieren von "${flagKey}".`);
      setUpdatingKey(null);
      return;
    }

    // Cache invalidieren und lokalen State aktualisieren
    invalidateFlagCache();
    setFlags((prev) =>
      prev.map((f) => (f.key === flagKey ? { ...f, enabled: newValue } : f)),
    );
    toast.success(
      `"${flagKey}" wurde ${newValue ? "aktiviert" : "deaktiviert"}.`,
    );
    setUpdatingKey(null);
  };

  // Ladezustand
  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <Settings2 className="h-5 w-5 text-quartier-green" />
            <h2 className="text-lg font-semibold text-anthrazit">
              Feature-Flags Verwaltung
            </h2>
          </div>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4"
              data-testid="flag-skeleton"
            >
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-48 flex-1" />
              <Skeleton className="h-5 w-10" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // Keine Flags vorhanden
  if (flags.length === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Settings2 className="h-5 w-5 text-quartier-green" />
            <h2 className="text-lg font-semibold text-anthrazit">
              Feature-Flags Verwaltung
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Keine Feature-Flags vorhanden.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Settings2 className="h-5 w-5 text-quartier-green" />
          <h2 className="text-lg font-semibold text-anthrazit">
            Feature-Flags Verwaltung
          </h2>
        </div>

        <div className="space-y-6" data-testid="flag-table">
          {groupedFlags.map((group) => (
            <section key={group.title} className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-anthrazit">
                  {group.title}
                </h3>
                <Badge variant="secondary" className="text-[10px]">
                  {group.flags.length}
                </Badge>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border/70">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                      <th className="px-3 py-2 pr-4 font-medium">Flag Key</th>
                      <th className="px-3 py-2 pr-4 font-medium">
                        Beschreibung
                      </th>
                      <th className="px-3 py-2 pr-4 font-medium">Aktiv</th>
                      <th className="px-3 py-2 pr-4 font-medium">Rollen</th>
                      <th className="px-3 py-2 font-medium">Plaene</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.flags.map((flag) => (
                      <tr key={flag.key} className="border-b last:border-0">
                        <td className="px-3 py-3 pr-4 font-mono text-xs text-anthrazit">
                          {flag.key}
                        </td>
                        <td className="px-3 py-3 pr-4 text-xs text-muted-foreground">
                          {FLAG_DESCRIPTIONS[flag.key] ?? "—"}
                        </td>
                        <td className="px-3 py-3 pr-4">
                          <div className="flex flex-col items-start gap-2">
                            <Switch
                              checked={flag.enabled}
                              disabled={updatingKey === flag.key}
                              onCheckedChange={(val) =>
                                handleToggle(flag.key, val)
                              }
                              aria-label={`${flag.key} ${flag.enabled ? "deaktivieren" : "aktivieren"}`}
                            />
                            {flag.admin_override ? (
                              <Badge
                                variant="secondary"
                                className="text-[10px]"
                              >
                                Admin-Override
                              </Badge>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-3 pr-4">
                          <div className="flex flex-wrap gap-1">
                            {flag.required_roles.length > 0 ? (
                              flag.required_roles.map((role) => (
                                <Badge
                                  key={role}
                                  variant="secondary"
                                  className="text-[10px]"
                                >
                                  {role}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                alle
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1">
                            {flag.required_plans.length > 0 ? (
                              flag.required_plans.map((plan) => (
                                <Badge
                                  key={plan}
                                  variant="secondary"
                                  className="text-[10px] bg-quartier-green/10 text-quartier-green border-quartier-green/20"
                                >
                                  {plan}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                alle
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
