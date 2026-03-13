"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  UserPlus,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  MessageCircle,
  Mail,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { InviteNeighborModal } from "@/components/InviteNeighborModal";
import { formatCode } from "@/lib/invite-codes";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Invitation {
  id: string;
  invite_method: "email" | "whatsapp" | "code";
  invite_target: string | null;
  invite_code: string;
  status: "sent" | "accepted" | "expired";
  created_at: string;
  accepted_at: string | null;
  household: {
    street_name: string;
    house_number: string;
  } | null;
}

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function loadInvitations() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("neighbor_invitations")
      .select("*, household:households(street_name, house_number)")
      .eq("inviter_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      setInvitations(data as unknown as Invitation[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadInvitations();
  }, []);

  async function copyCode(id: string, code: string) {
    try {
      const baseUrl = window.location.origin;
      const registerUrl = `${baseUrl}/register?invite=${code}`;
      await navigator.clipboard.writeText(registerUrl);
      setCopiedId(id);
      toast.success("Registrierungslink kopiert!");
      setTimeout(() => setCopiedId(null), 3000);
    } catch {
      toast.error("Kopieren fehlgeschlagen");
    }
  }

  // Statistiken berechnen
  const openCount = invitations.filter((i) => i.status === "sent").length;
  const acceptedCount = invitations.filter((i) => i.status === "accepted").length;
  const expiredCount = invitations.filter((i) => i.status === "expired").length;
  const pointsEarned = acceptedCount * 50;

  function getStatusIcon(status: string) {
    switch (status) {
      case "sent":
        return <Clock className="h-4 w-4 text-alert-amber" />;
      case "accepted":
        return <CheckCircle2 className="h-4 w-4 text-quartier-green" />;
      case "expired":
        return <XCircle className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case "sent":
        return "Offen";
      case "accepted":
        return "Angenommen";
      case "expired":
        return "Abgelaufen";
      default:
        return status;
    }
  }

  function getMethodIcon(method: string) {
    switch (method) {
      case "email":
        return <Mail className="h-3.5 w-3.5" />;
      case "whatsapp":
        return <MessageCircle className="h-3.5 w-3.5" />;
      default:
        return <Copy className="h-3.5 w-3.5" />;
    }
  }

  function getMethodLabel(method: string) {
    switch (method) {
      case "email":
        return "E-Mail";
      case "whatsapp":
        return "WhatsApp";
      default:
        return "Code";
    }
  }

  function daysAgo(dateStr: string) {
    // eslint-disable-next-line react-hooks/purity
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Heute";
    if (days === 1) return "Gestern";
    return `Vor ${days} Tagen`;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="rounded-lg p-2 hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold text-anthrazit">Meine Einladungen</h1>
        </div>
        <Button
          size="sm"
          className="bg-quartier-green hover:bg-quartier-green-dark"
          onClick={() => setShowModal(true)}
        >
          <UserPlus className="mr-1.5 h-4 w-4" />
          Einladen
        </Button>
      </div>

      {/* Statistiken */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-alert-amber">{openCount}</p>
            <p className="text-[11px] text-muted-foreground">Offen</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-quartier-green">{acceptedCount}</p>
            <p className="text-[11px] text-muted-foreground">Angenommen</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-quartier-green">{pointsEarned}</p>
            <p className="text-[11px] text-muted-foreground">Punkte</p>
          </CardContent>
        </Card>
      </div>

      {/* Info-Hinweis */}
      {openCount < 5 && invitations.length === 0 && !loading && (
        <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
          <p className="font-medium">Nachbarn einladen</p>
          <p className="mt-1 text-xs">
            Laden Sie Nachbarn per WhatsApp, E-Mail oder Code ein. Sie erhalten
            <strong> 50 Punkte</strong> für jede angenommene Einladung!
          </p>
        </div>
      )}

      {/* Spam-Limit Hinweis */}
      {openCount >= 5 && (
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
          <p className="font-medium">Limit erreicht</p>
          <p className="mt-1 text-xs">
            Sie haben 5 offene Einladungen. Neue Einladungen sind möglich, sobald bestehende angenommen oder abgelaufen sind.
          </p>
        </div>
      )}

      {/* Einladungs-Liste */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Laden...</div>
      ) : invitations.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <UserPlus className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <p className="mt-3 text-sm text-muted-foreground">
              Sie haben noch keine Einladungen versendet.
            </p>
            <Button
              className="mt-4 bg-quartier-green hover:bg-quartier-green-dark"
              onClick={() => setShowModal(true)}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Ersten Nachbarn einladen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {invitations.map((invitation, index) => (
              <div key={invitation.id}>
                {index > 0 && <Separator />}
                <div className="flex items-center justify-between p-4">
                  <div className="flex-1 min-w-0">
                    {/* Adresse + Status */}
                    <div className="flex items-center gap-2">
                      {getStatusIcon(invitation.status)}
                      <span className="font-medium text-sm text-anthrazit truncate">
                        {invitation.household
                          ? `${invitation.household.street_name} ${invitation.household.house_number}`
                          : "Unbekannte Adresse"}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        {getMethodIcon(invitation.invite_method)}
                        {getMethodLabel(invitation.invite_method)}
                      </span>
                      {invitation.invite_target && (
                        <span className="truncate max-w-[150px]">
                          → {invitation.invite_target}
                        </span>
                      )}
                      <span>{daysAgo(invitation.created_at)}</span>
                    </div>

                    {/* Code + Zeitstempel */}
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono text-[11px]">
                        {formatCode(invitation.invite_code)}
                      </span>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                          invitation.status === "sent"
                            ? "bg-amber-50 text-alert-amber"
                            : invitation.status === "accepted"
                            ? "bg-green-50 text-quartier-green"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {getStatusLabel(invitation.status)}
                      </span>
                      {invitation.status === "accepted" && (
                        <span className="text-quartier-green font-medium">+50 Punkte</span>
                      )}
                    </div>
                  </div>

                  {/* Aktionen */}
                  {invitation.status === "sent" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-2 shrink-0"
                      onClick={() => copyCode(invitation.id, invitation.invite_code)}
                    >
                      {copiedId === invitation.id ? (
                        <Check className="h-4 w-4 text-quartier-green" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Abgelaufen-Hinweis */}
      {expiredCount > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          {expiredCount} Einladung{expiredCount !== 1 ? "en" : ""} abgelaufen (30 Tage Gültigkeit)
        </p>
      )}

      {/* Aktualisieren */}
      {invitations.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="mx-auto flex"
          onClick={() => loadInvitations()}
        >
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Aktualisieren
        </Button>
      )}

      {/* Einladungs-Modal */}
      <InviteNeighborModal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          loadInvitations();
        }}
      />
    </div>
  );
}
