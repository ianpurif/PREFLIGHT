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
      page.getByRole("heading", { name: "A clear release path starts with a real workspace." }),
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
});
