"use client";

// Notfallmappe Formular — 3 Ebenen nach DRK-Vorbild
// Level 1: Notfalldose (Pflicht), Level 2: Vorsorge, Level 3: Erweitert
// Alle Daten werden vor DB-Schreibvorgang AES-256-GCM verschluesselt

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Save,
  Loader2,
  Heart,
  FileText,
  Settings,
  AlertTriangle,
} from "lucide-react";
import type { Level1Data, Level2Data, Level3Data } from "./types";
import {
  EMPTY_LEVEL1,
  EMPTY_LEVEL2,
  EMPTY_LEVEL3,
  BLOOD_TYPE_OPTIONS,
  ORGAN_DONATION_OPTIONS,
} from "./types";

// Tab-Definitionen
const TABS = [
  { key: "level1", label: "Notfalldose", icon: Heart },
  { key: "level2", label: "Vorsorge", icon: FileText },
  { key: "level3", label: "Erweitert", icon: Settings },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// Formular-Feld-Stile (wiederverwendbar)
const INPUT_CLASS =
  "w-full rounded-lg border border-gray-300 px-3 py-3 text-base text-[#2D3142] focus:border-[#4CAF87] focus:outline-none focus:ring-1 focus:ring-[#4CAF87]";
const LABEL_CLASS = "block text-sm font-medium text-gray-600 mb-1.5";
const SECTION_CLASS = "space-y-4";

interface EmergencyProfileFormProps {
  userId: string;
  /** Wenn gesetzt, werden initiale Daten uebergeben (z.B. vom Pflegedienst) */
  initialLevel1?: Level1Data;
  initialLevel2?: Level2Data;
  initialLevel3?: Level3Data;
  onSaved?: () => void;
}

export function EmergencyProfileForm({
  userId,
  initialLevel1,
  initialLevel2,
  initialLevel3,
  onSaved,
}: EmergencyProfileFormProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("level1");
  const [level1, setLevel1] = useState<Level1Data>(
    initialLevel1 ?? { ...EMPTY_LEVEL1 },
  );
  const [level2, setLevel2] = useState<Level2Data>(
    initialLevel2 ?? { ...EMPTY_LEVEL2 },
  );
  const [level3, setLevel3] = useState<Level3Data>(
    initialLevel3 ?? { ...EMPTY_LEVEL3 },
  );
  const [loading, setLoading] = useState(!initialLevel1);
  const [saving, setSaving] = useState(false);
  const [profileExists, setProfileExists] = useState(false);

  // Profil laden, falls keine Initialdaten uebergeben
  useEffect(() => {
    if (initialLevel1) {
      return;
    }

    async function loadProfile() {
      try {
        const res = await fetch(`/api/care/emergency-profile?userId=${userId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.level1) setLevel1(data.level1);
          if (data.level2) setLevel2(data.level2);
          if (data.level3) setLevel3(data.level3);
          setProfileExists(true);
        }
      } catch {
        // Kein Profil vorhanden — Defaults belassen
      }
      setLoading(false);
    }

    loadProfile();
  }, [userId, initialLevel1]);

  // Auto-Save bei Tab-Wechsel
  const saveProfile = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/care/emergency-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          level1,
          level2,
          level3,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Fehler beim Speichern");
        setSaving(false);
        return false;
      }

      setProfileExists(true);
      setSaving(false);
      return true;
    } catch {
      toast.error("Verbindungsfehler");
      setSaving(false);
      return false;
    }
  }, [userId, level1, level2, level3]);

  function handleTabSwitch(tab: TabKey) {
    // Auto-Save beim Wechsel, wenn Level 1 mindestens Name hat
    if (level1.fullName.trim()) {
      saveProfile();
    }
    setActiveTab(tab);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validierung: Level 1 Pflichtfelder
    if (!level1.fullName.trim()) {
      toast.error("Bitte geben Sie Ihren vollstaendigen Namen ein.");
      setActiveTab("level1");
      return;
    }
    if (!level1.dateOfBirth) {
      toast.error("Bitte geben Sie Ihr Geburtsdatum ein.");
      setActiveTab("level1");
      return;
    }

    const success = await saveProfile();
    if (success) {
      toast.success(
        profileExists ? "Notfallmappe aktualisiert" : "Notfallmappe erstellt",
      );
      if (onSaved) onSaved();
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Notfall-Disclaimer */}
      <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
        <p className="text-sm text-red-700">
          Dies ist <strong>KEIN Ersatz</strong> fuer eine aerztliche
          Notfallversorgung. Bei Notfaellen rufen Sie{" "}
          <strong className="text-red-900">112</strong>.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabSwitch(tab.key)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-white text-[#2D3142] shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              style={{ minHeight: "48px" }}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab-Inhalte */}
      {activeTab === "level1" && (
        <Level1Form level1={level1} onChange={setLevel1} />
      )}
      {activeTab === "level2" && (
        <Level2Form level2={level2} onChange={setLevel2} />
      )}
      {activeTab === "level3" && (
        <Level3Form level3={level3} onChange={setLevel3} />
      )}

      {/* DSGVO-Hinweis */}
      <div className="rounded-xl bg-[#4CAF87]/10 p-4 text-sm text-[#2D3142]">
        <p className="font-medium">Datenschutz (DSGVO Art. 9)</p>
        <p className="mt-1 text-gray-500">
          Ihre Notfalldaten werden mit AES-256-GCM verschluesselt gespeichert.
          Nur Sie und Ihre berechtigten Helfer haben Zugriff.
        </p>
      </div>

      {/* Speichern-Button */}
      <button
        type="submit"
        disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#4CAF87] px-6 py-4 text-lg font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ minHeight: "80px" }}
      >
        {saving ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin" />
            Wird gespeichert...
          </>
        ) : (
          <>
            <Save className="h-6 w-6" />
            Notfallmappe speichern
          </>
        )}
      </button>
    </form>
  );
}

// --- Level 1: Notfalldose ---
function Level1Form({
  level1,
  onChange,
}: {
  level1: Level1Data;
  onChange: (data: Level1Data) => void;
}) {
  function update<K extends keyof Level1Data>(key: K, value: Level1Data[K]) {
    onChange({ ...level1, [key]: value });
  }

  function updateContact(
    contactKey: "emergencyContact1" | "emergencyContact2",
    field: "name" | "phone" | "relation",
    value: string,
  ) {
    onChange({
      ...level1,
      [contactKey]: { ...level1[contactKey], [field]: value },
    });
  }

  return (
    <div className={SECTION_CLASS}>
      <h2 className="text-lg font-semibold text-[#2D3142]">
        Notfalldose — Lebenswichtige Daten
      </h2>

      <div>
        <label className={LABEL_CLASS}>Vollstaendiger Name *</label>
        <input
          type="text"
          value={level1.fullName}
          onChange={(e) => update("fullName", e.target.value)}
          className={INPUT_CLASS}
          placeholder="Max Mustermann"
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL_CLASS}>Geburtsdatum *</label>
          <input
            type="date"
            value={level1.dateOfBirth}
            onChange={(e) => update("dateOfBirth", e.target.value)}
            className={INPUT_CLASS}
            required
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Blutgruppe</label>
          <select
            value={level1.bloodType}
            onChange={(e) => update("bloodType", e.target.value)}
            className={INPUT_CLASS}
          >
            {BLOOD_TYPE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt || "Bitte waehlen..."}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={LABEL_CLASS}>Allergien / Unvertraeglichkeiten</label>
        <textarea
          value={level1.allergies}
          onChange={(e) => update("allergies", e.target.value)}
          className={INPUT_CLASS}
          rows={2}
          placeholder="z.B. Penicillin, Latex, Erdnuesse..."
        />
      </div>

      <div>
        <label className={LABEL_CLASS}>Aktuelle Medikamente</label>
        <textarea
          value={level1.medications}
          onChange={(e) => update("medications", e.target.value)}
          className={INPUT_CLASS}
          rows={2}
          placeholder="z.B. Metoprolol 50mg morgens, Aspirin 100mg..."
        />
      </div>

      <div>
        <label className={LABEL_CLASS}>Erkrankungen / Diagnosen</label>
        <textarea
          value={level1.conditions}
          onChange={(e) => update("conditions", e.target.value)}
          className={INPUT_CLASS}
          rows={2}
          placeholder="z.B. Diabetes Typ 2, Bluthochdruck..."
        />
      </div>

      <div>
        <label className={LABEL_CLASS}>Implantate / Prothesen</label>
        <textarea
          value={level1.implants}
          onChange={(e) => update("implants", e.target.value)}
          className={INPUT_CLASS}
          rows={2}
          placeholder="z.B. Herzschrittmacher, Hueftgelenk rechts..."
        />
      </div>

      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={level1.patientenverfuegung}
          onChange={(e) => update("patientenverfuegung", e.target.checked)}
          className="h-6 w-6 rounded border-gray-300 text-[#4CAF87] focus:ring-[#4CAF87]"
        />
        <span className="text-base text-[#2D3142]">
          Patientenverfuegung vorhanden
        </span>
      </label>

      {/* Notfallkontakte */}
      <h3 className="mt-6 text-base font-semibold text-[#2D3142]">
        Notfallkontakte
      </h3>

      {(["emergencyContact1", "emergencyContact2"] as const).map(
        (contactKey, idx) => (
          <div
            key={contactKey}
            className="space-y-3 rounded-xl border border-gray-200 bg-white p-4"
          >
            <span className="text-sm font-medium text-gray-500">
              Kontakt {idx + 1}
            </span>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input
                type="text"
                value={level1[contactKey].name}
                onChange={(e) =>
                  updateContact(contactKey, "name", e.target.value)
                }
                className={INPUT_CLASS}
                placeholder="Name"
              />
              <input
                type="tel"
                value={level1[contactKey].phone}
                onChange={(e) =>
                  updateContact(contactKey, "phone", e.target.value)
                }
                className={INPUT_CLASS}
                placeholder="Telefon"
              />
              <input
                type="text"
                value={level1[contactKey].relation}
                onChange={(e) =>
                  updateContact(contactKey, "relation", e.target.value)
                }
                className={INPUT_CLASS}
                placeholder="Beziehung (z.B. Tochter)"
              />
            </div>
          </div>
        ),
      )}
    </div>
  );
}

// --- Level 2: Vorsorge ---
function Level2Form({
  level2,
  onChange,
}: {
  level2: Level2Data;
  onChange: (data: Level2Data) => void;
}) {
  function update<K extends keyof Level2Data>(key: K, value: Level2Data[K]) {
    onChange({ ...level2, [key]: value });
  }

  return (
    <div className={SECTION_CLASS}>
      <h2 className="text-lg font-semibold text-[#2D3142]">
        Vorsorge-Dokumente
      </h2>

      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={level2.vorsorgevollmacht}
          onChange={(e) => update("vorsorgevollmacht", e.target.checked)}
          className="h-6 w-6 rounded border-gray-300 text-[#4CAF87] focus:ring-[#4CAF87]"
        />
        <span className="text-base text-[#2D3142]">
          Vorsorgevollmacht vorhanden
        </span>
      </label>
      {level2.vorsorgevollmacht && (
        <div>
          <label className={LABEL_CLASS}>Aufbewahrungsort</label>
          <input
            type="text"
            value={level2.vorsorgevollmachtLocation}
            onChange={(e) =>
              update("vorsorgevollmachtLocation", e.target.value)
            }
            className={INPUT_CLASS}
            placeholder="z.B. Schublade im Wohnzimmer, Notar Dr. Mueller..."
          />
        </div>
      )}

      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={level2.betreuungsverfuegung}
          onChange={(e) => update("betreuungsverfuegung", e.target.checked)}
          className="h-6 w-6 rounded border-gray-300 text-[#4CAF87] focus:ring-[#4CAF87]"
        />
        <span className="text-base text-[#2D3142]">
          Betreuungsverfuegung vorhanden
        </span>
      </label>
      {level2.betreuungsverfuegung && (
        <div>
          <label className={LABEL_CLASS}>Aufbewahrungsort</label>
          <input
            type="text"
            value={level2.betreuungsverfuegungLocation}
            onChange={(e) =>
              update("betreuungsverfuegungLocation", e.target.value)
            }
            className={INPUT_CLASS}
            placeholder="z.B. beim Amtsgericht hinterlegt..."
          />
        </div>
      )}

      <div>
        <label className={LABEL_CLASS}>Organspende</label>
        <select
          value={level2.organspende}
          onChange={(e) =>
            update("organspende", e.target.value as Level2Data["organspende"])
          }
          className={INPUT_CLASS}
        >
          {ORGAN_DONATION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      {level2.organspende === "eingeschraenkt" && (
        <div>
          <label className={LABEL_CLASS}>Einschraenkungen</label>
          <textarea
            value={level2.organspendeDetails}
            onChange={(e) => update("organspendeDetails", e.target.value)}
            className={INPUT_CLASS}
            rows={2}
            placeholder="Welche Organe/Gewebe sind ausgeschlossen?"
          />
        </div>
      )}

      <div>
        <label className={LABEL_CLASS}>Bestattungswunsch</label>
        <textarea
          value={level2.bestattungswunsch}
          onChange={(e) => update("bestattungswunsch", e.target.value)}
          className={INPUT_CLASS}
          rows={2}
          placeholder="z.B. Erdbestattung, Kremation, Seebestattung..."
        />
      </div>
    </div>
  );
}

// --- Level 3: Erweitert ---
function Level3Form({
  level3,
  onChange,
}: {
  level3: Level3Data;
  onChange: (data: Level3Data) => void;
}) {
  function update<K extends keyof Level3Data>(key: K, value: Level3Data[K]) {
    onChange({ ...level3, [key]: value });
  }

  return (
    <div className={SECTION_CLASS}>
      <h2 className="text-lg font-semibold text-[#2D3142]">
        Erweiterte Informationen
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL_CLASS}>Krankenkasse</label>
          <input
            type="text"
            value={level3.insuranceName}
            onChange={(e) => update("insuranceName", e.target.value)}
            className={INPUT_CLASS}
            placeholder="z.B. AOK Baden-Wuerttemberg"
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Versichertennummer</label>
          <input
            type="text"
            value={level3.insuranceNumber}
            onChange={(e) => update("insuranceNumber", e.target.value)}
            className={INPUT_CLASS}
            placeholder="z.B. A123456789"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL_CLASS}>Pflegegrad (0-5)</label>
          <input
            type="number"
            min={0}
            max={5}
            value={level3.pflegegrad}
            onChange={(e) =>
              update("pflegegrad", parseInt(e.target.value) || 0)
            }
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Grad der Behinderung (GdB)</label>
          <input
            type="number"
            min={0}
            max={100}
            step={10}
            value={level3.behinderungsgrad}
            onChange={(e) =>
              update("behinderungsgrad", parseInt(e.target.value) || 0)
            }
            className={INPUT_CLASS}
          />
        </div>
      </div>

      <div>
        <label className={LABEL_CLASS}>Hilfsmittel</label>
        <textarea
          value={level3.hilfsmittel}
          onChange={(e) => update("hilfsmittel", e.target.value)}
          className={INPUT_CLASS}
          rows={2}
          placeholder="z.B. Rollator, Hoergeraet, Sauerstoffgeraet..."
        />
      </div>

      <div>
        <label className={LABEL_CLASS}>Schluessel-Standort</label>
        <input
          type="text"
          value={level3.schluesselStandort}
          onChange={(e) => update("schluesselStandort", e.target.value)}
          className={INPUT_CLASS}
          placeholder="z.B. unter der Fussmatte, beim Nachbarn Herr Mueller..."
        />
      </div>

      <div>
        <label className={LABEL_CLASS}>Haustiere</label>
        <input
          type="text"
          value={level3.haustiere}
          onChange={(e) => update("haustiere", e.target.value)}
          className={INPUT_CLASS}
          placeholder="z.B. Katze (Minka), Hund (Bello)..."
        />
      </div>

      <div>
        <label className={LABEL_CLASS}>Sonstige Hinweise</label>
        <textarea
          value={level3.sonstigeHinweise}
          onChange={(e) => update("sonstigeHinweise", e.target.value)}
          className={INPUT_CLASS}
          rows={3}
          placeholder="Weitere Informationen fuer den Notfall..."
        />
      </div>
    </div>
  );
}
