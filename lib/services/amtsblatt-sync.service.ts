// Nachbar.io — Amtsblatt-Sync Service
// Laedt neue Amtsblatt-Ausgaben von bad-saeckingen.de, extrahiert Text per pdf-parse
// und strukturiert die Meldungen via Claude Haiku.

import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";
import {
  AMTSBLATT_PAGE_URL,
  extractPdfUrls,
  parseAmtsblattFilename,
  extractTextFromPdf,
  buildExtractionPrompt,
  parseExtractionResponse,
  EXTRACTION_SYSTEM_PROMPT,
} from "@/lib/municipal/amtsblatt";

const LOG_PREFIX = "[amtsblatt-sync]";

export interface AmtsblattSyncResult {
  message: string;
  pdfs_found: number;
  announcements_imported: number;
}

export async function runAmtsblattSync(
  supabase: SupabaseClient
): Promise<AmtsblattSyncResult> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    throw new ServiceError("ANTHROPIC_API_KEY nicht gesetzt", 500, "MISSING_API_KEY");
  }

  console.log(`${LOG_PREFIX} Starte Amtsblatt-Sync...`);

  // 1. Amtsblatt-Seite abrufen und PDF-URLs extrahieren
  const pageResponse = await fetch(AMTSBLATT_PAGE_URL, {
    headers: { "User-Agent": "QuartierApp/1.0 (Community-Info)" },
  });
  if (!pageResponse.ok) {
    throw new Error(`Amtsblatt-Seite nicht erreichbar: ${pageResponse.status}`);
  }
  const html = await pageResponse.text();
  const pdfUrls = extractPdfUrls(html);

  // Neuestes PDF zuerst: nach Jahr + Ausgabenummer absteigend sortieren
  pdfUrls.sort((a, b) => {
    const aInfo = parseAmtsblattFilename(a);
    const bInfo = parseAmtsblattFilename(b);
    if (!aInfo || !bInfo) return 0;
    const aKey = `${aInfo.year}_${aInfo.issueNumber}`;
    const bKey = `${bInfo.year}_${bInfo.issueNumber}`;
    return bKey.localeCompare(aKey);
  });

  if (pdfUrls.length === 0) {
    console.log(`${LOG_PREFIX} Keine PDF-URLs gefunden`);
    return { message: "Keine PDFs gefunden", pdfs_found: 0, announcements_imported: 0 };
  }

  console.log(`${LOG_PREFIX} ${pdfUrls.length} PDF-URLs gefunden`);

  // Quartier Bad Säckingen ermitteln
  const { data: quarter } = await supabase
    .from("quarters")
    .select("id")
    .or("name.ilike.%Bad Säckingen%,name.ilike.%Purkersdorfer%")
    .limit(1)
    .single();

  if (!quarter) {
    throw new Error("Quartier Bad Säckingen nicht gefunden");
  }

  let totalImported = 0;

  // 2. Nur das NEUESTE PDF verarbeiten (Amtsblatt erscheint 14-tägig)
  // URLs sind chronologisch, neueste zuerst → nur pdfUrls[0]
  const latestPdfs = pdfUrls.slice(0, 1);
  for (const pdfUrl of latestPdfs) {
    const fileInfo = parseAmtsblattFilename(pdfUrl);
    if (!fileInfo) {
      console.log(`${LOG_PREFIX} Unbekanntes Dateiformat: ${pdfUrl}`);
      continue;
    }

    // Duplikat-Check
    const { data: existing } = await supabase
      .from("amtsblatt_issues")
      .select("id")
      .eq("quarter_id", quarter.id)
      .eq("issue_number", fileInfo.issueNumber)
      .eq("pdf_url", pdfUrl)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`${LOG_PREFIX} Bereits importiert: ${fileInfo.issueNumber}`);
      continue;
    }

    // 3. Issue-Eintrag anlegen (status: processing)
    const { data: issue, error: issueError } = await supabase
      .from("amtsblatt_issues")
      .insert({
        quarter_id: quarter.id,
        issue_number: fileInfo.issueNumber,
        issue_date: new Date().toISOString().split("T")[0], // Wird später aus PDF korrigiert
        pdf_url: pdfUrl,
        status: "processing",
      })
      .select("id")
      .single();

    if (issueError || !issue) {
      console.error(`${LOG_PREFIX} Issue-Insert Fehler:`, issueError);
      continue;
    }

    try {
      // 4. PDF herunterladen
      console.log(`${LOG_PREFIX} Lade PDF: ${pdfUrl}`);
      const pdfResponse = await fetch(pdfUrl);
      if (!pdfResponse.ok) {
        throw new Error(`PDF nicht ladbar: ${pdfResponse.status}`);
      }
      const pdfArrayBuffer = await pdfResponse.arrayBuffer();
      const pdfBuffer = Buffer.from(pdfArrayBuffer);

      // 5. Text extrahieren
      const { text: rawText, pages } = await extractTextFromPdf(pdfBuffer);
      console.log(`${LOG_PREFIX} ${pages} Seiten, ${rawText.length} Zeichen extrahiert`);

      if (rawText.length < 100) {
        throw new Error("Zu wenig Text extrahiert — möglicherweise Scan-PDF");
      }

      // Ausgabe-Datum aus dem Text extrahieren (Pattern: "Samstag, DD. Monat YYYY")
      const dateMatch = rawText.match(
        /(?:Samstag|Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Sonntag),\s+(\d{1,2})\.\s+(\w+)\s+(\d{4})/
      );
      let issueDate = new Date().toISOString().split("T")[0];
      if (dateMatch) {
        const monthMap: Record<string, string> = {
          Januar: "01", Februar: "02", "März": "03", April: "04",
          Mai: "05", Juni: "06", Juli: "07", August: "08",
          September: "09", Oktober: "10", November: "11", Dezember: "12",
        };
        const month = monthMap[dateMatch[2]];
        if (month) {
          issueDate = `${dateMatch[3]}-${month}-${dateMatch[1].padStart(2, "0")}`;
        }
      }

      // 6. Claude Haiku: Strukturierte Meldungen extrahieren
      console.log(`${LOG_PREFIX} Sende an Claude Haiku...`);
      const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 16000,
          system: EXTRACTION_SYSTEM_PROMPT,
          messages: [
            { role: "user", content: buildExtractionPrompt(rawText) },
          ],
        }),
      });

      if (!aiResponse.ok) {
        const errBody = await aiResponse.text();
        throw new Error(`Claude API Fehler ${aiResponse.status}: ${errBody.slice(0, 200)}`);
      }

      const aiData = await aiResponse.json();
      const aiText = aiData?.content?.[0]?.text ?? "";
      const items = parseExtractionResponse(aiText);

      console.log(`${LOG_PREFIX} ${items.length} Meldungen extrahiert`);

      // 7. Meldungen in municipal_announcements einfügen
      if (items.length > 0) {
        const announcements = items.map((item) => ({
          quarter_id: quarter.id,
          author_id: null, // System-generiert
          title: item.title,
          body: item.body,
          category: item.category,
          source_url: pdfUrl,
          amtsblatt_issue_id: issue.id,
          pinned: false,
          published_at: issueDate,
          event_date: item.event_date || null,
        }));

        const { error: insertError } = await supabase
          .from("municipal_announcements")
          .insert(announcements);

        if (insertError) {
          throw new Error(`Announcements-Insert Fehler: ${insertError.message}`);
        }
      }

      // 8. Issue-Status aktualisieren
      await supabase
        .from("amtsblatt_issues")
        .update({
          status: "done",
          pages,
          issue_date: issueDate,
          extracted_count: items.length,
        })
        .eq("id", issue.id);

      totalImported += items.length;
      console.log(`${LOG_PREFIX} Ausgabe ${fileInfo.issueNumber}: ${items.length} Meldungen importiert`);

    } catch (err) {
      // Fehler fuer diese Ausgabe loggen, aber andere weiter verarbeiten
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`${LOG_PREFIX} Fehler bei ${pdfUrl}:`, errorMsg);
      await supabase
        .from("amtsblatt_issues")
        .update({ status: "error", error_message: errorMsg })
        .eq("id", issue.id);
    }
  }

  console.log(`${LOG_PREFIX} Fertig. ${totalImported} Meldungen importiert.`);
  return {
    message: "Amtsblatt-Sync abgeschlossen",
    pdfs_found: pdfUrls.length,
    announcements_imported: totalImported,
  };
}
