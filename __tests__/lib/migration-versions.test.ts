import { readdirSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

describe("migration versions", () => {
  it("legt Rollback-Dateien nicht im Up-Migrationsordner ab", () => {
    const rollbackFiles = readdirSync(
      join(process.cwd(), "supabase", "migrations"),
    ).filter((name) => name.endsWith(".down.sql"));

    expect(rollbackFiles).toEqual([]);
  });

  it("hat eindeutige Up-Migration-Versionen", () => {
    const migrations = readdirSync(join(process.cwd(), "supabase", "migrations"))
      .filter((name) => name.endsWith(".sql"))
      .filter((name) => !name.endsWith(".down.sql"));

    const versions = new Map<string, string[]>();
    for (const migration of migrations) {
      const version = migration.split("_")[0];
      versions.set(version, [...(versions.get(version) ?? []), migration]);
    }

    const duplicates = [...versions.entries()]
      .filter(([, names]) => names.length > 1)
      .map(([version, names]) => `${version}: ${names.join(", ")}`);

    expect(duplicates).toEqual([]);
  });
});
