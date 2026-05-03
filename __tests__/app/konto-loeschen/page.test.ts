import { describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

describe("KontoLoeschenPage", () => {
  it("leitet den deutschen Store-Alias auf die bestehende Loeschseite", async () => {
    const { default: KontoLoeschenPage } = await import(
      "@/app/konto-loeschen/page"
    );

    KontoLoeschenPage();

    expect(redirectMock).toHaveBeenCalledWith("/account-loeschen");
  });
});
