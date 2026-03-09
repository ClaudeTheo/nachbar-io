"use client";

import { useState, useEffect } from "react";
import { Newspaper, Plus, Trash2, Edit, Eye, Globe, Sparkles, X, Save } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import type { NewsItem } from "@/lib/supabase/types";
import { toast } from "sonner";

const NEWS_CATEGORIES = [
  { id: "infrastructure", label: "Infrastruktur", icon: "🏗️" },
  { id: "events", label: "Veranstaltungen", icon: "📅" },
  { id: "administration", label: "Verwaltung", icon: "🏛️" },
  { id: "weather", label: "Wetter/Unwetter", icon: "🌤️" },
  { id: "waste", label: "Abfallwirtschaft", icon: "♻️" },
  { id: "traffic", label: "Verkehr", icon: "🚗" },
  { id: "community", label: "Gemeinschaft", icon: "🏘️" },
  { id: "other", label: "Sonstiges", icon: "📰" },
];

export function NewsManagement() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Formular-State
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState("other");
  const [sourceUrl, setSourceUrl] = useState("");
  const [relevance, setRelevance] = useState(7);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadNews();
  }, []);

  async function loadNews() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("news_items")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setNews(data);
    setLoading(false);
  }

  // Formular zuruecksetzen
  function resetForm() {
    setTitle("");
    setSummary("");
    setCategory("other");
    setSourceUrl("");
    setRelevance(7);
    setEditingId(null);
    setShowForm(false);
  }

  // News zum Bearbeiten laden
  function editNews(item: NewsItem) {
    setTitle(item.original_title);
    setSummary(item.ai_summary);
    setCategory(item.category);
    setSourceUrl(item.source_url ?? "");
    setRelevance(item.relevance_score);
    setEditingId(item.id);
    setShowForm(true);
  }

  // Speichern (erstellen oder aktualisieren)
  async function handleSave() {
    if (!title.trim() || !summary.trim()) {
      toast.error("Titel und Zusammenfassung sind erforderlich");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const payload = {
      original_title: title.trim(),
      ai_summary: summary.trim(),
      category,
      source_url: sourceUrl.trim() || null,
      relevance_score: relevance,
      published_at: new Date().toISOString(),
    };

    if (editingId) {
      // Aktualisieren
      const { error } = await supabase
        .from("news_items")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        toast.error("Fehler beim Aktualisieren");
      } else {
        toast.success("Nachricht aktualisiert");
        resetForm();
        loadNews();
      }
    } else {
      // Erstellen
      const { error } = await supabase
        .from("news_items")
        .insert(payload);

      if (error) {
        toast.error("Fehler beim Erstellen: " + error.message);
      } else {
        toast.success("Nachricht erstellt");
        resetForm();
        loadNews();
      }
    }
    setSaving(false);
  }

  // Loeschen
  async function deleteNews(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("news_items").delete().eq("id", id);
    if (error) {
      toast.error("Fehler beim Loeschen");
    } else {
      toast.success("Nachricht geloescht");
      setNews(prev => prev.filter(n => n.id !== id));
    }
  }

  // KI-Aggregation ausloesen
  async function triggerAggregation() {
    try {
      const res = await fetch("/api/news/aggregate", { method: "POST" });
      if (!res.ok) throw new Error("API-Fehler");
      const result = await res.json();
      toast.success(`${result.processed} Nachricht(en) verarbeitet`);
      loadNews();
    } catch {
      toast.error("News-Aggregation fehlgeschlagen");
    }
  }

  const catMap = new Map(NEWS_CATEGORIES.map(c => [c.id, c]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-rose-500" />
          <h2 className="font-semibold text-anthrazit">Quartiersnews</h2>
          <Badge variant="secondary" className="text-[10px]">{news.length}</Badge>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" className="text-xs h-8" onClick={triggerAggregation}>
            <Sparkles className="h-3.5 w-3.5 mr-1" />KI
          </Button>
          <Button size="sm" className="text-xs h-8" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="h-3.5 w-3.5 mr-1" />Neu
          </Button>
        </div>
      </div>

      {/* Formular */}
      {showForm && (
        <Card className="border-quartier-green/30">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-anthrazit">
                {editingId ? "Nachricht bearbeiten" : "Neue Nachricht"}
              </p>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div>
              <label htmlFor="news-title" className="mb-1 block text-xs font-medium text-muted-foreground">Titel</label>
              <Input id="news-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Kanalarbeiten Sanarystrasse ab Montag" />
            </div>

            <div>
              <label htmlFor="news-summary" className="mb-1 block text-xs font-medium text-muted-foreground">Zusammenfassung</label>
              <Textarea id="news-summary" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Ab kommendem Montag wird die Sanarystrasse wegen Kanalarbeiten halbseitig gesperrt..." rows={3} maxLength={500} />
              <p className="mt-1 text-right text-xs text-muted-foreground">{summary.length}/500</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Kategorie</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {NEWS_CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Relevanz (0-10)</label>
                <Input type="number" min={0} max={10} value={relevance} onChange={(e) => setRelevance(parseInt(e.target.value) || 0)} />
              </div>
            </div>

            <div>
              <label htmlFor="news-url" className="mb-1 block text-xs font-medium text-muted-foreground">Quell-URL (optional)</label>
              <Input id="news-url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://www.bad-saeckingen.de/..." />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full bg-quartier-green hover:bg-quartier-green-dark">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Wird gespeichert..." : editingId ? "Aktualisieren" : "Veroeffentlichen"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* News-Liste */}
      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Laden...</div>
      ) : news.length === 0 ? (
        <div className="py-8 text-center">
          <div className="text-4xl mb-2">📰</div>
          <p className="text-muted-foreground">Noch keine News vorhanden.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {news.map((item) => {
            const cat = catMap.get(item.category);
            return (
              <Card key={item.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm">{cat?.icon ?? "📰"}</span>
                      <p className="text-sm font-semibold text-anthrazit truncate">{item.original_title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.ai_summary}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                      <span>{new Date(item.created_at).toLocaleDateString("de-DE")}</span>
                      <span>·</span>
                      <Badge variant="outline" className="text-[10px] h-4">
                        Relevanz: {item.relevance_score}/10
                      </Badge>
                      {item.source_url && (
                        <>
                          <span>·</span>
                          <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-quartier-green hover:underline">
                            <Globe className="h-3 w-3" /> Quelle
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => editNews(item)} title="Bearbeiten">
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => deleteNews(item.id)} title="Loeschen">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
