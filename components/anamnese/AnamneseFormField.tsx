"use client";

// Nachbar.io — Einzelnes Anamnese-Formularfeld
// Rendert verschiedene Feldtypen dynamisch
// Senior-Mode: Grosse Targets (min 48px), klare Labels

interface AnamnesisField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
  min?: number;
  max?: number;
}

interface Props {
  field: AnamnesisField;
  value: string | string[] | number | boolean | null | undefined;
  onChange: (value: string | string[] | number | boolean | null) => void;
  error?: string;
}

export default function AnamneseFormField({
  field,
  value,
  onChange,
  error,
}: Props) {
  const labelId = `field-${field.id}`;
  const hasError = !!error;
  const borderClass = hasError
    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
    : "border-gray-300 focus:border-[#4CAF87] focus:ring-[#4CAF87]";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      {/* Label */}
      <label
        htmlFor={labelId}
        className="block text-base font-medium text-[#2D3142]"
      >
        {field.label}
        {field.required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {/* Feld je nach Typ */}
      <div className="mt-3">
        {field.type === "text" && (
          <input
            id={labelId}
            type="text"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || ""}
            className={`w-full rounded-lg border px-4 py-3 text-base text-[#2D3142] placeholder:text-gray-400 focus:outline-none focus:ring-1 ${borderClass}`}
          />
        )}

        {field.type === "textarea" && (
          <textarea
            id={labelId}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || ""}
            rows={4}
            className={`w-full rounded-lg border px-4 py-3 text-base text-[#2D3142] placeholder:text-gray-400 focus:outline-none focus:ring-1 ${borderClass}`}
          />
        )}

        {field.type === "select" && field.options && (
          <select
            id={labelId}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full rounded-lg border px-4 py-3 text-base text-[#2D3142] focus:outline-none focus:ring-1 ${borderClass}`}
          >
            <option value="">Bitte waehlen...</option>
            {field.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        )}

        {field.type === "multiselect" && field.options && (
          <div className="space-y-2">
            {field.options.map((opt) => {
              const selected = Array.isArray(value) && value.includes(opt);
              return (
                <label
                  key={opt}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                    selected
                      ? "border-[#4CAF87] bg-[#4CAF87]/5"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => {
                      const current = Array.isArray(value) ? value : [];
                      if (selected) {
                        onChange(current.filter((v) => v !== opt));
                      } else {
                        onChange([...current, opt]);
                      }
                    }}
                    className="h-5 w-5 rounded border-gray-300 text-[#4CAF87] focus:ring-[#4CAF87]"
                  />
                  <span className="text-base text-[#2D3142]">{opt}</span>
                </label>
              );
            })}
          </div>
        )}

        {field.type === "boolean" && (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => onChange(true)}
              className={`flex-1 rounded-xl border-2 px-6 py-4 text-lg font-medium transition-colors ${
                value === true
                  ? "border-[#4CAF87] bg-[#4CAF87]/10 text-[#4CAF87]"
                  : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
              }`}
              style={{ minHeight: "56px" }}
            >
              Ja
            </button>
            <button
              type="button"
              onClick={() => onChange(false)}
              className={`flex-1 rounded-xl border-2 px-6 py-4 text-lg font-medium transition-colors ${
                value === false
                  ? "border-red-400 bg-red-50 text-red-600"
                  : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
              }`}
              style={{ minHeight: "56px" }}
            >
              Nein
            </button>
          </div>
        )}

        {field.type === "date" && (
          <input
            id={labelId}
            type="date"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full rounded-lg border px-4 py-3 text-base text-[#2D3142] focus:outline-none focus:ring-1 ${borderClass}`}
          />
        )}

        {field.type === "number" && (
          <input
            id={labelId}
            type="number"
            value={value !== null && value !== undefined ? Number(value) : ""}
            onChange={(e) =>
              onChange(e.target.value ? Number(e.target.value) : null)
            }
            min={field.min}
            max={field.max}
            placeholder={field.placeholder || ""}
            className={`w-full rounded-lg border px-4 py-3 text-base text-[#2D3142] placeholder:text-gray-400 focus:outline-none focus:ring-1 ${borderClass}`}
          />
        )}

        {field.type === "scale" && (
          <div>
            <div className="mb-2 flex items-center justify-between text-sm text-gray-500">
              <span>{field.min ?? 0}</span>
              <span className="text-lg font-semibold text-[#2D3142]">
                {value !== null && value !== undefined ? value : "\u2013"}
              </span>
              <span>{field.max ?? 10}</span>
            </div>
            <input
              id={labelId}
              type="range"
              min={field.min ?? 0}
              max={field.max ?? 10}
              step={1}
              value={Number(value ?? field.min ?? 0)}
              onChange={(e) => onChange(Number(e.target.value))}
              className="h-3 w-full appearance-none rounded-full bg-gray-200 accent-[#4CAF87]"
            />
            <div className="mt-1 flex justify-between text-xs text-gray-400">
              <span>Kein Schmerz</span>
              <span>Staerkster Schmerz</span>
            </div>
          </div>
        )}
      </div>

      {/* Fehler */}
      {hasError && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
