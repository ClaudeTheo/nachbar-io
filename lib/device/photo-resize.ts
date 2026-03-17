// lib/device/photo-resize.ts
// Client-seitiges Resize von Fotos auf max. 1280x800 WebP

const MAX_WIDTH = 1280;
const MAX_HEIGHT = 800;
const QUALITY = 0.85;

/**
 * Resized ein File-Objekt (Bild) auf max. 1280x800 als WebP Blob.
 * Behält Seitenverhältnis bei (cover-crop auf 16:10).
 */
export async function resizePhoto(file: File): Promise<Blob> {
  const img = await loadImage(file);

  // Ziel-Seitenverhältnis 16:10
  const targetRatio = MAX_WIDTH / MAX_HEIGHT;
  const imgRatio = img.width / img.height;

  let sx = 0, sy = 0, sw = img.width, sh = img.height;

  if (imgRatio > targetRatio) {
    // Bild zu breit — links/rechts abschneiden
    sw = Math.round(img.height * targetRatio);
    sx = Math.round((img.width - sw) / 2);
  } else {
    // Bild zu hoch — oben/unten abschneiden
    sh = Math.round(img.width / targetRatio);
    sy = Math.round((img.height - sh) / 2);
  }

  const canvas = document.createElement("canvas");
  canvas.width = MAX_WIDTH;
  canvas.height = MAX_HEIGHT;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, MAX_WIDTH, MAX_HEIGHT);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Canvas-Konvertierung fehlgeschlagen")),
      "image/webp",
      QUALITY,
    );
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = () => reject(new Error("Bild konnte nicht geladen werden"));
    img.src = URL.createObjectURL(file);
  });
}
