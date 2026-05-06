// Medizinische Begriffe die NIEMALS gespeichert werden duerfen
// Kein Medizinprodukt (RPP-001) — nur Alltags-Assistent

const DIAGNOSEN = [
  'diabetes', 'demenz', 'alzheimer', 'parkinson', 'krebs', 'tumor',
  'schlaganfall', 'herzinfarkt', 'epilepsie', 'depression', 'arthrose',
  'osteoporose', 'copd', 'asthma', 'rheuma', 'multiple sklerose',
  'inkontinenz', 'thrombose', 'embolie', 'sepsis', 'pneumonie',
  'diagnose', 'diagnostiziert', 'erkrankt', 'erkrankung',
];

const MEDIKAMENTE = [
  'metformin', 'aspirin', 'ibuprofen', 'paracetamol', 'ramipril',
  'bisoprolol', 'simvastatin', 'omeprazol', 'amlodipin', 'insulin',
  'marcumar', 'eliquis', 'xarelto', 'kortison', 'antibiotik',
  'antidepressiv', 'neuroleptik', 'opioid', 'morphin', 'tramadol',
  'tablette', 'dosierung', 'medikament', 'rezept', 'verschrieben',
  'mg', 'tropfen', 'spritze', 'infusion',
];

const VITALWERTE = [
  'blutdruck', 'blutzucker', 'puls', 'herzfrequenz', 'sauerstoff',
  'temperatur', 'fieber', 'bmi', 'gewicht', 'blutbild', 'hba1c',
  'cholesterin', 'kreatinin', 'leberwerte',
];

const THERAPIEN = [
  'chemotherapie', 'bestrahlung', 'dialyse', 'reha', 'physiotherapie',
  'ergotherapie', 'logopaedie', 'psychotherapie', 'operation', 'op',
  'eingriff', 'transplantation', 'bypass',
];

const ALL_TERMS = [
  ...DIAGNOSEN, ...MEDIKAMENTE, ...VITALWERTE, ...THERAPIEN,
];

// Kompilierter Regex fuer Performance
const MEDICAL_REGEX = new RegExp(
  `\\b(${ALL_TERMS.join('|')})`,
  'i'
);

function normalizeGermanUmlauts(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss');
}

function stripDiacritics(text: string): string {
  return text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

export function containsMedicalTerms(text: string): boolean {
  // Umlaute und absichtlich gesetzte Diakritika normalisieren fuer Matching.
  const lower = text.toLowerCase();
  const normalized = normalizeGermanUmlauts(text);
  const withoutDiacritics = stripDiacritics(lower);

  return (
    MEDICAL_REGEX.test(normalized)
    || MEDICAL_REGEX.test(withoutDiacritics)
    || MEDICAL_REGEX.test(lower)
  );
}
