import { expect, test } from "@playwright/test";

test.describe("P8 product flow", () => {
  test("starts with a plain-language landing page", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /Release the build you actually evaluated/i }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Get started" }).first()).toHaveAttribute(
      "href",
      "/start",
    );
    await expect(
      page.getByText("Private site rules stay inside the evaluation boundary."),
    ).toBeVisible();
  });

  test("creates an account, persists a target, and stops when CRE is unavailable", async ({
    page,
  }) => {
    const email = `operator-${Date.now()}@example.test`;
    const artifactDigest = `sha256:${"ab".repeat(32)}`;
    await page.goto("/start");

    await expect(
      page.getByRole("heading", { name: "Enter the gate before a build reaches the floor." }),
    ).toBeVisible();
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password").fill("correct horse battery staple");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL(/\/app\/setup$/);
    await page.getByLabel("Site name").fill("Dockyard North");
    await page.getByLabel("Location").fill("Manila");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Robot name").fill("AMR-09");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Build version").fill("5.1.0");
    await page.getByLabel("Build label").fill("Nightly candidate");
    await page.getByLabel("Artifact digest").fill(artifactDigest);
    await page.getByRole("button", { name: "Create target and build" }).click();

    await expect(page).toHaveURL(/\/app$/);
    await expect(
      page.getByRole("heading", { name: "Make the next release easy to trust." }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Dockyard North" })).toBeVisible();
    await expect(page.getByText("Account-owned", { exact: true })).toBeVisible();

    await page.getByRole("link", { name: "Evaluate a build" }).click();
    await expect(page).toHaveURL(/\/app\/evaluate$/);
    await page.getByRole("button", { name: "Run evaluation" }).first().click();
    await expect(
      page.getByText(
        "Confidential evaluation is unavailable until the CRE gateway is configured.",
        {
          exact: true,
        },
      ),
    ).toBeVisible();
    await page.getByRole("link", { name: "Releases" }).click();
    await expect(page).toHaveURL(/\/app\/releases$/);
    await expect(page.getByText("A CLEAR evaluation is required", { exact: true })).toBeVisible();
  });

  test("normal evaluation does not expose the deterministic fixture selector", async ({ page }) => {
    await page.goto("/app/evaluate");
    await expect(page).not.toHaveURL(/dev-fixtures/);
    await expect(page.getByRole("button", { name: "Switch to Cleared Build B" })).toHaveCount(0);
    await expect(page.getByText("Development / regression fixture", { exact: true })).toHaveCount(
      0,
    );
  });

  test("keeps the session across refresh, routes authenticated entry, and signs out", async ({
    page,
  }) => {
    const email = `auth-flow-${Date.now()}@example.test`;
    await page.goto("/start");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password").fill("correct horse battery staple");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL(/\/app\/setup$/);
    await page.reload();
    await expect(page).toHaveURL(/\/app\/setup$/);
    await expect(
      page.getByRole("heading", { name: /Create the target you actually operate/i }),
    ).toBeVisible();

    await page.goto("/start");
    await expect(page).toHaveURL(/\/app$/);
    await page.goto("/sign-in");
    await expect(page).toHaveURL(/\/app$/);
    await page.goto("/create-account");
    await expect(page).toHaveURL(/\/app$/);
    await page.goto("/start");
    await expect(page).toHaveURL(/\/app$/);
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/start$/);
    await expect(
      page.getByRole("heading", { name: "Enter the gate before a build reaches the floor." }),
    ).toBeVisible();
    await page.goto("/p5-ledger?source=p8");
    await expect(page).toHaveURL(/\/start\?next=%2Fp5-ledger$/);

    await page.goto("/start?next=https%3A%2F%2Fattacker.example");
    await page.getByRole("tab", { name: "Sign in" }).click();
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password").fill("correct horse battery staple");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/app$/);
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/start$/);

    await page.goto("/app");
    await expect(page).toHaveURL(/\/start\?next=%2Fapp$/);
    await page.getByRole("tab", { name: "Sign in" }).click();
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password").fill("correct horse battery staple");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/app$/);
    await page.reload();
    await expect(page).toHaveURL(/\/app$/);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();

    await page.evaluate(() => {
      window.sessionStorage.setItem(
        "rovaulta.p5.prepared",
        JSON.stringify({
          version: 1,
          scope: "account",
          accountId: "account:another-user",
          prepared: { intent: { siteId: "site:another-user" } },
        }),
      );
    });
    await page.goto("/p5-ledger");
    await expect(
      page.getByText("The prepared request was cleared because it belongs to another account.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText("site:another-user");

    await page.goto("/app");
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
    await page.evaluate(() => {
      window.sessionStorage.setItem(
        "rovaulta.p5.prepared",
        JSON.stringify({
          version: 1,
          scope: "account",
          accountId: "account:current-user",
          prepared: { intent: { siteId: "site:current-user" } },
        }),
      );
    });
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/start$/);
    await expect
      .poll(() => page.evaluate(() => window.sessionStorage.getItem("rovaulta.p5.prepared")))
      .toBeNull();
  });
});
