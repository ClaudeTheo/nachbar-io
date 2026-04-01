// modules/care/components/navigator/PflegetagebuchPdf.tsx
// Generiert ein 2-Wochen Pflegetagebuch als DIN A4 Landscape PDF
"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";

export function PflegetagebuchPdf() {
  const [generating, setGenerating] = useState(false);

  const generatePdf = async () => {
    setGenerating(true);
    try {
      // Dynamischer Import fuer Code-Splitting
      const { jsPDF } = await import("jspdf");

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
      const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
      const margin = 15;

      // Titel
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Pflegetagebuch", margin, 20);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Dokumentation der Pflegesituation (2 Wochen)", margin, 27);

      // Informationsfelder
      doc.setFontSize(9);
      doc.text(`Name: ___________________________________`, margin, 35);
      doc.text(`Zeitraum: _____________ bis _____________`, margin + 120, 35);
      doc.text(`Erstellt am: ${new Date().toLocaleDateString("de-DE")}`, pageWidth - margin - 50, 35);

      // Tabelle
      const tableTop = 42;
      const columns = [
        { header: "Datum / Uhrzeit", width: 35 },
        { header: "Aktivität / Situation", width: 65 },
        { header: "Art der Hilfe", width: 50 },
        { header: "Dauer (Min.)", width: 25 },
        { header: "Besonderheiten / Hinweise", width: 55 },
        { header: "NBA-Modul", width: 30 },
      ];

      const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);
      const rowHeight = 9;
      const headerHeight = 8;

      // Tabellenkopf zeichnen
      const drawHeader = (startY: number) => {
        doc.setFillColor(45, 49, 66); // Anthrazit #2D3142
        doc.rect(margin, startY, totalWidth, headerHeight, "F");
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);

        let x = margin;
        for (const col of columns) {
          doc.text(col.header, x + 2, startY + 5.5);
          x += col.width;
        }

        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        return startY + headerHeight;
      };

      // Zeilen zeichnen
      const drawRows = (startY: number, count: number) => {
        let y = startY;
        for (let i = 0; i < count; i++) {
          // Zeile abwechselnd einfaerben
          if (i % 2 === 0) {
            doc.setFillColor(248, 249, 250);
            doc.rect(margin, y, totalWidth, rowHeight, "F");
          }

          // Zellenrahmen
          let x = margin;
          for (const col of columns) {
            doc.rect(x, y, col.width, rowHeight, "S");
            x += col.width;
          }

          y += rowHeight;
        }
        return y;
      };

      // Seite 1: Tag 1-7
      let y = drawHeader(tableTop);
      y = drawRows(y, 7);

      // NBA-Modul Legende
      y += 5;
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("NBA-Module:", margin, y);
      doc.setFont("helvetica", "normal");
      const moduleTexts = [
        "M1 = Mobilität",
        "M2 = Kognitiv/Kommunikation",
        "M3 = Verhalten/Psyche",
        "M4 = Selbstversorgung",
        "M5 = Krankheitsbedingt",
        "M6 = Alltag",
      ];
      doc.text(moduleTexts.join("  |  "), margin + 22, y);

      // Seite 2: Tag 8-14
      doc.addPage("landscape");
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Pflegetagebuch — Woche 2", margin, 20);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      y = drawHeader(28);
      y = drawRows(y, 7);

      // Zusammenfassung
      y += 8;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Zusammenfassung:", margin, y);
      doc.setFont("helvetica", "normal");
      y += 5;
      doc.text("Hauptbereiche mit Hilfebedarf: _______________________________________________", margin, y);
      y += 6;
      doc.text("Geschätzte tägliche Pflegezeit: _________ Minuten", margin, y);
      y += 6;
      doc.text("Besondere Vorkommnisse: ___________________________________________________", margin, y);

      // Disclaimer Footer
      doc.setFontSize(7);
      doc.setTextColor(128, 128, 128);
      const disclaimer =
        "Dieses Pflegetagebuch dient ausschließlich der Orientierung und Vorbereitung auf die Begutachtung durch den " +
        "Medizinischen Dienst (MD). Es ersetzt keine offizielle Begutachtung. Erstellt mit nachbar.io — Kostenlose " +
        "Beratung: 030 340 60 66-02 (Pflegestützpunkt). Alle Angaben ohne Gewähr.";
      doc.text(disclaimer, margin, pageHeight - 10, { maxWidth: totalWidth });

      // Auch auf Seite 1 den Disclaimer
      doc.setPage(1);
      doc.setFontSize(7);
      doc.setTextColor(128, 128, 128);
      doc.text(disclaimer, margin, pageHeight - 10, { maxWidth: totalWidth });

      // Download
      doc.save("pflegetagebuch-2-wochen.pdf");
    } catch (error) {
      console.error("PDF-Erstellung fehlgeschlagen:", error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      type="button"
      onClick={generatePdf}
      disabled={generating}
      className="
        w-full min-h-[56px] px-4 py-3 rounded-xl
        border-2 border-quartier-green bg-quartier-green/5
        text-sm font-medium text-anthrazit
        hover:bg-quartier-green/10 transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center justify-center gap-2
      "
    >
      {generating ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin text-quartier-green" />
          PDF wird erstellt...
        </>
      ) : (
        <>
          <FileDown className="h-5 w-5 text-quartier-green" />
          Pflegetagebuch herunterladen (PDF)
        </>
      )}
    </button>
  );
}
