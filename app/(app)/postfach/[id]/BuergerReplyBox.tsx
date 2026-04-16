"use client";

// Buerger-Antwort-Box fuer das Postfach
// FormData mit optionalen Datei-Anhaengen

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Send, Paperclip, X, FileText, ImageIcon } from "lucide-react";

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 3;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  threadId: string;
}

export default function BuergerReplyBox({ threadId }: Props) {
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const charCount = body.trim().length;
  const isValid = charCount >= 10 && charCount <= 2000;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    setError(null);
    for (const f of selected) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        setError("Nur PDF, JPG und PNG erlaubt.");
        return;
      }
      if (f.size > MAX_FILE_SIZE) {
        setError("Datei zu gross (max. 10 MB).");
        return;
      }
    }
    setFiles((prev) => [...prev, ...selected].slice(0, MAX_FILES));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || loading) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const fd = new FormData();
      fd.append("body", body.trim());
      for (const f of files) {
        fd.append("files", f);
      }

      const res = await fetch(`/api/postfach/${threadId}/antwort`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Antwort konnte nicht gesendet werden.");
        return;
      }

      setBody("");
      setFiles([]);
      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="postfach-reply-form"
      className="rounded-xl border border-gray-200 bg-white p-4"
    >
      <label
        htmlFor="reply-body"
        className="mb-2 block text-sm font-medium text-[#2D3142]"
      >
        Ihre Antwort an das Rathaus
      </label>

      <textarea
        data-testid="postfach-reply-input"
        id="reply-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Ihre Antwort (mind. 10 Zeichen)..."
        rows={4}
        maxLength={2000}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2D3142] placeholder-gray-400 focus:border-[#4CAF87] focus:outline-none focus:ring-1 focus:ring-[#4CAF87]"
        disabled={loading}
      />

      {/* Datei-Anhaenge */}
      {files.length > 0 && (
        <div className="mt-2 space-y-1">
          {files.map((f, i) => (
            <div
              key={`${f.name}-${i}`}
              className="flex items-center gap-2 rounded border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs"
            >
              {f.type === "application/pdf" ? (
                <FileText className="h-3.5 w-3.5 text-red-500" />
              ) : (
                <ImageIcon className="h-3.5 w-3.5 text-blue-500" />
              )}
              <span className="flex-1 truncate">{f.name}</span>
              <span className="text-gray-400">{formatFileSize(f.size)}</span>
              <button type="button" onClick={() => removeFile(i)} className="text-gray-400 hover:text-gray-600">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xs ${charCount > 1900 ? "text-amber-600" : "text-gray-400"}`}>
            {charCount} / 2000
          </span>
          {files.length < MAX_FILES && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
                disabled={loading}
              >
                <Paperclip className="h-3.5 w-3.5" />
                Datei
              </button>
            </>
          )}
        </div>

        <button
          type="submit"
          data-testid="postfach-reply-send-button"
          disabled={!isValid || loading}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#4CAF87] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#3d9a73] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {loading ? "Wird gesendet..." : "Antwort senden"}
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {success && (
        <p data-testid="postfach-reply-success" className="mt-2 text-sm text-[#4CAF87]">
          Antwort wurde erfolgreich gesendet.
        </p>
      )}
    </form>
  );
}
