// Welle G — Test-Helper-Pflicht: Zentraler Auth-User-Helper fuer E2E.
//
// Pflicht: Jeder Auth-User, der ueber diesen Helper angelegt wird, traegt
// is_test_user=true in app_metadata UND user_metadata. Das ist der einzige
// erlaubte Pfad fuer Test-User-Anlagen — direkte fetch-/SDK-Aufrufe in
// Spec-Files oder Skripten sollen darauf umgestellt werden.
//
// Wird aus Vitest-Tests (__tests__/) und E2E-Specs (tests/e2e/) gleichermassen
// genutzt. fetch ist injizierbar, damit Vitest den Pfad ohne Netz testen kann.
//
// Hinweise:
// - Wir reichen Service-Role-Key + URL via Dependency-Injection rein. Default
//   liest die ENV (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).
// - 'is_test_user=true' ist hart erzwungen und kann ueber extraSettings nicht
//   ueberschrieben werden — das verhindert versehentliches Anlegen von
//   Pseudo-Echt-Usern aus Tests heraus.

export interface TestUserFactoryDeps {
  fetch?: typeof fetch;
  supabaseUrl?: string;
  serviceKey?: string;
}

export interface CreateTestAuthUserOptions {
  email: string;
  password: string;
  /** Optionaler Marker fuer den Cleanup (z.B. 'e2e_pilot', 'ai_pilot'). */
  testKind?: string;
}

export interface CreateTestAuthUserResult {
  userId: string;
  email: string;
  /** true, wenn der User bereits existierte und via Sign-In wiederverwendet wurde. */
  reused: boolean;
}

export interface UpsertTestUserProfileOptions {
  userId: string;
  displayName: string;
  email?: string;
  uiMode?: string;
  trustLevel?: string;
  isAdmin?: boolean;
  role?: string;
  testKind?: string;
  extraSettings?: Record<string, unknown>;
}

export interface UpsertTestUserProfileResult {
  userId: string;
}

function resolveDeps(deps?: TestUserFactoryDeps) {
  const fetchImpl = deps?.fetch ?? fetch;
  const supabaseUrl =
    deps?.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceKey =
    deps?.serviceKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!supabaseUrl) {
    throw new Error(
      "[test-user-factory] NEXT_PUBLIC_SUPABASE_URL fehlt — setze die ENV oder reiche supabaseUrl als Dep durch.",
    );
  }
  if (!serviceKey) {
    throw new Error(
      "[test-user-factory] SUPABASE_SERVICE_ROLE_KEY fehlt — setze die ENV oder reiche serviceKey als Dep durch.",
    );
  }
  return { fetchImpl, supabaseUrl, serviceKey };
}

function isAlreadyRegistered(text: string): boolean {
  return (
    text.includes("already been registered") ||
    text.includes("already exists") ||
    text.includes("email_exists") ||
    text.includes("User already registered")
  );
}

/**
 * Legt einen Auth-User via Supabase Admin API an. Erzwingt
 * is_test_user=true in app_metadata UND user_metadata.
 *
 * Bei "already registered" versucht der Helper, den bestehenden User per
 * signInWithPassword zu finden und gibt {reused:true} zurueck.
 */
export async function createTestAuthUser(
  options: CreateTestAuthUserOptions,
  deps?: TestUserFactoryDeps,
): Promise<CreateTestAuthUserResult> {
  const { fetchImpl, supabaseUrl, serviceKey } = resolveDeps(deps);

  const metadata: Record<string, unknown> = { is_test_user: true };
  if (options.testKind) {
    metadata.test_user_kind = options.testKind;
  }

  const body = {
    email: options.email,
    password: options.password,
    email_confirm: true,
    app_metadata: { ...metadata },
    user_metadata: { ...metadata },
  };

  const res = await fetchImpl(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (res.ok) {
    const data = (await res.json()) as { id?: string };
    if (!data?.id) {
      throw new Error(
        `[test-user-factory] Auth-Antwort enthaelt keine id: ${JSON.stringify(data)}`,
      );
    }
    return { userId: data.id, email: options.email, reused: false };
  }

  const text = await res.text();
  if (isAlreadyRegistered(text)) {
    const signInRes = await fetchImpl(
      `${supabaseUrl}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          apikey: serviceKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: options.email,
          password: options.password,
        }),
      },
    );
    if (signInRes.ok) {
      const signInData = (await signInRes.json()) as {
        user?: { id?: string };
      };
      const id = signInData.user?.id;
      if (!id) {
        throw new Error(
          `[test-user-factory] Sign-In-Antwort enthaelt keine user.id: ${JSON.stringify(signInData)}`,
        );
      }
      return { userId: id, email: options.email, reused: true };
    }
    const signInText = await signInRes.text();
    throw new Error(
      `[test-user-factory] User existiert, Sign-In schlug fehl: ${signInRes.status} ${signInText}`,
    );
  }

  throw new Error(
    `[test-user-factory] Auth-User-Anlage schlug fehl: ${res.status} ${text}`,
  );
}

/**
 * Schreibt einen User-Profileintrag in public.users via REST-Upsert. Erzwingt
 * settings.is_test_user=true und merged extraSettings.
 */
export async function upsertTestUserProfile(
  options: UpsertTestUserProfileOptions,
  deps?: TestUserFactoryDeps,
): Promise<UpsertTestUserProfileResult> {
  const { fetchImpl, supabaseUrl, serviceKey } = resolveDeps(deps);

  const settings: Record<string, unknown> = {
    ...(options.extraSettings ?? {}),
    // Pflicht: hart nach dem Spread, damit kein Override greift.
    is_test_user: true,
  };
  if (options.testKind) {
    settings.test_user_kind = options.testKind;
  }

  const profile = {
    id: options.userId,
    email_hash: "",
    display_name: options.displayName,
    ui_mode: options.uiMode ?? "active",
    trust_level: options.trustLevel ?? "verified",
    is_admin: options.isAdmin ?? false,
    role: options.role ?? "resident",
    settings,
    ...(options.email ? { email: options.email } : {}),
  };

  const res = await fetchImpl(`${supabaseUrl}/rest/v1/users`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation,resolution=merge-duplicates",
    },
    body: JSON.stringify(profile),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `[test-user-factory] Profil-Upsert schlug fehl: ${res.status} ${text}`,
    );
  }

  return { userId: options.userId };
}
