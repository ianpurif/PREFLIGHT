import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { ApplicationStore } from "../src/application/index.js";
import { parseP13Setup, readP13SetupFile } from "../src/p13-setup.js";

const TEMPLATE_PATH = resolve(import.meta.dir, "../p13-setup.example.json");
const POLICY_KEY = Uint8Array.from({ length: 32 }, (_, index) => index + 1);

describe("P13 operator setup", () => {
  test("tracked template is secret-free and accepted by the account resource boundary", () => {
    const source = readFileSync(TEMPLATE_PATH, "utf8");
    expect(source).not.toMatch(/\b(password|secret|token|private|blind|credential)\b/i);

    const setup = parseP13Setup(JSON.parse(source) as unknown);
    const store = new ApplicationStore({ dbPath: ":memory:", policyKey: POLICY_KEY });
    const account = store.registerAccount({
      email: "p13-setup-template@example.test",
      password: "correct horse battery staple",
    }).account;
    const site = store.createSite(account.id, setup.site);
    const robot = store.createRobot(account.id, site.id, setup.robot);
    const build = store.createBuild(account.id, site.id, {
      ...setup.build,
      robotId: robot.id,
    });

    expect(site.id).toMatch(/^site:/);
    expect(robot.id).toMatch(/^robot:/);
    expect(build.id).toMatch(/^robot-build:/);
    store.close();
  });

  test("empty, malformed, and structurally invalid files fail with actionable errors", () => {
    const directory = mkdtempSync(join(tmpdir(), "rovaulta-p13-"));
    const missingPath = join(directory, "missing.json");
    const emptyPath = join(directory, "empty.json");
    const malformedPath = join(directory, "malformed.json");
    const invalidPath = join(directory, "invalid.json");
    try {
      writeFileSync(emptyPath, "\n", { encoding: "utf8", mode: 0o600 });
      writeFileSync(malformedPath, "{", { encoding: "utf8", mode: 0o600 });
      writeFileSync(invalidPath, "{}", { encoding: "utf8", mode: 0o600 });

      expect(() => readP13SetupFile(missingPath)).toThrow(/could not be read .*p13:setup-template/);
      expect(() => readP13SetupFile(emptyPath)).toThrow(/is empty; run .*p13:setup-template/);
      expect(() => readP13SetupFile(malformedPath)).toThrow(/must contain valid JSON/);
      expect(() => readP13SetupFile(invalidPath)).toThrow(
        /is invalid: P13 setup\.site must be an object/,
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
