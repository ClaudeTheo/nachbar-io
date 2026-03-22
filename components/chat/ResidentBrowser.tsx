"use client";

// components/chat/ResidentBrowser.tsx
// Nachbar.io — Sheet-Komponente zum Durchsuchen anonymisierter Bewohner
// Zeigt Adressen im Quartier mit anonymisierten Bewohnern an
// Ermoeglicht das Senden von Kontaktanfragen

import { useEffect, useState, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  MapPin,
  ChevronRight,
  ChevronDown,
  User,
  ArrowLeft,
  Send,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

// --- Typen ---

interface Resident {
  number: number;
  id: string;
}

interface Address {
  address: string;
  householdId: string;
  residents: Resident[];
}

export interface ResidentBrowserProps {
  open: boolean;
  onClose: () => void;
  onRequestSent: () => void;
}

type ViewState = "loading" | "list" | "empty" | "form";

interface SelectedResident {
  address: string;
  householdId: string;
  resident: Resident;
}

// --- Hauptkomponente ---

export function ResidentBrowser({ open, onClose, onRequestSent }: ResidentBrowserProps) {
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [expandedAddresses, setExpandedAddresses] = useState<Set<string>>(new Set());
  const [selectedResident, setSelectedResident] = useState<SelectedResident | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Bewohner laden
  const loadResidents = useCallback(async () => {
    setViewState("loading");
    try {
      const res = await fetch("/api/quarter/residents");
      if (!res.ok) throw new Error("Fehler beim Laden");
      const data = await res.json();
      const addrs = data.addresses as Address[];
      setAddresses(addrs);
      setViewState(addrs.length === 0 ? "empty" : "list");
    } catch {
      setAddresses([]);
      setViewState("empty");
    }
  }, []);

  // Bei Oeffnen: Zuruecksetzen und laden
  useEffect(() => {
    if (open) {
      setSelectedResident(null);
      setMessage("");
      setExpandedAddresses(new Set());
      loadResidents();
    }
  }, [open, loadResidents]);

  // Adresse aufklappen/zuklappen
  function toggleAddress(householdId: string) {
    setExpandedAddresses((prev) => {
      const next = new Set(prev);
      if (next.has(householdId)) {
        next.delete(householdId);
      } else {
        next.add(householdId);
      }
      return next;
    });
  }

  // Bewohner auswaehlen → Nachrichtenformular anzeigen
  function selectResident(address: Address, resident: Resident) {
    setSelectedResident({
      address: address.address,
      householdId: address.householdId,
      resident,
    });
    setMessage("");
    setViewState("form");
  }

  // Zurueck zur Adressliste
  function goBackToList() {
    setSelectedResident(null);
    setMessage("");
    setViewState("list");
  }

  // Kontaktanfrage senden
  async function sendRequest() {
    if (!selectedResident || !message.trim()) return;
    setSending(true);

    try {
      const res = await fetch("/api/quarter/residents/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hashedId: selectedResident.resident.id,
          householdId: selectedResident.householdId,
          message: message.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Anfrage fehlgeschlagen");
      }

      toast.success("Kontaktanfrage gesendet!");
      onRequestSent();
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Fehler beim Senden";
      toast.error(errorMessage);
    } finally {
      setSending(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="bottom" className="h-[80vh] flex flex-col rounded-t-2xl">
        {/* Header */}
        <SheetHeader className="pb-2">
          <div className="flex items-center gap-2">
            {viewState === "form" && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={goBackToList}
                className="shrink-0"
                data-testid="back-button"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <MapPin className="h-5 w-5 text-quartier-green shrink-0" />
            <SheetTitle className="text-base font-semibold text-anthrazit">
              {viewState === "form" ? "Kontaktanfrage" : "Bewohner kontaktieren"}
            </SheetTitle>
          </div>
          <SheetDescription className="text-xs text-muted-foreground">
            {viewState === "form"
              ? "Schreiben Sie eine Nachricht an Ihren Nachbarn"
              : "Wählen Sie eine Adresse und einen Bewohner aus"}
          </SheetDescription>
        </SheetHeader>

        {/* Inhalt */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {/* Ladezustand */}
          {viewState === "loading" && (
            <div className="flex items-center justify-center py-12" data-testid="loading-state">
              <Loader2 className="h-8 w-8 animate-spin text-quartier-green" />
            </div>
          )}

          {/* Leerer Zustand */}
          {viewState === "empty" && (
            <div className="py-12 text-center" data-testid="empty-state">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <MapPin className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="mt-4 text-muted-foreground">
                Keine Bewohner zum Kontaktieren verfügbar
              </p>
            </div>
          )}

          {/* Adressliste */}
          {viewState === "list" && (
            <div className="space-y-3" data-testid="address-list">
              {addresses.map((addr) => {
                const isExpanded = expandedAddresses.has(addr.householdId);
                return (
                  <div
                    key={addr.householdId}
                    className="rounded-xl border border-border overflow-hidden"
                  >
                    {/* Adress-Header */}
                    <button
                      onClick={() => toggleAddress(addr.householdId)}
                      className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors min-h-[52px]"
                      data-testid="address-item"
                    >
                      <MapPin className="h-4 w-4 text-quartier-green shrink-0" />
                      <span className="flex-1 text-sm font-medium text-anthrazit">
                        {addr.address}
                      </span>
                      <span className="text-xs text-muted-foreground mr-1">
                        {addr.residents.length}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </button>

                    {/* Bewohner-Liste (ausgeklappt) */}
                    {isExpanded && (
                      <div className="border-t border-border">
                        {addr.residents.map((resident) => (
                          <button
                            key={resident.id}
                            onClick={() => selectResident(addr, resident)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors min-h-[52px] border-b border-border last:border-b-0"
                            data-testid="resident-item"
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-quartier-green/10 shrink-0">
                              <User className="h-4 w-4 text-quartier-green" />
                            </div>
                            <span className="flex-1 text-sm text-anthrazit">
                              Bewohner {resident.number}
                            </span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Nachrichtenformular */}
          {viewState === "form" && selectedResident && (
            <div className="space-y-4" data-testid="message-form">
              {/* Empfaenger-Info */}
              <div className="rounded-xl border border-border p-4 bg-muted/30">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 text-quartier-green" />
                  <span>{selectedResident.address}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-quartier-green/10">
                    <User className="h-4 w-4 text-quartier-green" />
                  </div>
                  <span className="text-sm font-medium text-anthrazit">
                    Bewohner {selectedResident.resident.number}
                  </span>
                </div>
              </div>

              {/* Nachrichteneingabe */}
              <div>
                <Textarea
                  placeholder="Ihre Nachricht an den Nachbarn..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                  className="min-h-[120px] resize-none"
                  maxLength={500}
                  data-testid="message-textarea"
                />
                <p className="mt-1 text-xs text-muted-foreground text-right">
                  {message.length}/500
                </p>
              </div>

              {/* Senden-Button */}
              <Button
                onClick={sendRequest}
                disabled={!message.trim() || sending}
                className="w-full min-h-[52px] bg-[#4CAF87] hover:bg-[#3d9a74] text-white"
                data-testid="send-button"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Kontaktanfrage senden
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
