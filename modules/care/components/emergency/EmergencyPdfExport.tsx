"use client";

// Notfallmappe PDF-Export — Kuehlschrank-Blatt (1 Seite) + Vollversion (3-4 Seiten)
// Nutzt jsPDF + qrcode fuer QR-Code-Generierung

import { useState } from "react";
import { FileDown, Printer, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Level1Data, Level2Data, Level3Data } from "./types";

interface EmergencyPdfExportProps {
  userId: string;
  level1: Level1Data;
  level2: Level2Data | null;
  level3: Level3Data | null;
}

export function EmergencyPdfExport({
  userId,
  level1,
  level2,
  level3,
}: EmergencyPdfExportProps) {
  const [generatingFridge, setGeneratingFridge] = useState(false);
  const [generatingFull, setGeneratingFull] = useState(false);

  // PDF-Token generieren und QR-URL erhalten
  async function generatePdfToken(): Promise<string | null> {
    try {
      const res = await fetch("/api/care/emergency-profile/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        toast.error("Token konnte nicht generiert werden");
        return null;
      }
      const { token } = await res.json();
      return token;
    } catch {
      toast.error("Verbindungsfehler");
      return null;
    }
  }

  // QR-Code als Data-URL generieren
  async function generateQrDataUrl(url: string): Promise<string> {
    const QRCode = (await import("qrcode")).default;
    return QRCode.toDataURL(url, {
      width: 120,
      margin: 1,
      color: { dark: "#2D3142", light: "#FFFFFF" },
    });
  }

  // --- Kuehlschrank-Blatt (1 Seite A4) ---
  async function generateFridgeSheet() {
    setGeneratingFridge(true);
    try {
      const token = await generatePdfToken();
      if (!token) {
        setGeneratingFridge(false);
        return;
      }

      const baseUrl = window.location.origin;
      const notfallUrl = `${baseUrl}/notfall/${token}`;
      const qrDataUrl = await generateQrDataUrl(notfallUrl);

      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Gruener Header
      doc.setFillColor(76, 175, 135); // #4CAF87
      doc.rect(0, 0, 210, 25, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("NOTFALLDATEN", 15, 17);

      // QR-Code oben rechts
      doc.addImage(qrDataUrl, "PNG", 170, 2, 25, 25);

      // Rote Warnung
      doc.setTextColor(239, 68, 68); // #EF4444
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Bei Notfaellen: 112 anrufen!", 15, 35);

      // Daten in grosser Schrift
      doc.setTextColor(45, 49, 66); // #2D3142
      doc.setFontSize(16);
      let y = 50;
      const lineHeight = 12;

      function addField(label: string, value: string) {
        if (!value) return;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(label, 15, y);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(16);
        y += 7;
        // Mehrzeilige Werte
        const lines = doc.splitTextToSize(value, 170);
        doc.text(lines, 15, y);
        y += lines.length * lineHeight + 2;
      }

      addField("Name:", level1.fullName);
      addField("Geburtsdatum:", formatDate(level1.dateOfBirth));
      if (level1.bloodType) addField("Blutgruppe:", level1.bloodType);
      if (level1.allergies) addField("Allergien:", level1.allergies);
      if (level1.medications) addField("Medikamente:", level1.medications);
      if (level1.conditions) addField("Erkrankungen:", level1.conditions);
      if (level1.implants) addField("Implantate:", level1.implants);
      if (level1.patientenverfuegung) {
        addField("Patientenverfuegung:", "Ja, vorhanden");
      }

      // Notfallkontakte
      if (level1.emergencyContact1.name) {
        y += 5;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("Notfallkontakte", 15, y);
        y += 10;
        addField(
          `${level1.emergencyContact1.relation || "Kontakt 1"}:`,
          `${level1.emergencyContact1.name} — ${level1.emergencyContact1.phone}`,
        );
      }
      if (level1.emergencyContact2.name) {
        addField(
          `${level1.emergencyContact2.relation || "Kontakt 2"}:`,
          `${level1.emergencyContact2.name} — ${level1.emergencyContact2.phone}`,
        );
      }

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      const expiryDate = new Date(
        Date.now() + 72 * 60 * 60 * 1000,
      ).toLocaleDateString("de-DE");
      doc.text(
        `Erstellt mit nachbar.io — QR-Code gueltig bis ${expiryDate}`,
        15,
        285,
      );

      doc.save(`Notfalldaten_${level1.fullName.replace(/\s+/g, "_")}.pdf`);
      toast.success("Kuehlschrank-Blatt heruntergeladen");
    } catch (err) {
      console.error("PDF-Generierung fehlgeschlagen:", err);
      toast.error("PDF konnte nicht erstellt werden");
    }
    setGeneratingFridge(false);
  }

  // --- Vollversion (3-4 Seiten) ---
  async function generateFullVersion() {
    setGeneratingFull(true);
    try {
      const token = await generatePdfToken();
      if (!token) {
        setGeneratingFull(false);
        return;
      }

      const baseUrl = window.location.origin;
      const notfallUrl = `${baseUrl}/notfall/${token}`;
      const qrDataUrl = await generateQrDataUrl(notfallUrl);

      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      let y = 0;

      function addSectionHeader(title: string) {
        if (y > 250) {
          doc.addPage();
          y = 20;
        }
        y += 8;
        doc.setFillColor(76, 175, 135);
        doc.rect(0, y - 6, 210, 10, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(title, 15, y + 1);
        y += 12;
      }

      function addRow(label: string, value: string) {
        if (!value) return;
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.setTextColor(128, 128, 128);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(label, 15, y);
        doc.setTextColor(45, 49, 66);
        doc.setFontSize(11);
        const lines = doc.splitTextToSize(value, 130);
        doc.text(lines, 65, y);
        y += Math.max(lines.length * 5, 7) + 2;
      }

      // Seite 1: Deckblatt
      doc.setFillColor(76, 175, 135);
      doc.rect(0, 0, 210, 40, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont("helvetica", "bold");
      doc.text("NOTFALLMAPPE", 15, 22);
      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text(level1.fullName, 15, 34);

      // QR-Code
      doc.addImage(qrDataUrl, "PNG", 165, 8, 30, 30);

      // Rote Warnung
      doc.setFillColor(254, 226, 226);
      doc.rect(15, 48, 180, 12, "F");
      doc.setTextColor(239, 68, 68);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Bei Notfaellen immer zuerst 112 anrufen!", 20, 56);

      y = 70;

      // Level 1
      addSectionHeader("1. Notfalldose — Lebenswichtige Daten");
      addRow("Name:", level1.fullName);
      addRow("Geburtsdatum:", formatDate(level1.dateOfBirth));
      addRow("Blutgruppe:", level1.bloodType);
      addRow("Allergien:", level1.allergies);
      addRow("Medikamente:", level1.medications);
      addRow("Erkrankungen:", level1.conditions);
      addRow("Implantate:", level1.implants);
      addRow(
        "Patientenverfuegung:",
        level1.patientenverfuegung ? "Ja" : "Nein",
      );

      // Kontakte
      if (level1.emergencyContact1.name) {
        y += 3;
        doc.setTextColor(45, 49, 66);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("Notfallkontakte:", 15, y);
        y += 7;
        doc.setFont("helvetica", "normal");
        addRow(
          level1.emergencyContact1.relation || "Kontakt 1:",
          `${level1.emergencyContact1.name}, ${level1.emergencyContact1.phone}`,
        );
      }
      if (level1.emergencyContact2.name) {
        addRow(
          level1.emergencyContact2.relation || "Kontakt 2:",
          `${level1.emergencyContact2.name}, ${level1.emergencyContact2.phone}`,
        );
      }

      // Level 2
      if (level2) {
        addSectionHeader("2. Vorsorge-Dokumente");
        addRow(
          "Vorsorgevollmacht:",
          level2.vorsorgevollmacht
            ? `Ja${level2.vorsorgevollmachtLocation ? ` (${level2.vorsorgevollmachtLocation})` : ""}`
            : "Nein",
        );
        addRow(
          "Betreuungsverfuegung:",
          level2.betreuungsverfuegung
            ? `Ja${level2.betreuungsverfuegungLocation ? ` (${level2.betreuungsverfuegungLocation})` : ""}`
            : "Nein",
        );
        const organspendeLabels: Record<string, string> = {
          ja: "Ja, uneingeschraenkt",
          nein: "Nein",
          eingeschraenkt: `Ja, mit Einschraenkungen: ${level2.organspendeDetails}`,
        };
        if (level2.organspende) {
          addRow(
            "Organspende:",
            organspendeLabels[level2.organspende] || "Keine Angabe",
          );
        }
        addRow("Bestattungswunsch:", level2.bestattungswunsch);
      }

      // Level 3
      if (level3) {
        addSectionHeader("3. Erweiterte Informationen");
        addRow("Krankenkasse:", level3.insuranceName);
        addRow("Versichertennr.:", level3.insuranceNumber);
        if (level3.pflegegrad > 0)
          addRow("Pflegegrad:", String(level3.pflegegrad));
        if (level3.behinderungsgrad > 0)
          addRow("GdB:", String(level3.behinderungsgrad));
        addRow("Hilfsmittel:", level3.hilfsmittel);
        addRow("Schluessel:", level3.schluesselStandort);
        addRow("Haustiere:", level3.haustiere);
        addRow("Sonstiges:", level3.sonstigeHinweise);
      }

      // Footer auf jeder Seite
      const pageCount = doc.getNumberOfPages();
      const expiryDate = new Date(
        Date.now() + 72 * 60 * 60 * 1000,
      ).toLocaleDateString("de-DE");
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Erstellt mit nachbar.io — Seite ${i}/${pageCount} — QR-Code gueltig bis ${expiryDate}`,
          15,
          285,
        );
      }

      doc.save(`Notfallmappe_${level1.fullName.replace(/\s+/g, "_")}.pdf`);
      toast.success("Vollversion heruntergeladen");
    } catch (err) {
      console.error("PDF-Generierung fehlgeschlagen:", err);
      toast.error("PDF konnte nicht erstellt werden");
    }
    setGeneratingFull(false);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <button
        type="button"
        onClick={generateFridgeSheet}
        disabled={generatingFridge || !level1.fullName}
        className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-[#4CAF87] bg-white px-4 py-4 text-base font-semibold text-[#4CAF87] transition-colors hover:bg-[#4CAF87]/5 disabled:opacity-50"
        style={{ minHeight: "64px" }}
      >
        {generatingFridge ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <FileDown className="h-5 w-5" />
        )}
        Kuehlschrank-Blatt
      </button>

      <button
        type="button"
        onClick={generateFullVersion}
        disabled={generatingFull || !level1.fullName}
        className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-[#2D3142] bg-white px-4 py-4 text-base font-semibold text-[#2D3142] transition-colors hover:bg-gray-50 disabled:opacity-50"
        style={{ minHeight: "64px" }}
      >
        {generatingFull ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Printer className="h-5 w-5" />
        )}
        Vollversion drucken
      </button>
    </div>
  );
}

// Hilfsfunktion: Datum formatieren
function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}
