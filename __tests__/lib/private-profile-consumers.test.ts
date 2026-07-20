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

// Oeffentliche Discovery-/Vertrauensflaechen bleiben bis Welle 5 ueber die
// bestehende quartier-lesbare users-Policy erreichbar. Sie sind keine private
// soziale Beziehung und duerfen deshalb nicht auf user_public_profiles wechseln.
const PUBLIC_DISCOVERY_TRUST_USERS_READERS = new Set([
  "app/(app)/experts/page.tsx",
  "app/(app)/experts/[userId]/page.tsx",
  "app/api/doctors/route.ts",
  "lib/services/vouching.service.ts",
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
    PUBLIC_DISCOVERY_TRUST_USERS_READERS.has(file) ||
    OWN_OR_PRIVILEGED_USERS_READERS.has(file)
  );
}

function sourceAt(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
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

  it("begrenzt oeffentliche Discovery-Leser auf die freigegebenen users-Felder", () => {
    expect(sourceAt("app/(app)/experts/page.tsx")).toContain(
      "user:users(id, display_name, avatar_url, trust_level, created_at)",
    );
    expect(sourceAt("app/(app)/experts/[userId]/page.tsx")).toMatch(
      /\.from\("users"\)[\s\S]{0,100}?\.select\("id, display_name, trust_level, created_at"\)/,
    );
    expect(sourceAt("app/api/doctors/route.ts")).toMatch(
      /\.from\("users"\)[\s\S]{0,100}?\.select\("id, display_name, avatar_url"\)/,
    );
    expect(sourceAt("lib/services/vouching.service.ts")).toContain(
      "users!inner(id, display_name, trust_level)",
    );
  });

  it("zeigt bei RLS-leeren privaten Profilen einen neutralen Autor-Fallback", () => {
    for (const path of [
      "app/(app)/marketplace/page.tsx",
      "app/(app)/leihboerse/page.tsx",
      "app/(app)/lost-found/page.tsx",
      "app/(app)/polls/page.tsx",
      "app/(app)/packages/page.tsx",
    ]) {
      expect(sourceAt(path), path).toContain('user?.display_name ?? "Nachbar"');
    }
  });
});
