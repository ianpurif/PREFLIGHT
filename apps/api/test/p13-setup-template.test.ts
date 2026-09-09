import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const SCRIPT_PATH = resolve(import.meta.dir, "../scripts/p13-setup-template.ts");

describe("P13 setup template generator", () => {
  test("creates local setup material with owner-only modes", () => {
    const directory = mkdtempSync(join(tmpdir(), "rovaulta-p13-template-"));
    try {
      const result = spawnSync(process.execPath, [SCRIPT_PATH], {
        cwd: directory,
        encoding: "utf8",
      });
      expect(result.status).toBe(0);

      if (process.platform !== "win32") {
        const dataMode = statSync(join(directory, ".data")).mode & 0o777;
        const setupMode = statSync(join(directory, ".data", "p13-setup.json")).mode & 0o777;
        expect(dataMode).toBe(0o700);
        expect(setupMode).toBe(0o600);
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
