"use client";

import { Input } from "@/components/ui/input";
import {
  RECOGNITION_NOTICE,
  RECOGNITION_OPTIONS,
  type HelpRecognitionType,
} from "@/modules/hilfe/services/compensation";

interface CompensationSelectorValue {
  recognition_type: HelpRecognitionType;
  suggested_recognition_cents: number | null;
}

interface CompensationSelectorProps {
  value: CompensationSelectorValue;
  onChange: (value: CompensationSelectorValue) => void;
  disabledTypes?: HelpRecognitionType[];
}

export function CompensationSelector({
  value,
  onChange,
  disabledTypes = [],
}: CompensationSelectorProps) {
  return (
    <section className="space-y-3 rounded-lg border border-border bg-white p-4">
      <div>
        <h2 className="text-base font-semibold text-anthrazit">
          Freiwillige Anerkennung
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Optional und freiwillig. Die App wickelt keine Zahlungen ab.
        </p>
      </div>

      <div className="grid gap-2" role="radiogroup" aria-label="Freiwillige Anerkennung">
        {RECOGNITION_OPTIONS.map((option) => {
          const disabled = disabledTypes.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={value.recognition_type === option.value}
              disabled={disabled}
              onClick={() =>
                onChange({
                  recognition_type: option.value,
                  suggested_recognition_cents:
                    option.value === "suggested_amount"
                      ? value.suggested_recognition_cents
                      : null,
                })
              }
              className={`min-h-[80px] rounded-lg border p-3 text-left transition ${
                value.recognition_type === option.value
                  ? "border-quartier-green bg-quartier-green/10"
                  : "border-border bg-white"
              } ${disabled ? "opacity-45" : "hover:border-quartier-green"}`}
            >
              <span className="block text-sm font-semibold text-anthrazit">
                {option.label}
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                {option.description}
              </span>
            </button>
          );
        })}
      </div>

      {value.recognition_type === "suggested_amount" && (
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-anthrazit">
            Wunschbetrag in Euro
          </span>
          <Input
            inputMode="decimal"
            placeholder="z.B. 10"
            value={
              value.suggested_recognition_cents
                ? String(value.suggested_recognition_cents / 100).replace(".", ",")
                : ""
            }
            onChange={(event) => {
              const normalized = event.target.value.replace(",", ".");
              const amount = Number(normalized);
              onChange({
                recognition_type: "suggested_amount",
                suggested_recognition_cents:
                  Number.isFinite(amount) && amount > 0
                    ? Math.round(amount * 100)
                    : null,
              });
            }}
          />
          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
            Kleiner Vorschlag für diese Hilfeanfrage insgesamt, nicht pro Stunde.
          </span>
        </label>
      )}

      <p className="rounded-md bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
        {RECOGNITION_NOTICE}
      </p>
    </section>
  );
}
