"use client";

import { MapPin, Loader2 } from "lucide-react";

interface AlertLocationCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  gpsLoading?: boolean;
}

export function AlertLocationCheckbox({
  checked,
  onChange,
  gpsLoading,
}: AlertLocationCheckboxProps) {
  return (
    <label
      className="flex items-center gap-2 cursor-pointer"
      htmlFor="share-location"
    >
      <input
        id="share-location"
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-quartier-green focus:ring-quartier-green"
        aria-label="Standort teilen"
      />
      <MapPin className="h-4 w-4 text-muted-foreground" />
      {gpsLoading ? (
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Standort wird ermittelt...
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">Standort teilen</span>
      )}
    </label>
  );
}
