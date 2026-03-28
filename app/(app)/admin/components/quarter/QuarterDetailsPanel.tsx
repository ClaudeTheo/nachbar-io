"use client";

// Quartier-Detail-Dialoge: Status-Transition und Admin-Verwaltung

import { Shield, Search, X, Trash2, TriangleAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { QuarterWithStats, QuarterAdmin } from "@/lib/quarters/types";

// -------------------------------------------------------------------
// StatusTransitionDialog — Aktivierung/Archivierung bestaetigen
// -------------------------------------------------------------------

interface StatusTransitionDialogProps {
  transition: { quarter: QuarterWithStats; targetStatus: string } | null;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function StatusTransitionDialog({
  transition,
  saving,
  onClose,
  onConfirm,
}: StatusTransitionDialogProps) {
  return (
    <Dialog open={!!transition} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {transition?.targetStatus === "active"
              ? "Quartier aktivieren"
              : "Quartier archivieren"}
          </DialogTitle>
          <DialogDescription>
            {transition?.targetStatus === "active"
              ? `Moechten Sie "${transition?.quarter.name}" wirklich aktivieren? Das Quartier wird fuer Bewohner sichtbar.`
              : `Moechten Sie "${transition?.quarter.name}" wirklich archivieren? Bewohner haben keinen Zugang mehr.`}
          </DialogDescription>
        </DialogHeader>
        {transition?.targetStatus === "archived" && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
            <TriangleAlert className="mt-0.5 h-4 w-4 text-amber-600" />
            <p className="text-sm text-amber-800">
              Archivierte Quartiere koennen nicht wieder aktiviert werden. Alle Daten bleiben erhalten.
            </p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            onClick={onConfirm}
            disabled={saving}
            variant={transition?.targetStatus === "archived" ? "destructive" : "default"}
            className={transition?.targetStatus === "active" ? "bg-quartier-green hover:bg-quartier-green-dark" : ""}
          >
            {saving
              ? "Wird geaendert..."
              : transition?.targetStatus === "active"
                ? "Aktivieren"
                : "Archivieren"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -------------------------------------------------------------------
// AdminManagementDialog — Quartier-Admins verwalten
// -------------------------------------------------------------------

interface AdminManagementDialogProps {
  adminQuarter: QuarterWithStats | null;
  quarterAdmins: QuarterAdmin[];
  loadingAdmins: boolean;
  adminSearch: string;
  adminSearchResults: Array<{ id: string; display_name: string }>;
  onClose: () => void;
  onSearchChange: (query: string) => void;
  onClearSearch: () => void;
  onAssignAdmin: (userId: string) => void;
  onRemoveAdmin: (userId: string) => void;
}

export function AdminManagementDialog({
  adminQuarter,
  quarterAdmins,
  loadingAdmins,
  adminSearch,
  adminSearchResults,
  onClose,
  onSearchChange,
  onClearSearch,
  onAssignAdmin,
  onRemoveAdmin,
}: AdminManagementDialogProps) {
  return (
    <Dialog open={!!adminQuarter} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quartier-Admins: {adminQuarter?.name}</DialogTitle>
          <DialogDescription>
            Verwalten Sie die Administratoren fuer dieses Quartier
          </DialogDescription>
        </DialogHeader>

        {/* Aktuelle Admins */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-anthrazit">Aktuelle Admins</h4>
          {loadingAdmins ? (
            <p className="text-sm text-muted-foreground">Lade...</p>
          ) : quarterAdmins.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Admins zugewiesen</p>
          ) : (
            quarterAdmins.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-md border p-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-quartier-green" />
                  <span className="text-sm">{a.user?.display_name ?? "Unbekannt"}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveAdmin(a.user_id)}
                  className="h-7 text-muted-foreground hover:text-emergency-red"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>

        <Separator />

        {/* Admin hinzufuegen */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-anthrazit">Admin hinzufuegen</h4>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Benutzer suchen..."
              value={adminSearch}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8"
            />
            {adminSearch && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-7 w-7 p-0"
                onClick={onClearSearch}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          {adminSearchResults.length > 0 && (
            <div className="space-y-1 rounded-md border p-2">
              {adminSearchResults.map((u) => {
                const alreadyAdmin = quarterAdmins.some((a) => a.user_id === u.id);
                return (
                  <div key={u.id} className="flex items-center justify-between rounded p-1.5 hover:bg-muted">
                    <span className="text-sm">{u.display_name}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={alreadyAdmin}
                      onClick={() => onAssignAdmin(u.id)}
                      className="h-7 text-xs"
                    >
                      {alreadyAdmin ? "Bereits Admin" : "Zuweisen"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
