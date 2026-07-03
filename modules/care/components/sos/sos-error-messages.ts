// W8 (Befund A3:4 Teil 3): Fehlertexte fuer die Senior-Flaeche (source='device').
// Server-Texte wie "Ihr Abo-Plan unterstuetzt diese SOS-Kategorie nicht. Bitte
// upgraden Sie Ihren Plan." oder "Einwilligung erforderlich" sind im
// Notfall-Kontext ein Tonalitaets- und Vertrauensproblem und bieten dem
// Senior keinen Loesungsweg. Das Mapping ist maschinenlesbar (res.status +
// requiredFeature aus app/api/care/sos/route.ts) — bewusst KEIN
// String-Matching auf Server-Texte, damit Text-Aenderungen nichts brechen.
// Die App-Flaeche (Angehoerige, source='app') behaelt die Server-Texte.

export function mapSosErrorForSenior(
  status: number,
  body: { error?: unknown; requiredFeature?: unknown } | null,
): string {
  if (status === 403 && body?.requiredFeature) {
    // Abo-/Feature-Gate — kein Upsell-Wording gegenueber dem Senior.
    return "Diese Taste ist in Ihrer Version nicht freigeschaltet. Bitte sprechen Sie mit Ihrer Familie.";
  }
  if (status === 403) {
    // Care-Einwilligung fehlt — Satz MIT Loesungsweg statt Behoerdendeutsch.
    return "Diese Funktion muss einmal von Ihrer Familie freigeschaltet werden. Bitte sprechen Sie mit Ihrer Familie.";
  }
  return "Das hat leider nicht geklappt. Bitte versuchen Sie es noch einmal.";
}
