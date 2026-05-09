// Welle G — Vitest-Mock-Builder fuer Test-User mit Pflicht-is_test_user=true.
//
// Wird in Vitest-Tests genutzt, die User-Objekte konstruieren (kein DB-Zugriff).
// Stellt sicher, dass Mock-User immer den is_test_user-Marker tragen, damit
// Tests keine Pseudo-Echt-User durch die Logik schicken.

let counter = 0;

function nextSuffix(): string {
  counter += 1;
  return `${Date.now().toString(36)}-${counter}`;
}

export interface TestUser {
  id: string;
  email: string;
  display_name: string;
  ui_mode: string;
  trust_level: string;
  is_admin: boolean;
  role: string;
  settings: Record<string, unknown> & { is_test_user: true };
  created_at: string;
}

export interface BuildTestUserOptions {
  id?: string;
  email?: string;
  displayName?: string;
  uiMode?: string;
  trustLevel?: string;
  isAdmin?: boolean;
  role?: string;
  testKind?: string;
  settings?: Record<string, unknown>;
  createdAt?: string;
}

/**
 * Baut ein Mock-User-Objekt fuer Vitest-Tests. is_test_user=true wird hart
 * in settings gesetzt und kann ueber options.settings nicht auf false
 * reduziert werden — die Pflichtmarkierung schlaegt nach dem Spread zu.
 */
export function buildTestUser(options: BuildTestUserOptions = {}): TestUser {
  const suffix = nextSuffix();
  const settings: Record<string, unknown> = {
    ...(options.settings ?? {}),
    // Pflicht: nach dem Spread, damit kein Override greift.
    is_test_user: true,
  };
  if (options.testKind) {
    settings.test_user_kind = options.testKind;
  }

  return {
    id: options.id ?? `e2e-test-${suffix}`,
    email: options.email ?? `e2e-test-${suffix}@nachbar.local`,
    display_name: options.displayName ?? `E2E Test ${suffix}`,
    ui_mode: options.uiMode ?? "active",
    trust_level: options.trustLevel ?? "verified",
    is_admin: options.isAdmin ?? false,
    role: options.role ?? "resident",
    settings: settings as TestUser["settings"],
    created_at: options.createdAt ?? new Date().toISOString(),
  };
}
