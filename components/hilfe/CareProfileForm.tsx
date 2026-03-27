'use client';

// Nachbar Hilfe — Pflege-Profil Formular
// Pflegegrad, Pflegekasse, Versichertennummer erfassen
// Senior-Modus: 80px Touch-Targets, 4.5:1 Kontrast

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

// Bekannte Pflegekassen
const INSURANCE_OPTIONS = [
  'AOK',
  'TK',
  'Barmer',
  'DAK',
  'IKK',
  'KKH',
  'Knappschaft',
  'HEK',
  'Andere...',
] as const;

// Pflegegrade 1-5
const CARE_LEVELS = [1, 2, 3, 4, 5] as const;

export interface CareProfileData {
  care_level: number;
  insurance_name: string;
  insurance_number: string;
}

interface CareProfileFormProps {
  /** Vorhandene Profildaten zum Vorausfuellen */
  initialData?: Partial<CareProfileData>;
  /** Callback nach erfolgreichem Speichern */
  onSaved?: (data: CareProfileData) => void;
}

export function CareProfileForm({ initialData, onSaved }: CareProfileFormProps) {
  // Formular-State
  const [careLevel, setCareLevel] = useState<number>(initialData?.care_level ?? 0);
  const [insuranceName, setInsuranceName] = useState<string>(initialData?.insurance_name ?? '');
  const [customInsurance, setCustomInsurance] = useState<string>('');
  const [insuranceNumber, setInsuranceNumber] = useState<string>(initialData?.insurance_number ?? '');

  // UI-State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Pruefen, ob "Andere..." ausgewaehlt ist
  const isCustomInsurance = insuranceName === 'Andere...';

  // Effektiver Kassenname (bei "Andere..." den eigenen Wert nehmen)
  const effectiveInsuranceName = isCustomInsurance ? customInsurance.trim() : insuranceName;

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Client-seitige Validierung
    if (!careLevel || careLevel < 1 || careLevel > 5) {
      setError('Bitte waehlen Sie einen Pflegegrad (1-5).');
      return;
    }
    if (!effectiveInsuranceName) {
      setError('Bitte waehlen Sie Ihre Pflegekasse aus.');
      return;
    }
    if (!insuranceNumber.trim()) {
      setError('Bitte geben Sie Ihre Versichertennummer ein.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/hilfe/care-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          care_level: careLevel,
          insurance_name: effectiveInsuranceName,
          insurance_number: insuranceNumber.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Speichern fehlgeschlagen');
      }

      setSuccess(true);
      onSaved?.({
        care_level: careLevel,
        insurance_name: effectiveInsuranceName,
        insurance_number: insuranceNumber.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten.');
    } finally {
      setLoading(false);
    }
  }, [careLevel, effectiveInsuranceName, insuranceNumber, onSaved]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Pflegegrad */}
      <div className="space-y-2">
        <label htmlFor="care-level" className="block text-base font-medium text-[#2D3142]">
          Pflegegrad
        </label>
        <select
          id="care-level"
          value={careLevel}
          onChange={(e) => setCareLevel(Number(e.target.value))}
          className="w-full min-h-[80px] rounded-lg border border-input bg-transparent px-4 text-lg focus:border-ring focus:ring-3 focus:ring-ring/50 outline-none"
        >
          <option value={0} disabled>
            Bitte waehlen...
          </option>
          {CARE_LEVELS.map((level) => (
            <option key={level} value={level}>
              Pflegegrad {level}
            </option>
          ))}
        </select>
      </div>

      {/* Pflegekasse */}
      <div className="space-y-2">
        <label htmlFor="insurance-name" className="block text-base font-medium text-[#2D3142]">
          Pflegekasse
        </label>
        <select
          id="insurance-name"
          value={insuranceName}
          onChange={(e) => {
            setInsuranceName(e.target.value);
            if (e.target.value !== 'Andere...') {
              setCustomInsurance('');
            }
          }}
          className="w-full min-h-[80px] rounded-lg border border-input bg-transparent px-4 text-lg focus:border-ring focus:ring-3 focus:ring-ring/50 outline-none"
        >
          <option value="" disabled>
            Bitte waehlen...
          </option>
          {INSURANCE_OPTIONS.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* Eigene Pflegekasse (nur bei "Andere...") */}
      {isCustomInsurance && (
        <div className="space-y-2">
          <label htmlFor="custom-insurance" className="block text-base font-medium text-[#2D3142]">
            Name Ihrer Pflegekasse
          </label>
          <Input
            id="custom-insurance"
            value={customInsurance}
            onChange={(e) => setCustomInsurance(e.target.value)}
            placeholder="z.B. Debeka, Bahn-BKK..."
            className="min-h-[80px] text-lg px-4"
          />
        </div>
      )}

      {/* Versichertennummer */}
      <div className="space-y-2">
        <label htmlFor="insurance-number" className="block text-base font-medium text-[#2D3142]">
          Versichertennummer
        </label>
        <Input
          id="insurance-number"
          value={insuranceNumber}
          onChange={(e) => setInsuranceNumber(e.target.value)}
          placeholder="z.B. A123456789"
          className="min-h-[80px] text-lg px-4"
        />
      </div>

      {/* Budget-Info */}
      <Card className="border-[#4CAF87]/30 bg-[#4CAF87]/5">
        <CardContent>
          <div className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden="true">💶</span>
            <div>
              <p className="text-base font-medium text-[#2D3142]">
                Entlastungsbetrag: <strong>131 EUR</strong> / Monat
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Ab Pflegegrad 1 steht Ihnen ein monatlicher Entlastungsbetrag von 131 EUR zu.
                Dieser kann fuer haushaltsnahe Dienstleistungen und Alltagsbegleitung genutzt werden.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Datenschutz-Hinweis */}
      <p className="text-sm text-muted-foreground">
        🔒 Daten nur fuer PDF-Quittung, nie an Dritte weitergegeben.
      </p>

      {/* Fehlermeldung */}
      {error && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Erfolgsmeldung */}
      {success && (
        <div role="status" className="rounded-lg bg-green-50 border border-[#4CAF87]/30 p-4 text-sm text-[#2D3142]">
          Ihr Pflege-Profil wurde erfolgreich gespeichert.
        </div>
      )}

      {/* Speichern-Button */}
      <Button
        type="submit"
        disabled={loading}
        className="w-full min-h-[80px] text-lg font-medium bg-[#4CAF87] hover:bg-[#4CAF87]/90 text-white"
      >
        {loading ? 'Wird gespeichert...' : 'Speichern'}
      </Button>
    </form>
  );
}
