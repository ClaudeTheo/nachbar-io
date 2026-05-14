import { expect, test } from "@playwright/test";
import { loginWithOtp } from "./helpers/login-with-otp";

test.describe("Admin-Login via OTP", () => {
  test("Admin kann Code anfordern und nach OTP in die Jugend-UI wechseln", async ({
    page,
  }) => {
    const result = await loginWithOtp(page);

    if (result.status === "code-requested") {
      test.info().annotations.push({
        type: "manual-otp",
        description:
          "Code wurde angefordert. Fuer den vollstaendigen Login ADMIN_LOGIN_OTP setzen oder im interaktiven Terminal eingeben.",
      });
      return;
    }

    await page.goto("/jugend");
    await expect(page).toHaveURL(/\/jugend/);
    await expect(page.getByRole("link", { name: "Tauschen" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Gruppen" })).toBeVisible();
    await expect(page.getByText("Verwaltung")).toHaveCount(0);
  });
});
