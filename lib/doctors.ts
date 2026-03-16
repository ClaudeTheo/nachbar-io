// lib/doctors.ts
// Nachbar.io — Validierung fuer Arzt-Profile und Bewertungen (Pro Medical)

// --- Typen ---

export interface DoctorProfileInput {
  specialization?: unknown;
  bio?: unknown;
  visible?: unknown;
  accepts_new_patients?: unknown;
  video_consultation?: unknown;
  quarter_ids?: unknown;
}

export interface DoctorReviewInput {
  rating?: unknown;
  text?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// --- Validierung: Arzt-Profil ---

export function validateDoctorProfile(body: Record<string, unknown>): ValidationResult {
  const { specialization, bio, visible } = body;

  // specialization muss ein String-Array sein (wenn angegeben)
  if (specialization !== undefined) {
    if (!Array.isArray(specialization)) {
      return { valid: false, error: 'Fachgebiete muessen als Array angegeben werden' };
    }
    if (!specialization.every((s: unknown) => typeof s === 'string' && s.trim().length > 0)) {
      return { valid: false, error: 'Jedes Fachgebiet muss ein nicht-leerer String sein' };
    }
  }

  // bio: max 2000 Zeichen
  if (bio !== undefined) {
    if (typeof bio !== 'string') {
      return { valid: false, error: 'Bio muss ein String sein' };
    }
    if (bio.length > 2000) {
      return { valid: false, error: 'Bio darf maximal 2000 Zeichen lang sein' };
    }
  }

  // visible: muss boolean sein
  if (visible !== undefined) {
    if (typeof visible !== 'boolean') {
      return { valid: false, error: 'Sichtbarkeit muss ein Boolean sein' };
    }
  }

  // accepts_new_patients: muss boolean sein
  if (body.accepts_new_patients !== undefined) {
    if (typeof body.accepts_new_patients !== 'boolean') {
      return { valid: false, error: 'Neue Patienten annehmen muss ein Boolean sein' };
    }
  }

  // video_consultation: muss boolean sein
  if (body.video_consultation !== undefined) {
    if (typeof body.video_consultation !== 'boolean') {
      return { valid: false, error: 'Video-Sprechstunde muss ein Boolean sein' };
    }
  }

  // quarter_ids: muss UUID-Array sein
  if (body.quarter_ids !== undefined) {
    if (!Array.isArray(body.quarter_ids)) {
      return { valid: false, error: 'Quartier-IDs muessen als Array angegeben werden' };
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!body.quarter_ids.every((id: unknown) => typeof id === 'string' && uuidRegex.test(id))) {
      return { valid: false, error: 'Jede Quartier-ID muss eine gueltige UUID sein' };
    }
  }

  return { valid: true };
}

// --- Validierung: Bewertung ---

export function validateReview(body: Record<string, unknown>): ValidationResult {
  const { rating, text } = body;

  // rating ist Pflicht, muss Ganzzahl 1-5 sein
  if (rating === undefined || rating === null) {
    return { valid: false, error: 'Bewertung (1-5) ist erforderlich' };
  }
  if (typeof rating !== 'number' || !Number.isInteger(rating)) {
    return { valid: false, error: 'Bewertung muss eine Ganzzahl sein' };
  }
  if (rating < 1 || rating > 5) {
    return { valid: false, error: 'Bewertung muss zwischen 1 und 5 liegen' };
  }

  // text: optional, max 1000 Zeichen
  if (text !== undefined && text !== null) {
    if (typeof text !== 'string') {
      return { valid: false, error: 'Bewertungstext muss ein String sein' };
    }
    if (text.length > 1000) {
      return { valid: false, error: 'Bewertungstext darf maximal 1000 Zeichen lang sein' };
    }
  }

  return { valid: true };
}
