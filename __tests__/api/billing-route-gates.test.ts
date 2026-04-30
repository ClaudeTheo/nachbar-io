import { describe, expect, it, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockIsFeatureEnabledServer = vi.fn();
const mockHandleStripeEvent = vi.fn();
const mockHandleStripeWebhook = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/feature-flags-server", () => ({
  isFeatureEnabledServer: (...args: unknown[]) =>
    mockIsFeatureEnabledServer(...args),
}));

vi.mock("@/modules/hilfe/services/hilfe-billing.service", () => ({
  createHilfeCheckout: vi.fn(),
}));

vi.mock("@/modules/praevention/services/payment.service", () => ({
  createPreventionCheckout: vi.fn(),
}));

vi.mock("@/lib/services/billing-webhook.service", () => ({
  handleStripeEvent: (...args: unknown[]) => mockHandleStripeEvent(...args),
}));

vi.mock("@/lib/services/stripe-webhook.service", () => ({
  handleStripeWebhook: (...args: unknown[]) => mockHandleStripeWebhook(...args),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
  },
}));

vi.mock("@/modules/hilfe/services/stripe", () => ({
  getStripe: vi.fn(() => ({
    webhooks: {
      constructEvent: vi.fn(),
    },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: vi.fn(() => ({})),
}));

function postRequest(url: string): NextRequest {
  return new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": "sig-test",
    },
    body: JSON.stringify({}),
  }) as unknown as NextRequest;
}

describe("Billing- und Stripe-Route-Gates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", email: "test@test.de" } },
    });
    mockIsFeatureEnabledServer.mockResolvedValue(false);
  });

  it("gibt 503 fuer /api/hilfe/checkout wenn BILLING_ENABLED false ist", async () => {
    const { POST } = await import("@/app/api/hilfe/checkout/route");

    const response = await POST(postRequest("http://localhost/api/hilfe/checkout"));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Feature in Vorbereitung" });
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("gibt 503 fuer /api/prevention/booking/checkout wenn BILLING_ENABLED false ist", async () => {
    const { POST } = await import(
      "@/app/api/prevention/booking/checkout/route"
    );

    const response = await POST(
      postRequest("http://localhost/api/prevention/booking/checkout"),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Feature in Vorbereitung" });
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("antwortet 200 leer fuer /api/billing/webhook wenn BILLING_ENABLED false ist", async () => {
    const { POST } = await import("@/app/api/billing/webhook/route");

    const response = await POST(postRequest("http://localhost/api/billing/webhook"));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
    expect(mockHandleStripeEvent).not.toHaveBeenCalled();
  });

  it("antwortet 200 leer fuer /api/webhooks/stripe wenn BILLING_ENABLED false ist", async () => {
    const { POST } = await import("@/app/api/webhooks/stripe/route");

    const response = await POST(postRequest("http://localhost/api/webhooks/stripe"));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
    expect(mockHandleStripeWebhook).not.toHaveBeenCalled();
  });
});
