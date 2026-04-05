"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { LargeTitle } from "@/components/ui/LargeTitle";
import { CreateGroupForm } from "@/modules/gruppen/components/CreateGroupForm";
import type { Group } from "@/modules/gruppen/services/types";

export default function GruppeBearbeitenPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/groups/${id}`)
      .then((r) => r.json())
      .then((data: Group) => setGroup(data))
      .catch(() => setGroup(null))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!confirm("Moechten Sie diese Gruppe wirklich loeschen? Alle Beitraege und Mitgliedschaften werden entfernt.")) return;
    setDeleting(true);
    const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/gruppen");
    } else {
      setDeleting(false);
      alert("Gruppe konnte nicht geloescht werden.");
    }
  }

  if (loading) return <p className="p-4 text-center text-gray-400">Laden...</p>;
  if (!group) return <p className="p-4 text-center text-gray-400">Gruppe nicht gefunden</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <LargeTitle title="Gruppe bearbeiten" />

      <CreateGroupForm
        mode="edit"
        initialData={{
          id: group.id,
          name: group.name,
          description: group.description,
          category: group.category,
          type: group.type as "open" | "closed",
        }}
      />

      <div className="border-t border-gray-200 pt-6">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="w-full rounded-lg border border-red-300 py-3 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          {deleting ? "Wird geloescht..." : "Gruppe loeschen"}
        </button>
        <p className="mt-2 text-center text-xs text-gray-400">
          Diese Aktion kann nicht rueckgaengig gemacht werden.
        </p>
      </div>
    </div>
  );
}
