"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import { useQuarter } from "@/lib/quarters";
import type { LostFoundItem } from "@/lib/supabase/types";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

export default function LostFoundPage() {
  const [items, setItems] = useState<LostFoundItem[]>([]);
  const { currentQuarter } = useQuarter();

  useEffect(() => {
    if (!currentQuarter) return;
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("lost_found")
        .select("*, user:users(display_name)")
        .eq("quarter_id", currentQuarter!.id)
        .eq("status", "open")
        .order("created_at", { ascending: false });
      if (data) setItems(data as unknown as LostFoundItem[]);
    }
    load();
  }, [currentQuarter?.id]);

  const lost = items.filter((i) => i.type === "lost");
  const found = items.filter((i) => i.type === "found");

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-anthrazit">Verloren & Gefunden</h1>
        <Link
          href="/lost-found/new"
          className="flex items-center gap-1 rounded-lg bg-quartier-green px-3 py-2 text-sm font-semibold text-white hover:bg-quartier-green-dark"
        >
          <Plus className="h-4 w-4" />
          Neue Meldung
        </Link>
      </div>

      <Tabs defaultValue="lost">
        <TabsList className="w-full">
          <TabsTrigger value="lost" className="flex-1">
            Verloren ({lost.length})
          </TabsTrigger>
          <TabsTrigger value="found" className="flex-1">
            Gefunden ({found.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lost" className="mt-4 space-y-3">
          {lost.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Keine Verlustmeldungen.</p>
          ) : (
            lost.map((item) => <LostFoundCard key={item.id} item={item} />)
          )}
        </TabsContent>

        <TabsContent value="found" className="mt-4 space-y-3">
          {found.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Keine Fundmeldungen.</p>
          ) : (
            found.map((item) => <LostFoundCard key={item.id} item={item} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LostFoundCard({ item }: { item: LostFoundItem }) {
  const timeAgo = formatDistanceToNow(new Date(item.created_at), {
    addSuffix: true,
    locale: de,
  });

  return (
    <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-anthrazit">{item.title}</h3>
        <Badge variant={item.type === "lost" ? "destructive" : "default"}>
          {item.type === "lost" ? "Verloren" : "Gefunden"}
        </Badge>
      </div>
      {item.description && (
        <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
      )}
      {item.location_hint && (
        <p className="mt-1 text-xs text-info-blue">📍 {item.location_hint}</p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        {item.user?.display_name} · {timeAgo}
      </p>
    </div>
  );
}
