"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, HandHelping, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import { HELP_CATEGORIES } from "@/lib/constants";
import type { HelpRequest } from "@/lib/supabase/types";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

export default function HelpPage() {
  const [requests, setRequests] = useState<HelpRequest[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("help_requests")
        .select("*, user:users(display_name, avatar_url)")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (data) setRequests(data as unknown as HelpRequest[]);
    }
    load();
  }, []);

  const needs = requests.filter((r) => r.type === "need");
  const offers = requests.filter((r) => r.type === "offer");

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-anthrazit">Hilfe-Börse</h1>
        <Link
          href="/help/new"
          className="flex items-center gap-1 rounded-lg bg-quartier-green px-3 py-2 text-sm font-semibold text-white hover:bg-quartier-green-dark"
        >
          <Plus className="h-4 w-4" />
          Neuer Eintrag
        </Link>
      </div>

      <Tabs defaultValue="needs">
        <TabsList className="w-full">
          <TabsTrigger value="needs" className="flex-1">
            <Search className="mr-1 h-4 w-4" />
            Sucht Hilfe ({needs.length})
          </TabsTrigger>
          <TabsTrigger value="offers" className="flex-1">
            <HandHelping className="mr-1 h-4 w-4" />
            Bietet Hilfe ({offers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="needs" className="mt-4 space-y-3">
          {needs.length === 0 ? (
            <EmptyState text="Keine aktuellen Hilfegesuche." />
          ) : (
            needs.map((req) => <HelpCard key={req.id} request={req} />)
          )}
        </TabsContent>

        <TabsContent value="offers" className="mt-4 space-y-3">
          {offers.length === 0 ? (
            <EmptyState text="Keine aktuellen Hilfsangebote." />
          ) : (
            offers.map((req) => <HelpCard key={req.id} request={req} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function HelpCard({ request }: { request: HelpRequest }) {
  const cat = HELP_CATEGORIES.find((c) => c.id === request.category);
  const timeAgo = formatDistanceToNow(new Date(request.created_at), {
    addSuffix: true,
    locale: de,
  });

  return (
    <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{cat?.icon ?? "❓"}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-anthrazit">{request.title}</h3>
            <Badge variant={request.type === "need" ? "default" : "secondary"}>
              {request.type === "need" ? "Gesucht" : "Angebot"}
            </Badge>
          </div>
          {request.description && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {request.description}
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            {request.user?.display_name} · {timeAgo}
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-8 text-center">
      <p className="text-muted-foreground">{text}</p>
    </div>
  );
}
