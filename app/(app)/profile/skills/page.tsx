"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Eye, EyeOff, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useQuarter } from "@/lib/quarters";
import { SKILL_CATEGORIES } from "@/lib/constants";
import type { Skill } from "@/lib/supabase/types";

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const { currentQuarter } = useQuarter();
  const [adding, setAdding] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data } = await supabase
        .from("skills")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (data) setSkills(data as Skill[]);
    }
    load();
  }, []);

  async function handleAdd() {
    if (!selectedCategory || !userId) return;
    setSaving(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("skills")
        .insert({
          user_id: userId,
          quarter_id: currentQuarter?.id,
          category: selectedCategory,
          description: description.trim() || null,
          is_public: true,
        })
        .select()
        .single();

      if (error) {
        console.error("Skill-Fehler:", error);
        setSaving(false);
        return;
      }

      if (data) setSkills((prev) => [data as Skill, ...prev]);
      setAdding(false);
      setSelectedCategory(null);
      setDescription("");
    } catch {
      console.error("Netzwerkfehler");
    }
    setSaving(false);
  }

  async function handleDelete(skillId: string) {
    const supabase = createClient();
    await supabase.from("skills").delete().eq("id", skillId);
    setSkills((prev) => prev.filter((s) => s.id !== skillId));
  }

  async function toggleVisibility(skill: Skill) {
    const supabase = createClient();
    await supabase
      .from("skills")
      .update({ is_public: !skill.is_public })
      .eq("id", skill.id);
    setSkills((prev) =>
      prev.map((s) => (s.id === skill.id ? { ...s, is_public: !s.is_public } : s))
    );
  }

  // Kategorien, die der Nutzer schon hat
  const existingCategories = new Set(skills.map((s) => s.category));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/profile" className="rounded-lg p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-anthrazit">Meine Kompetenzen</h1>
      </div>

      <p className="text-sm text-muted-foreground">
        Teilen Sie Ihre Fähigkeiten mit der Nachbarschaft. Andere können Sie bei
        passenden Hilfeanfragen finden.
      </p>

      {/* Experten-Hinweis */}
      <Link
        href="/experts"
        className="flex items-center gap-3 rounded-xl border border-quartier-green/30 bg-quartier-green/5 p-4 hover:bg-quartier-green/10 transition-colors"
      >
        <span className="text-2xl">⭐</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-anthrazit">
            Im Experten-Verzeichnis sichtbar
          </p>
          <p className="text-xs text-muted-foreground">
            Ihre öffentlichen Kompetenzen erscheinen automatisch im Experten-Verzeichnis.
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-quartier-green shrink-0" />
      </Link>

      {/* Vorhandene Skills */}
      {skills.length === 0 && !adding ? (
        <div className="rounded-lg border-2 border-dashed border-muted p-8 text-center">
          <p className="text-muted-foreground">
            Sie haben noch keine Kompetenzen hinterlegt.
          </p>
          <Button
            onClick={() => setAdding(true)}
            variant="outline"
            className="mt-3"
          >
            <Plus className="mr-2 h-4 w-4" />
            Kompetenz hinzufügen
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {skills.map((skill) => {
            const cat = SKILL_CATEGORIES.find((c) => c.id === skill.category);
            return (
              <div
                key={skill.id}
                className="flex items-start gap-3 rounded-lg border border-border bg-white p-4"
              >
                <span className="text-2xl">{cat?.icon ?? "❓"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-anthrazit">
                      {cat?.label ?? skill.category}
                    </h3>
                    <Badge variant={skill.is_public ? "default" : "outline"} className="text-xs">
                      {skill.is_public ? "Sichtbar" : "Privat"}
                    </Badge>
                  </div>
                  {skill.description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {skill.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => toggleVisibility(skill)}
                    className="rounded-lg p-2 hover:bg-muted"
                    title={skill.is_public ? "Privat machen" : "Sichtbar machen"}
                  >
                    {skill.is_public ? (
                      <Eye className="h-4 w-4 text-quartier-green" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(skill.id)}
                    className="rounded-lg p-2 hover:bg-red-50"
                    title="Löschen"
                  >
                    <Trash2 className="h-4 w-4 text-emergency-red" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Neue Kompetenz hinzufügen */}
      {adding ? (
        <div className="space-y-4 rounded-xl border-2 border-quartier-green bg-quartier-green/5 p-4">
          <h3 className="font-semibold text-anthrazit">Neue Kompetenz</h3>

          <div className="flex flex-wrap gap-2">
            {SKILL_CATEGORIES.filter((c) => !existingCategories.has(c.id)).map(
              (cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    selectedCategory === cat.id
                      ? "bg-quartier-green text-white"
                      : "bg-white text-anthrazit border border-border hover:border-quartier-green"
                  }`}
                >
                  {cat.icon} {cat.label}
                </button>
              )
            )}
          </div>

          {selectedCategory && (
            <>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Beschreibung (optional) — z.B. 'Elektriker, 20 Jahre Erfahrung'"
                rows={2}
                maxLength={200}
              />
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setAdding(false);
                    setSelectedCategory(null);
                    setDescription("");
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={handleAdd}
                  disabled={saving}
                  className="flex-1 bg-quartier-green hover:bg-quartier-green-dark"
                >
                  {saving ? "Speichern..." : "Hinzufügen"}
                </Button>
              </div>
            </>
          )}
        </div>
      ) : (
        skills.length > 0 && (
          <Button
            onClick={() => setAdding(true)}
            variant="outline"
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Weitere Kompetenz hinzufügen
          </Button>
        )
      )}
    </div>
  );
}
