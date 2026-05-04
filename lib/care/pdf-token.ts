import { createHash } from "node:crypto";

export function hashEmergencyPdfToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isMissingPdfTokenHashColumn(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;

  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    error.message?.includes("pdf_token_hash") === true ||
    (error.message?.includes("schema cache") === true &&
      error.message?.includes("emergency_profiles") === true)
  );
}
