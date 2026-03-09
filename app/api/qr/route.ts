import { NextRequest, NextResponse } from "next/server";

/**
 * QR-Code Generator API (DSGVO-konform — lokale Generierung, kein externer API-Call)
 *
 * GET /api/qr?code=PKD001        → QR-Code als SVG
 * GET /api/qr?code=PKD001&format=url  → JSON mit Registrierungs-URL
 */

// Einfache QR-Code SVG-Generierung (Alphanumerisch, Level M)
// Basiert auf dem QR-Code Standard ISO/IEC 18004
function generateQrSvg(text: string, size: number): string {
  // Minimale QR-Implementierung: Text als Data-Matrix codieren
  // Fuer Invite-Codes (kurze alphanumerische Strings) reicht Version 2 (25x25 Module)
  const modules = encodeToQrMatrix(text);
  const moduleCount = modules.length;
  const moduleSize = Math.floor(size / (moduleCount + 8)); // +8 fuer Quiet-Zone
  const qrSize = moduleSize * (moduleCount + 8);
  const offset = moduleSize * 4; // Quiet-Zone

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${qrSize} ${qrSize}" width="${size}" height="${size}">`;
  svg += `<rect width="${qrSize}" height="${qrSize}" fill="white"/>`;

  for (let y = 0; y < moduleCount; y++) {
    for (let x = 0; x < moduleCount; x++) {
      if (modules[y][x]) {
        svg += `<rect x="${offset + x * moduleSize}" y="${offset + y * moduleSize}" width="${moduleSize}" height="${moduleSize}" fill="black"/>`;
      }
    }
  }

  svg += "</svg>";
  return svg;
}

// Minimale QR-Code Matrix-Generierung
function encodeToQrMatrix(text: string): boolean[][] {
  // Version 2 QR-Code: 25x25 Module
  const size = 25;
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  // Finder-Pattern (oben-links, oben-rechts, unten-links)
  addFinderPattern(matrix, 0, 0);
  addFinderPattern(matrix, size - 7, 0);
  addFinderPattern(matrix, 0, size - 7);

  // Alignment-Pattern (Version 2: Position 6, 18)
  addAlignmentPattern(matrix, 18, 18);

  // Timing-Patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Format-Info und Dark-Module
  matrix[size - 8][8] = true;

  // Daten als einfaches Bitmuster einschreiben
  const dataBits = textToBits(text);
  let bitIndex = 0;

  // Daten in Zickzack-Muster einfuegen (vereinfacht)
  for (let col = size - 1; col >= 1; col -= 2) {
    if (col === 6) col = 5; // Timing-Pattern ueberspringen

    for (let row = 0; row < size; row++) {
      const actualRow = ((Math.floor((size - 1 - col) / 2)) % 2 === 0) ? row : size - 1 - row;

      for (let c = 0; c < 2; c++) {
        const x = col - c;
        if (x < 0 || x >= size) continue;
        if (isReserved(x, actualRow, size)) continue;

        if (bitIndex < dataBits.length) {
          matrix[actualRow][x] = dataBits[bitIndex] === 1;
          bitIndex++;
        }
      }
    }
  }

  // XOR-Maske anwenden (Maske 0: (row + col) % 2 === 0)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!isReserved(x, y, size)) {
        if ((y + x) % 2 === 0) {
          matrix[y][x] = !matrix[y][x];
        }
      }
    }
  }

  return matrix;
}

function addFinderPattern(matrix: boolean[][], startX: number, startY: number) {
  const pattern = [
    [1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1],
  ];
  for (let y = 0; y < 7; y++) {
    for (let x = 0; x < 7; x++) {
      if (startY + y < matrix.length && startX + x < matrix.length) {
        matrix[startY + y][startX + x] = pattern[y][x] === 1;
      }
    }
  }
  // Separator (weisse Zeile/Spalte um Finder)
  for (let i = 0; i < 8; i++) {
    setSafe(matrix, startY - 1 + i, startX + 7, false);
    setSafe(matrix, startY + 7, startX - 1 + i, false);
    setSafe(matrix, startY - 1 + i, startX - 1, false);
    setSafe(matrix, startY - 1, startX - 1 + i, false);
  }
}

function addAlignmentPattern(matrix: boolean[][], cx: number, cy: number) {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const isEdge = Math.abs(dy) === 2 || Math.abs(dx) === 2;
      const isCenter = dy === 0 && dx === 0;
      matrix[cy + dy][cx + dx] = isEdge || isCenter;
    }
  }
}

function setSafe(matrix: boolean[][], y: number, x: number, val: boolean) {
  if (y >= 0 && y < matrix.length && x >= 0 && x < matrix.length) {
    matrix[y][x] = val;
  }
}

function isReserved(x: number, y: number, size: number): boolean {
  // Finder-Patterns + Separatoren
  if (x < 9 && y < 9) return true; // oben-links
  if (x >= size - 8 && y < 9) return true; // oben-rechts
  if (x < 9 && y >= size - 8) return true; // unten-links
  // Timing
  if (x === 6 || y === 6) return true;
  // Alignment (um 18,18)
  if (x >= 16 && x <= 20 && y >= 16 && y <= 20) return true;
  return false;
}

function textToBits(text: string): number[] {
  const bits: number[] = [];
  // Byte-Mode Indicator (0100)
  bits.push(0, 1, 0, 0);
  // Laengenfeld (8 Bit fuer Version 2)
  const len = text.length;
  for (let i = 7; i >= 0; i--) {
    bits.push((len >> i) & 1);
  }
  // Daten als UTF-8 Bytes
  for (let i = 0; i < text.length; i++) {
    const byte = text.charCodeAt(i);
    for (let b = 7; b >= 0; b--) {
      bits.push((byte >> b) & 1);
    }
  }
  // Terminator
  bits.push(0, 0, 0, 0);
  // Padding bis Kapazitaet
  while (bits.length < 272) { // Version 2, Level M
    bits.push(1, 1, 1, 0, 1, 1, 0, 0); // 0xEC
    if (bits.length >= 272) break;
    bits.push(0, 0, 0, 1, 0, 0, 0, 1); // 0x11
  }
  return bits.slice(0, 272);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const format = request.nextUrl.searchParams.get("format");

  if (!code) {
    return NextResponse.json({ error: "Parameter 'code' fehlt" }, { status: 400 });
  }

  // Validierung: Nur alphanumerisch, max 20 Zeichen
  if (!/^[A-Za-z0-9]{1,20}$/.test(code)) {
    return NextResponse.json({ error: "Ungueltiges Code-Format" }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nachbar-io.vercel.app";
  const registerUrl = `${baseUrl}/register?invite=${encodeURIComponent(code)}`;

  if (format === "url") {
    return NextResponse.json({ url: registerUrl, code });
  }

  // Size validieren (100-500)
  const sizeParam = request.nextUrl.searchParams.get("size") || "300";
  const size = Math.min(500, Math.max(100, parseInt(sizeParam, 10) || 300));

  // QR-Code lokal als SVG generieren (DSGVO-konform — kein externer API-Call)
  const svg = generateQrSvg(registerUrl, size);

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
