// Welle G — Test-Helper-Pflicht: TDD-Tests fuer den zentralen E2E-Auth-User-Helper.
// Implementation lebt in tests/e2e/helpers/test-user-factory.ts (von Vitest excluded);
// Tests testen die Factory hier, weil __tests__/ von Vitest gepickt wird.

import { describe, expect, it, vi } from "vitest";

import {
  createTestAuthUser,
  upsertTestUserProfile,
} from "@/tests/e2e/helpers/test-user-factory";

type FetchMock = ReturnType<typeof vi.fn>;

function jsonResponse(
  status: number,
  body: unknown,
  ok = status >= 200 && status < 300,
): Response {
  const text =
    typeof body === "string" ? body : JSON.stringify(body ?? {});
  return {
    ok,
    status,
    json: async () => (typeof body === "string" ? {} : body ?? {}),
    text: async () => text,
  } as unknown as Response;
}

describe("createTestAuthUser", () => {
  const baseDeps = (fetchMock: FetchMock) => ({
    fetch: fetchMock as unknown as typeof fetch,
    supabaseUrl: "http://sb.test",
    serviceKey: "svc-key",
  });

  it("schreibt is_test_user=true in app_metadata UND user_metadata des Auth-Users", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(200, { id: "uid-1", email: "e2e-foo@nachbar.local" }),
      );

    const result = await createTestAuthUser(
      { email: "e2e-foo@nachbar.local", password: "pw-1" },
      baseDeps(fetchMock),
    );

    expect(result.userId).toBe("uid-1");
    expect(result.reused).toBe(false);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://sb.test/auth/v1/admin/users");
    expect(init.method).toBe("POST");
    const body = JSON.parse(String(init.body));
    expect(body.email).toBe("e2e-foo@nachbar.local");
    expect(body.password).toBe("pw-1");
    expect(body.email_confirm).toBe(true);
    expect(body.app_metadata?.is_test_user).toBe(true);
    expect(body.user_metadata?.is_test_user).toBe(true);
  });

  it("setzt test_user_kind in beiden Metadata-Buckets, wenn testKind angegeben ist", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { id: "uid-2" }));

    await createTestAuthUser(
      {
        email: "e2e-bar@nachbar.local",
        password: "pw-2",
        testKind: "e2e_pilot",
      },
      baseDeps(fetchMock),
    );

    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body.app_metadata.is_test_user).toBe(true);
    expect(body.app_metadata.test_user_kind).toBe("e2e_pilot");
    expect(body.user_metadata.test_user_kind).toBe("e2e_pilot");
  });

  it("reused bestehenden User via signInWithPassword bei 'already been registered'", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          422,
          "A user with this email has already been registered",
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, { user: { id: "uid-existing" } }),
      );

    const result = await createTestAuthUser(
      { email: "e2e-existing@nachbar.local", password: "pw" },
      baseDeps(fetchMock),
    );

    expect(result.userId).toBe("uid-existing");
    expect(result.reused).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe(
      "http://sb.test/auth/v1/token?grant_type=password",
    );
  });

  it("wirft, wenn Supabase URL oder Service Key fehlen", async () => {
    const fetchMock = vi.fn();

    await expect(
      createTestAuthUser(
        { email: "x@x", password: "p" },
        {
          fetch: fetchMock as unknown as typeof fetch,
          supabaseUrl: "",
          serviceKey: "svc",
        },
      ),
    ).rejects.toThrow(/SUPABASE_URL/);

    await expect(
      createTestAuthUser(
        { email: "x@x", password: "p" },
        {
          fetch: fetchMock as unknown as typeof fetch,
          supabaseUrl: "http://sb.test",
          serviceKey: "",
        },
      ),
    ).rejects.toThrow(/SERVICE_ROLE/);
  });

  it("wirft bei unerwartetem HTTP-Fehler", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(500, "Server Error"));

    await expect(
      createTestAuthUser(
        { email: "x@x", password: "p" },
        baseDeps(fetchMock),
      ),
    ).rejects.toThrow(/500/);
  });
});

describe("upsertTestUserProfile", () => {
  const baseDeps = (fetchMock: FetchMock) => ({
    fetch: fetchMock as unknown as typeof fetch,
    supabaseUrl: "http://sb.test",
    serviceKey: "svc-key",
  });

  it("setzt settings.is_test_user=true und merged extraSettings", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(201, []));

    const result = await upsertTestUserProfile(
      {
        userId: "uid-1",
        displayName: "E2E Foo",
        email: "foo@x.local",
        uiMode: "active",
        trustLevel: "verified",
        isAdmin: false,
        role: "resident",
        extraSettings: { onboarding_completed: true, foo: "bar" },
      },
      baseDeps(fetchMock),
    );

    expect(result.userId).toBe("uid-1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://sb.test/rest/v1/users");
    expect(init.method).toBe("POST");
    expect(
      (init.headers as Record<string, string>).Prefer,
    ).toMatch(/merge-duplicates/);
    const body = JSON.parse(String(init.body));
    expect(body.id).toBe("uid-1");
    expect(body.display_name).toBe("E2E Foo");
    expect(body.role).toBe("resident");
    expect(body.ui_mode).toBe("active");
    expect(body.trust_level).toBe("verified");
    expect(body.is_admin).toBe(false);
    expect(body.settings.is_test_user).toBe(true);
    expect(body.settings.onboarding_completed).toBe(true);
    expect(body.settings.foo).toBe("bar");
  });

  it("zwingt is_test_user=true, auch wenn extraSettings.is_test_user=false versucht", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(201, []));

    await upsertTestUserProfile(
      {
        userId: "uid-1",
        displayName: "E2E",
        extraSettings: { is_test_user: false },
      },
      baseDeps(fetchMock),
    );

    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body.settings.is_test_user).toBe(true);
  });

  it("setzt settings.test_user_kind, wenn testKind angegeben", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(201, []));

    await upsertTestUserProfile(
      { userId: "uid-1", displayName: "E2E", testKind: "e2e_pilot" },
      baseDeps(fetchMock),
    );

    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body.settings.is_test_user).toBe(true);
    expect(body.settings.test_user_kind).toBe("e2e_pilot");
  });

  it("setzt sinnvolle Defaults (ui_mode=active, role=resident, trust_level=verified)", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(201, []));

    await upsertTestUserProfile(
      { userId: "uid-1", displayName: "E2E" },
      baseDeps(fetchMock),
    );

    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body.ui_mode).toBe("active");
    expect(body.trust_level).toBe("verified");
    expect(body.role).toBe("resident");
    expect(body.is_admin).toBe(false);
  });

  it("wirft bei HTTP-Fehler", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(500, "Server Error"));

    await expect(
      upsertTestUserProfile(
        { userId: "uid-1", displayName: "E2E" },
        baseDeps(fetchMock),
      ),
    ).rejects.toThrow(/500/);
  });
});
