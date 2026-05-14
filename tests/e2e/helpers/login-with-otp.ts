import { expect, type Page } from "@playwright/test";

export type LoginWithOtpResult =
  | { status: "code-requested"; email: string }
  | { status: "logged-in"; email: string };

export interface LoginWithOtpOptions {
  email?: string;
  otp?: string;
  promptForOtp?: boolean;
  redirectPattern?: RegExp;
}

async function askForOtp(): Promise<string | null> {
  if (process.env.CI || !process.stdin.isTTY) return null;

  const readline = await import("node:readline/promises");
  const input = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await input.question(
      "6-stelligen Admin-Login-Code aus der E-Mail eingeben: ",
    );
    return answer.trim();
  } finally {
    input.close();
  }
}

function resolveEmail(options: LoginWithOtpOptions): string {
  const email = options.email ?? process.env.ADMIN_LOGIN_EMAIL;
  if (!email) {
    throw new Error(
      "ADMIN_LOGIN_EMAIL fehlt. Bitte in .env.cloud.test setzen oder als Option uebergeben.",
    );
  }
  return email;
}

async function typeEmailLikeUser(page: Page, email: string): Promise<void> {
  const emailInput = page.getByLabel("E-Mail-Adresse").first();

  await expect(emailInput).toBeVisible();
  await emailInput.click();
  await emailInput.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await emailInput.pressSequentially(email, { delay: 10 });
  await expect(emailInput).toHaveValue(email);
}

async function resolveOtp(options: LoginWithOtpOptions): Promise<string | null> {
  const otp = options.otp ?? process.env.ADMIN_LOGIN_OTP;
  if (otp) return otp.trim();

  if (options.promptForOtp === false) return null;
  return askForOtp();
}

/**
 * Stabiler OTP-Login fuer den echten Admin-Testpfad.
 *
 * Wichtig: Das Email-Feld wird bewusst wie ein Nutzer bedient
 * (click + pressSequentially + toHaveValue), weil type=email bei Playwright
 * auf Windows/Chromium in diesem Projekt mit fill() flaky war.
 */
export async function loginWithOtp(
  page: Page,
  options: LoginWithOtpOptions = {},
): Promise<LoginWithOtpResult> {
  const email = resolveEmail(options);

  await page.goto("/login");
  await expect(page.getByText("Anmelden", { exact: true }).first()).toBeVisible();

  await typeEmailLikeUser(page, email);
  await page
    .getByRole("button", { name: "Anmelde-Code senden" })
    .click();

  await expect(page.getByText("Code eingeben")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(email)).toBeVisible();

  const otp = await resolveOtp(options);
  if (!otp) {
    return { status: "code-requested", email };
  }
  if (!/^\d{6}$/.test(otp)) {
    throw new Error("ADMIN_LOGIN_OTP muss genau 6 Ziffern enthalten.");
  }

  for (let index = 0; index < otp.length; index += 1) {
    const digitInput = page.getByLabel(`Ziffer ${index + 1} von 6`);
    await digitInput.click();
    await digitInput.pressSequentially(otp[index]);
    await expect(digitInput).toHaveValue(otp[index]);
  }

  const redirectPattern =
    options.redirectPattern ?? /\/(after-login|dashboard|jugend|welcome)/;
  await page.waitForURL(redirectPattern, { timeout: 60_000 });

  return { status: "logged-in", email };
}
