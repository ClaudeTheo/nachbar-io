import { readFileSync, readdirSync } from "fs";
import { join, relative } from "path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const SOURCE_ROOTS = ["app", "components", "lib", "modules"];

function sourceFiles(directory: string): string[] {
  const absolute = join(ROOT, directory);
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const path = join(absolute, entry.name);
    if (entry.isDirectory()) return sourceFiles(relative(ROOT, path));
    return /\.(ts|tsx)$/.test(entry.name) && !entry.name.includes(".test.")
      ? [path]
      : [];
  });
}

const FILES = SOURCE_ROOTS.flatMap(sourceFiles);

const OWN_OR_PRIVILEGED_USERS_READERS = new Set([
  "app/(app)/help/[id]/page.tsx", // Direkt nach dem Insert: auth.uid()-Profil.
  "app/(senior)/profil/page.tsx", // Eigenes Profil.
  "app/api/kiosk/login/route.ts", // Serverseitiger Login-Pfad.
  "app/api/prevention/reimbursement/assist/route.ts", // Admin-Client, auth.uid().
  "lib/services/invitations.service.ts", // Einladender Nutzer aus auth.uid().
  "lib/welcome-pack.ts", // Service-Role-Cron.
  "modules/onboarding/components/OnboardingFlow.tsx", // Eigenes Profil.
]);

function repoPath(path: string): string {
  return relative(ROOT, path).replaceAll("\\", "/");
}

function isDeferredOrPrivileged(path: string): boolean {
  const file = repoPath(path);
  return (
    file.startsWith("app/(app)/admin/") ||
    file.startsWith("app/api/admin/") ||
    file.startsWith("lib/admin/") ||
    file.startsWith("modules/admin/") ||
    file === "components/HouseInfoPanel.tsx" ||
    file === "app/(app)/care/meine-senioren/[seniorId]/edit/page.tsx" ||
    OWN_OR_PRIVILEGED_USERS_READERS.has(file)
  );
}

describe("private profile consumer sweep", () => {
  it("laesst keine nicht-administrativen Fremdprofil-Joins auf users zurueck", () => {
    const offenders = FILES.filter((path) => !isDeferredOrPrivileged(path))
      .flatMap((path) => {
        const source = readFileSync(path, "utf8");
        return source.match(/(?:(?:user|requester|responder|helper|creator|claimer|caregiver|resident|sender|recipient|reviewer|endorser|instructor):\s*)?users(?:![^(]+)?\([^)]*(?:display_name|avatar_url)[^)]*\)/g)
          ?.map((match) => `${repoPath(path)}: ${match}`) ?? [];
      });

    expect(offenders).toEqual([]);
  });

  it("laesst keine direkten Fremdprofil-Leser auf users zurueck", () => {
    const offenders = FILES.filter((path) => !isDeferredOrPrivileged(path))
      .flatMap((path) => {
        const source = readFileSync(path, "utf8");
        return source.match(/\.from\(["']users["']\)[\s\S]{0,180}?\.select\(["'][^"']*(?:display_name|avatar_url)[^"']*["']\)/g)
          ?.map((match) => `${repoPath(path)}: ${match}`) ?? [];
      });

    expect(offenders).toEqual([]);
  });

  it("rendert eine leere Profilprojektion ohne ungeschuetzten Objektzugriff", () => {
    const offenders = FILES.filter((path) => !isDeferredOrPrivileged(path))
      .flatMap((path) => {
        const source = readFileSync(path, "utf8");
        return source.match(/\.(?:user|users|responder|helper)\.(?:display_name|avatar_url)/g)
          ?.map((match) => `${repoPath(path)}: ${match}`) ?? [];
      });

    expect(offenders).toEqual([]);
  });
});
