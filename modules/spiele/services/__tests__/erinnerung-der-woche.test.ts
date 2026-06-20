import { describe, it, expect } from "vitest";
import {
  getErinnerungDerWoche,
  weekIndex,
} from "@/modules/spiele/services/erinnerung-der-woche.service";

// Welle SP2-2: „Erinnerung der Woche". Pro Kalenderwoche genau EIN Foto, stabil
// die ganze Woche, danach rotiert es. Nur Fotos mit Bildunterschrift (= die
// „Geschichte") und gueltiger Signed-URL sind waehlbar.

type P = { id: string; url: string | null; caption: string | null };

const cap = (id: string): P => ({
  id,
  url: `https://signed.example/${id}.jpg`,
  caption: `Geschichte ${id}`,
});

const DAY = 86_400_000;

describe("getErinnerungDerWoche (SP2-2)", () => {
  const photos: P[] = [cap("a"), cap("b"), cap("c")];

  it("gleiche Woche -> gleiches Foto an allen 7 Tagen", () => {
    // Einen Wochen-Anfang finden (Tag, an dem der weekIndex wechselt),
    // dann die 7 Tage dieser Woche pruefen — weekday-agnostisch.
    let d = new Date(Date.UTC(2026, 5, 1));
    while (weekIndex(d) === weekIndex(new Date(d.getTime() - DAY))) {
      d = new Date(d.getTime() + DAY);
    }
    const ids = new Set<string>();
    for (let i = 0; i < 7; i++) {
      ids.add(getErinnerungDerWoche(new Date(d.getTime() + i * DAY), photos)!.id);
    }
    expect(ids.size).toBe(1);
  });

  it("ueber mehrere Wochen rotiert die Auswahl", () => {
    const ids = new Set<string>();
    for (let w = 0; w < photos.length * 2; w++) {
      const d = new Date(Date.UTC(2026, 0, 1 + w * 7));
      ids.add(getErinnerungDerWoche(d, photos)!.id);
    }
    expect(ids.size).toBeGreaterThan(1);
  });

  it("nur Fotos mit Caption UND Signed-URL sind waehlbar", () => {
    const mixed: P[] = [
      { id: "no-cap", url: "https://signed.example/x.jpg", caption: null },
      { id: "blank-cap", url: "https://signed.example/y.jpg", caption: "   " },
      { id: "no-url", url: null, caption: "hat Caption" },
      cap("ok"),
    ];
    const picks = new Set<string>();
    for (let w = 0; w < 12; w++) {
      const d = new Date(Date.UTC(2026, 0, 1 + w * 7));
      picks.add(getErinnerungDerWoche(d, mixed)!.id);
    }
    expect([...picks]).toEqual(["ok"]);
  });

  it("kein captioniertes Foto -> null", () => {
    expect(
      getErinnerungDerWoche(new Date(Date.UTC(2026, 0, 1)), [
        { id: "x", url: "u", caption: null },
      ]),
    ).toBeNull();
    expect(getErinnerungDerWoche(new Date(Date.UTC(2026, 0, 1)), [])).toBeNull();
  });
});
