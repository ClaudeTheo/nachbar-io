"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { searchAddress, type AddressSuggestion } from "@/lib/geo/photon-client";
import { Search } from "lucide-react";

const PILOT_STREET_SUGGESTIONS: AddressSuggestion[] = [
  {
    street: "Purkersdorfer Straße",
    postalCode: "79713",
    city: "Bad Säckingen",
    state: "Baden-Württemberg",
    country: "DE",
    lat: 47.5535,
    lng: 7.964,
    displayText: "Purkersdorfer Straße, 79713 Bad Säckingen",
  },
  {
    street: "Sanarystraße",
    postalCode: "79713",
    city: "Bad Säckingen",
    state: "Baden-Württemberg",
    country: "DE",
    lat: 47.553,
    lng: 7.966,
    displayText: "Sanarystraße, 79713 Bad Säckingen",
  },
  {
    street: "Oberer Rebberg",
    postalCode: "79713",
    city: "Bad Säckingen",
    state: "Baden-Württemberg",
    country: "DE",
    lat: 47.552,
    lng: 7.966,
    displayText: "Oberer Rebberg, 79713 Bad Säckingen",
  },
];

function normalizeStreetQuery(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll("ß", "ss")
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replace(/[\s.-]/g, "");
}

function findPilotStreetSuggestions(query: string) {
  const normalized = normalizeStreetQuery(query);
  if (!normalized) return [];

  return PILOT_STREET_SUGGESTIONS.filter((suggestion) =>
    normalizeStreetQuery(suggestion.street).startsWith(normalized),
  );
}

function mergeSuggestions(
  localSuggestions: AddressSuggestion[],
  remoteSuggestions: AddressSuggestion[],
) {
  const seen = new Set<string>();
  return [...localSuggestions, ...remoteSuggestions].filter((suggestion) => {
    const key = `${suggestion.street}|${suggestion.postalCode}|${suggestion.city}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

interface AddressAutocompleteProps {
  onSelect: (address: AddressSuggestion) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function AddressAutocomplete({
  onSelect,
  placeholder = "Adresse eingeben...",
  className = "",
  disabled = false,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const latestQueryRef = useRef(query);
  const handleChangeRef = useRef<(value: string) => void>(() => undefined);
  const pilotSuggestionsForQuery = findPilotStreetSuggestions(query);
  const displayedSuggestions = mergeSuggestions(
    pilotSuggestionsForQuery,
    suggestions,
  );
  const hasDisplayedSuggestions = displayedSuggestions.length > 0;
  const shouldShowSuggestions =
    (isOpen || pilotSuggestionsForQuery.length > 0) && hasDisplayedSuggestions;

  // Klick ausserhalb schliesst Dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    const pilotSuggestions = findPilotStreetSuggestions(q);
    if (q.length < 3) {
      setSuggestions(pilotSuggestions);
      setIsOpen(pilotSuggestions.length > 0);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const results = await searchAddress(q, "de", 5, "DE");
      const merged = mergeSuggestions(pilotSuggestions, results);
      setSuggestions(merged);
      setIsOpen(merged.length > 0);
      setSelectedIndex(-1);
    } catch {
      setError(
        "Adresssuche vorübergehend nicht verfügbar, bitte versuche es gleich nochmal.",
      );
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const pilotSuggestions = findPilotStreetSuggestions(value);
    setSuggestions(pilotSuggestions);
    setIsOpen(pilotSuggestions.length > 0);
    setSelectedIndex(-1);
    setError(null);

    if (value.trim().length >= 3) {
      debounceRef.current = setTimeout(() => doSearch(value), 300);
    } else {
      setIsLoading(false);
    }
  };
  latestQueryRef.current = query;
  handleChangeRef.current = handleChange;

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const currentValue = inputRef.current?.value ?? "";
      if (
        document.activeElement === inputRef.current &&
        currentValue !== latestQueryRef.current
      ) {
        handleChangeRef.current(currentValue);
      }
    }, 150);

    return () => window.clearInterval(intervalId);
  }, []);

  const handleSelect = (suggestion: AddressSuggestion) => {
    setQuery(suggestion.displayText);
    setSuggestions([]);
    setIsOpen(false);
    setError(null);
    onSelect(suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!shouldShowSuggestions) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        Math.min(prev + 1, displayedSuggestions.length - 1),
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(displayedSuggestions[selectedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key.length === 1 || e.key === "Backspace" || e.key === "Delete") {
      handleChange(e.currentTarget.value);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onInput={(e) => handleChange(e.currentTarget.value)}
          onKeyUp={handleKeyUp}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg
                     text-base focus:outline-none focus:ring-2 focus:ring-[#4CAF87]
                     focus:border-transparent disabled:opacity-50
                     min-h-[52px]"
          role="combobox"
          aria-expanded={shouldShowSuggestions}
          aria-controls="address-autocomplete-listbox"
          aria-haspopup="listbox"
          aria-autocomplete="list"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 border-2 border-[#4CAF87] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {error && <p className="mt-1 text-sm text-amber-600">{error}</p>}

      {shouldShowSuggestions && (
        <ul
          id="address-autocomplete-listbox"
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200
                     rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          {displayedSuggestions.map((s, i) => (
            <li
              key={`${s.lat}-${s.lng}-${i}`}
              role="option"
              aria-selected={i === selectedIndex}
              className={`px-4 py-3 cursor-pointer text-sm
                ${i === selectedIndex ? "bg-gray-100" : "hover:bg-gray-50"}
                ${i > 0 ? "border-t border-gray-100" : ""}`}
              onClick={() => handleSelect(s)}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <span className="text-gray-500">{s.displayText}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
