// Nachbar.io — Storage-Helfer fuer Bilder-Upload
// Kompression, Validierung, Upload zu Supabase Storage

import type { SupabaseClient } from "@supabase/supabase-js";

// Konstanten
export const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
export const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_DIMENSION = 1200; // px (Kategoriebilder)
export const AVATAR_DIMENSION = 400; // px (Avatare)
const BUCKET = "images";

// Preset-Avatar Typ
export interface PresetAvatar {
  id: string;
  emoji: string;
  label: string;
}

export const PRESET_AVATARS: PresetAvatar[] = [
  { id: "person", emoji: "👤", label: "Person" },
  { id: "woman", emoji: "👩", label: "Frau" },
  { id: "man", emoji: "👨", label: "Mann" },
  { id: "elder_woman", emoji: "👵", label: "Seniorin" },
  { id: "elder_man", emoji: "👴", label: "Senior" },
  { id: "family", emoji: "👨‍👩‍👧", label: "Familie" },
  { id: "cat", emoji: "🐱", label: "Katze" },
  { id: "dog", emoji: "🐶", label: "Hund" },
  { id: "garden", emoji: "🌻", label: "Garten" },
  { id: "house", emoji: "🏡", label: "Haus" },
  { id: "tree", emoji: "🌳", label: "Baum" },
  { id: "star", emoji: "⭐", label: "Stern" },
];

// Avatar-URL aufloesen: preset:dog → Emoji, URL → URL, null → Fallback
export function resolveAvatarUrl(
  avatarUrl: string | null
): { type: "preset" | "image" | "default"; value: string } {
  if (!avatarUrl) return { type: "default", value: "👤" };
  if (avatarUrl.startsWith("preset:")) {
    const presetId = avatarUrl.replace("preset:", "");
    const preset = PRESET_AVATARS.find((p) => p.id === presetId);
    return { type: "preset", value: preset?.emoji ?? "👤" };
  }
  return { type: "image", value: avatarUrl };
}

// Validierung
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Bitte wählen Sie ein Bild im Format JPEG, PNG oder WebP.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "Das Bild ist zu groß. Maximale Größe: 2 MB.";
  }
  return null;
}

// Client-seitige Kompression via Canvas
export async function compressImage(
  file: File,
  maxDimension: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;

      // Proportional verkleinern
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas nicht verfügbar"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      // WebP bevorzugt, Fallback JPEG
      const tryWebP = canvas.toDataURL("image/webp").startsWith("data:image/webp");
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Bildkompression fehlgeschlagen"));
          }
        },
        tryWebP ? "image/webp" : "image/jpeg",
        0.8
      );
    };
    img.onerror = () => reject(new Error("Bild konnte nicht geladen werden"));
    img.src = URL.createObjectURL(file);
  });
}

// Avatar hochladen
export async function uploadAvatar(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<string> {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);

  const blob = await compressImage(file, AVATAR_DIMENSION);
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const path = `avatars/${userId}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { upsert: true, contentType: blob.type });

  if (error) throw new Error("Avatar-Upload fehlgeschlagen: " + error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  // Cache-Buster anhaengen damit Browser das neue Bild laedt
  return data.publicUrl + "?t=" + Date.now();
}

// Kategorie-Bild hochladen
export async function uploadCategoryImage(
  supabase: SupabaseClient,
  folder: "marketplace" | "lost-found" | "leihboerse",
  itemId: string,
  file: File
): Promise<string> {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);

  const blob = await compressImage(file, MAX_DIMENSION);
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const uuid = crypto.randomUUID();
  const path = `${folder}/${itemId}/${uuid}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: blob.type });

  if (error) throw new Error("Bild-Upload fehlgeschlagen: " + error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// Test-Screenshot hochladen
export const SCREENSHOT_DIMENSION = 1600; // px (Screenshots etwas groesser fuer Lesbarkeit)

export async function uploadTestScreenshot(
  supabase: SupabaseClient,
  sessionId: string,
  testPointId: string,
  file: File
): Promise<string> {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);

  const blob = await compressImage(file, SCREENSHOT_DIMENSION);
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const uuid = crypto.randomUUID();
  const path = `test-screenshots/${sessionId}/${testPointId}/${uuid}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: blob.type });

  if (error) throw new Error("Screenshot-Upload fehlgeschlagen: " + error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// Bild loeschen
export async function deleteImage(
  supabase: SupabaseClient,
  publicUrl: string
): Promise<void> {
  // Public URL → Storage-Pfad extrahieren
  const match = publicUrl.match(/\/storage\/v1\/object\/public\/images\/(.+?)(\?|$)/);
  if (!match) return;
  const path = decodeURIComponent(match[1]);

  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw new Error("Bild konnte nicht gelöscht werden: " + error.message);
}
