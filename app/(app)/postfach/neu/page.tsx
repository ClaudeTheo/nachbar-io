"use client";

// Buerger-Postfach: Nachricht an die zustaendige Kommune senden
// FormData mit optionalen Datei-Anhaengen (max 3, PDF/JPG/PNG, je 10MB)

import { useState, useRef } from "react";
import { Send, CheckCircle, AlertCircle, Paperclip, X, FileText, ImageIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 3;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PostfachNeuPage() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit =
    subject.trim().length >= 3 &&
    body.trim().length >= 10 &&
    !sending &&
    !success;

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

    const merged = [...files, ...selected].slice(0, MAX_FILES);
    setFiles(merged);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSending(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append("subject", subject.trim());
      fd.append("body", body.trim());
      for (const f of files) {
        fd.append("files", f);
      }

      const res = await fetch("/api/postfach", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Nachricht konnte nicht gesendet werden.");
        return;
      }

      setSuccess(
        `Ihre Nachricht wurde an ${data.org_name ?? "Ihre Kommune"} gesendet.`,
      );
      setSubject("");
      setBody("");
      setFiles([]);
    } catch {
      setError("Netzwerkfehler. Bitte pruefen Sie Ihre Internetverbindung.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Nachricht an die Kommune"
        subtitle="Senden Sie eine allgemeine Anfrage an Ihre zustaendige Gemeindeverwaltung."
        backHref="/dashboard"
      />

      {success && (
        <div
          data-testid="postfach-send-success"
          className="mx-4 mt-4 flex items-center gap-3 rounded-lg bg-green-50 p-4 text-sm text-green-800"
        >
          <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600" />
          <div>
            <p className="font-medium">{success}</p>
            <p className="mt-1 text-green-700">
              Die Verwaltung wird sich bei Ihnen melden.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mx-4 mt-4 flex items-center gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
          {error}
        </div>
      )}

      {!success && (
        <form onSubmit={handleSubmit} className="mx-4 mt-6 space-y-4">
          <div>
            <label
              htmlFor="postfach-subject"
              className="mb-1 block text-sm font-medium text-[#2D3142]"
            >
              Betreff
            </label>
            <input
              data-testid="postfach-subject-input"
              id="postfach-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value.slice(0, 200))}
              placeholder="Worum geht es?"
              maxLength={200}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-[#2D3142] placeholder:text-gray-400 focus:border-[#4CAF87] focus:outline-none focus:ring-1 focus:ring-[#4CAF87]"
            />
            <p className="mt-1 text-xs text-gray-400">
              {subject.length}/200 Zeichen
            </p>
          </div>

          <div>
            <label
              htmlFor="postfach-body"
              className="mb-1 block text-sm font-medium text-[#2D3142]"
            >
              Nachricht
            </label>
            <textarea
              data-testid="postfach-body-input"
              id="postfach-body"
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 2000))}
              placeholder="Beschreiben Sie Ihr Anliegen..."
              maxLength={2000}
              rows={6}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-[#2D3142] placeholder:text-gray-400 focus:border-[#4CAF87] focus:outline-none focus:ring-1 focus:ring-[#4CAF87]"
            />
            <p className="mt-1 text-xs text-gray-400">
              {body.length}/2000 Zeichen
            </p>
          </div>

          {/* Datei-Anhaenge */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[#2D3142]">
              Dateien anhaengen (optional)
            </label>

            {files.length > 0 && (
              <div className="mb-2 space-y-1">
                {files.map((f, i) => (
                  <div
                    key={`${f.name}-${i}`}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                  >
                    {f.type === "application/pdf" ? (
                      <FileText className="h-4 w-4 text-red-500" />
                    ) : (
                      <ImageIcon className="h-4 w-4 text-blue-500" />
                    )}
                    <span className="flex-1 truncate text-[#2D3142]">{f.name}</span>
                    <span className="text-xs text-gray-400">{formatFileSize(f.size)}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {files.length < MAX_FILES && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-attach"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex min-h-[48px] items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"
                >
                  <Paperclip className="h-4 w-4" />
                  Datei anhaengen (PDF, JPG, PNG — max. 10 MB)
                </button>
              </>
            )}

            <p className="mt-1 text-xs text-gray-400">
              {files.length}/{MAX_FILES} Dateien
            </p>
          </div>

          <button
            type="submit"
            data-testid="postfach-send-button"
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded-lg bg-[#4CAF87] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#3d9a73] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {sending ? "Wird gesendet..." : "Nachricht senden"}
          </button>
        </form>
      )}
    </div>
  );
}
