"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Home, Activity, Flower2, Baby, Heart, Music, HandHeart, MoreHorizontal } from "lucide-react";
import type { GroupCategory } from "@/modules/gruppen/services/types";
import { GROUP_CATEGORY_LABELS, GROUP_CATEGORIES } from "@/modules/gruppen/services/types";

const CATEGORY_ICONS: Record<GroupCategory, React.ElementType> = {
  nachbarschaft: Home,
  sport: Activity,
  garten: Flower2,
  kinder: Baby,
  senioren: Heart,
  kultur: Music,
  ehrenamt: HandHeart,
  sonstiges: MoreHorizontal,
};

interface CreateGroupFormProps {
  mode?: "create" | "edit";
  initialData?: {
    id: string;
    name: string;
    description: string | null;
    category: GroupCategory;
    type: "open" | "closed";
  };
}

export function CreateGroupForm({ mode = "create", initialData }: CreateGroupFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [category, setCategory] = useState<GroupCategory>(initialData?.category ?? "nachbarschaft");
  const [type, setType] = useState<"open" | "closed">(initialData?.type ?? "open");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || name.length < 3) {
      setError("Der Gruppenname muss mindestens 3 Zeichen lang sein");
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const url = mode === "edit" ? `/api/groups/${initialData!.id}` : "/api/groups";
      const method = mode === "edit" ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined, category, type }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Ein Fehler ist aufgetreten");
        return;
      }

      const group = await res.json();
      router.push(`/gruppen/${group.id}`);
    } catch {
      setError("Verbindungsfehler. Bitte versuchen Sie es erneut.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-anthrazit">
          Gruppenname *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z.B. Gartenfreunde Rebberg"
          maxLength={60}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-quartier-green focus:outline-none"
        />
        <span className="mt-1 block text-xs text-gray-400">{name.length}/60</span>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-anthrazit">
          Beschreibung
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Worum geht es in dieser Gruppe?"
          maxLength={500}
          rows={3}
          className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-quartier-green focus:outline-none"
        />
        <span className="mt-1 block text-xs text-gray-400">{description.length}/500</span>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-anthrazit">
          Kategorie *
        </label>
        <div className="grid grid-cols-2 gap-2">
          {GROUP_CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICONS[cat];
            const selected = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                  selected
                    ? "border-quartier-green bg-quartier-green/10 text-quartier-green"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {GROUP_CATEGORY_LABELS[cat]}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-anthrazit">
          Gruppentyp
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setType("open")}
            className={`flex-1 rounded-lg border px-3 py-2.5 text-sm ${
              type === "open"
                ? "border-quartier-green bg-quartier-green/10 text-quartier-green"
                : "border-gray-200 text-gray-600"
            }`}
          >
            <span className="font-medium">Offen</span>
            <p className="mt-0.5 text-xs opacity-70">Jeder kann beitreten</p>
          </button>
          <button
            type="button"
            onClick={() => setType("closed")}
            className={`flex-1 rounded-lg border px-3 py-2.5 text-sm ${
              type === "closed"
                ? "border-quartier-green bg-quartier-green/10 text-quartier-green"
                : "border-gray-200 text-gray-600"
            }`}
          >
            <span className="font-medium">Geschlossen</span>
            <p className="mt-0.5 text-xs opacity-70">Beitritt auf Anfrage</p>
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={saving || name.length < 3}
        className="w-full rounded-lg bg-quartier-green py-3 text-sm font-medium text-white hover:bg-quartier-green/90 disabled:opacity-50"
      >
        {saving ? "Wird gespeichert..." : mode === "edit" ? "Aenderungen speichern" : "Gruppe erstellen"}
      </button>
    </form>
  );
}
