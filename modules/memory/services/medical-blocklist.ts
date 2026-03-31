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

export function containsMedicalTerms(text: string): boolean {
  // Umlaute normalisieren fuer Matching
  const normalized = text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss');

  return MEDICAL_REGEX.test(normalized) || MEDICAL_REGEX.test(text.toLowerCase());
}
