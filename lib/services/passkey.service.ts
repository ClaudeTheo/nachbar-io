// Nachbar.io — Passkey-Service
// Zentralisiert alle WebAuthn/Passkey-Operationen.
// Wird von 6 API-Routes aufgerufen (credentials, login, registration).

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type { AuthenticatorTransport } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { createClient as createBrowserClient } from "@supabase/supabase-js";
import { getPasskeyConfig, generatePasskeySecret } from "@/lib/auth/passkey";
import { decryptField, encryptField } from "@/lib/care/field-encryption";
import { ServiceError } from "@/lib/services/service-error";

// ============================================================
// Credentials (GET + DELETE)
// ============================================================

/** Alle Passkey-Credentials eines Nutzers auflisten. */
export async function listCredentials(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data: credentials, error } = await supabase
    .from("passkey_credentials")
    .select("id, device_name, created_at, last_used_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new ServiceError("Laden fehlgeschlagen", 500);
  }

  return credentials || [];
}

/** Ein Passkey-Credential loeschen (nur eigenes). */
export async function deleteCredential(
  supabase: SupabaseClient,
  userId: string,
  credentialId: string,
) {
  const { error } = await supabase
    .from("passkey_credentials")
    .delete()
    .eq("id", credentialId)
    .eq("user_id", userId);

  if (error) {
    throw new ServiceError("Löschen fehlgeschlagen", 500);
  }

  return { success: true };
}

// ============================================================
// Login (begin + complete)
// ============================================================

/** Login-Prozess starten: Authentication-Options generieren, Challenge in DB speichern. */
export async function beginLogin(adminSupabase: SupabaseClient) {
  const config = getPasskeyConfig();

  const options = await generateAuthenticationOptions({
    rpID: config.rpID,
    userVerification: "preferred",
  });

  // Challenge in DB speichern statt Cookie (iOS-Kompatibilitaet)
  const { data: row, error } = await adminSupabase
    .from("passkey_challenges")
    .insert({
      challenge: options.challenge,
      expires_at: new Date(Date.now() + 120_000).toISOString(),
    })
    .select("id")
    .single();

  if (error || !row) {
    console.error("[Passkey] Challenge speichern fehlgeschlagen:", error);
    throw new ServiceError("Interner Fehler", 500);
  }

  // Challenge-ID im Response mitgeben (Client sendet sie bei login-complete zurueck)
  return { ...options, challengeId: row.id };
}

/** Login-Prozess abschliessen: Verifizierung + Session-Erzeugung. */
export async function completeLogin(
  adminSupabase: SupabaseClient,
  body: { response?: { id?: string }; challengeId?: string },
) {
  const { response: authResponse, challengeId } = body;

  if (!authResponse?.id) {
    throw new ServiceError("Assertion fehlt", 400);
  }

  if (!challengeId) {
    throw new ServiceError("Challenge-ID fehlt", 400);
  }

  // Challenge aus DB lesen statt Cookie (iOS-Kompatibilitaet)
  const { data: challengeRow, error: challengeError } = await adminSupabase
    .from("passkey_challenges")
    .select("challenge, expires_at")
    .eq("id", challengeId)
    .single();

  if (challengeError || !challengeRow) {
    throw new ServiceError(
      "Challenge nicht gefunden. Bitte erneut versuchen.",
      400,
    );
  }

  console.info("[Passkey] login-complete: Challenge geladen OK");

  // Challenge abgelaufen?
  if (new Date(challengeRow.expires_at) < new Date()) {
    await adminSupabase
      .from("passkey_challenges")
      .delete()
      .eq("id", challengeId);
    throw new ServiceError(
      "Challenge abgelaufen. Bitte erneut versuchen.",
      400,
    );
  }

  // Challenge aufraeumen (einmalig verwendbar)
  await adminSupabase.from("passkey_challenges").delete().eq("id", challengeId);

  const { data: credential, error: credError } = await adminSupabase
    .from("passkey_credentials")
    .select("user_id, credential_id, public_key, counter, transports")
    .eq("credential_id", authResponse.id)
    .maybeSingle();

  if (credError || !credential) {
    throw new ServiceError("Passkey nicht gefunden", 401);
  }

  console.info(
    "[Passkey] login-complete: Credential gefunden OK, user:",
    credential.user_id,
  );

  const config = getPasskeyConfig();

  const verification = await verifyAuthenticationResponse({
    response: authResponse as Parameters<
      typeof verifyAuthenticationResponse
    >[0]["response"],
    expectedChallenge: challengeRow.challenge,
    expectedOrigin: config.origin,
    expectedRPID: config.rpID,
    credential: {
      id: credential.credential_id,
      publicKey: isoBase64URL.toBuffer(credential.public_key),
      counter: credential.counter,
      transports: credential.transports as AuthenticatorTransport[],
    },
  });

  if (!verification.verified) {
    throw new ServiceError("Verifizierung fehlgeschlagen", 401);
  }

  console.info("[Passkey] login-complete: Verifikation OK");

  await adminSupabase
    .from("passkey_credentials")
    .update({
      counter: verification.authenticationInfo.newCounter,
      last_used_at: new Date().toISOString(),
    })
    .eq("credential_id", credential.credential_id);

  const { data: authUser } = await adminSupabase.auth.admin.getUserById(
    credential.user_id,
  );
  if (!authUser?.user?.email) {
    throw new ServiceError("Nutzer nicht gefunden", 401);
  }

  const { data: profile } = await adminSupabase
    .from("users")
    .select("passkey_secret, ui_mode")
    .eq("id", credential.user_id)
    .single();

  if (!profile?.passkey_secret) {
    throw new ServiceError("Passkey-Konfiguration unvollständig", 500);
  }

  const secret = decryptField(profile.passkey_secret);
  if (!secret) {
    throw new ServiceError("Entschlüsselung fehlgeschlagen", 500);
  }

  console.info("[Passkey] login-complete: Decrypt OK");

  // Supabase-Session erzeugen via Anon-Key Client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

  let signInResult = await supabase.auth.signInWithPassword({
    email: authUser.user.email,
    password: secret,
  });

  // Secret-Recovery: Wenn Passwort nicht passt (z.B. manuell geaendert),
  // neues Secret generieren und als Passwort setzen
  if (signInResult.error) {
    console.warn(
      "[Passkey] signInWithPassword fehlgeschlagen, versuche Secret-Recovery:",
      signInResult.error.message,
    );

    const newSecret = generatePasskeySecret();
    const { error: updatePwError } =
      await adminSupabase.auth.admin.updateUserById(credential.user_id, {
        password: newSecret,
      });

    if (updatePwError) {
      console.error(
        "[Passkey] Secret-Recovery: Passwort-Update fehlgeschlagen:",
        updatePwError,
      );
      throw new ServiceError("Session-Erzeugung fehlgeschlagen", 500);
    }

    // Neues Secret verschluesselt speichern
    await adminSupabase
      .from("users")
      .update({ passkey_secret: encryptField(newSecret) })
      .eq("id", credential.user_id);

    // Retry mit neuem Secret
    signInResult = await supabase.auth.signInWithPassword({
      email: authUser.user.email,
      password: newSecret,
    });

    if (signInResult.error) {
      console.error(
        "[Passkey] Secret-Recovery: Retry fehlgeschlagen:",
        signInResult.error,
      );
      throw new ServiceError("Session-Erzeugung fehlgeschlagen", 500);
    }

    console.info(
      "[Passkey] Secret-Recovery erfolgreich für User:",
      credential.user_id,
    );
  }

  console.info("[Passkey] login-complete: Session erzeugt OK");

  const session = signInResult.data;
  const redirect = profile.ui_mode === "senior" ? "/senior/home" : "/dashboard";

  return {
    success: true,
    redirect,
    session: {
      access_token: session.session?.access_token,
      refresh_token: session.session?.refresh_token,
    },
  };
}

// ============================================================
// Registration (begin + complete)
// ============================================================

/** Registrierungs-Prozess starten: Registration-Options generieren, Challenge in DB speichern. */
export async function beginPasskeyRegistration(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string | undefined,
) {
  const { data: existing } = await supabase
    .from("passkey_credentials")
    .select("credential_id, transports")
    .eq("user_id", userId);

  const config = getPasskeyConfig();

  const options = await generateRegistrationOptions({
    rpName: config.rpName,
    rpID: config.rpID,
    userName: userEmail || userId,
    userDisplayName: userEmail || "Nutzer",
    attestationType: "none",
    excludeCredentials: (existing || []).map((c) => ({
      id: c.credential_id,
      transports: c.transports as AuthenticatorTransport[],
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  // Challenge in DB speichern statt Cookie (iOS-Kompatibilitaet)
  // Cookies gehen auf iPhone Chrome nach Face-ID-Dialog verloren
  const expiresAt = new Date(Date.now() + 120_000).toISOString(); // 2 Minuten
  await supabase
    .from("users")
    .update({
      passkey_challenge: options.challenge,
      passkey_challenge_expires_at: expiresAt,
    })
    .eq("id", userId);

  return options;
}

/** Registrierungs-Prozess abschliessen: Attestation verifizieren, Credential speichern, Secret generieren. */
export async function completePasskeyRegistration(
  supabase: SupabaseClient,
  adminSupabase: SupabaseClient,
  userId: string,
  body: {
    response?: Record<string, unknown>;
    deviceName?: string;
  },
) {
  // Challenge aus DB lesen statt Cookie (iOS-Kompatibilitaet)
  const { data: profile } = await supabase
    .from("users")
    .select("passkey_challenge, passkey_challenge_expires_at, passkey_secret")
    .eq("id", userId)
    .single();

  const challenge = profile?.passkey_challenge;
  const expiresAt = profile?.passkey_challenge_expires_at;

  if (!challenge) {
    throw new ServiceError(
      "Keine Challenge vorhanden. Bitte erneut versuchen.",
      400,
    );
  }

  // Challenge abgelaufen?
  if (expiresAt && new Date(expiresAt) < new Date()) {
    // Challenge aufraeumen
    await supabase
      .from("users")
      .update({
        passkey_challenge: null,
        passkey_challenge_expires_at: null,
      })
      .eq("id", userId);
    throw new ServiceError(
      "Challenge abgelaufen. Bitte erneut versuchen.",
      400,
    );
  }

  const { response: attResponse, deviceName } = body;

  if (!attResponse) {
    throw new ServiceError("Attestation fehlt", 400);
  }

  const config = getPasskeyConfig();

  const verification = await verifyRegistrationResponse({
    response: attResponse as unknown as Parameters<
      typeof verifyRegistrationResponse
    >[0]["response"],
    expectedChallenge: challenge,
    expectedOrigin: config.origin,
    expectedRPID: config.rpID,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new ServiceError("Verifizierung fehlgeschlagen", 400);
  }

  const { credential } = verification.registrationInfo;

  const { error: insertError } = await supabase
    .from("passkey_credentials")
    .insert({
      user_id: userId,
      credential_id: credential.id,
      public_key: isoBase64URL.fromBuffer(credential.publicKey),
      counter: credential.counter,
      device_name: deviceName || "Unbekanntes Gerät",
      transports:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (attResponse as any).response?.transports || [],
    });

  if (insertError) {
    console.error(
      "[Passkey] Credential speichern fehlgeschlagen:",
      insertError,
    );
    throw new ServiceError("Speichern fehlgeschlagen", 500);
  }

  // Challenge aufraeumen
  await supabase
    .from("users")
    .update({
      passkey_challenge: null,
      passkey_challenge_expires_at: null,
    })
    .eq("id", userId);

  // passkey_secret generieren (falls noch nicht vorhanden)
  if (!profile?.passkey_secret) {
    const secret = generatePasskeySecret();
    const encrypted = encryptField(secret);

    await supabase
      .from("users")
      .update({ passkey_secret: encrypted })
      .eq("id", userId);

    await adminSupabase.auth.admin.updateUserById(userId, {
      password: secret,
    });
  }

  return {
    success: true,
    device_name: deviceName || "Unbekanntes Gerät",
  };
}
