import { expect, test } from "@playwright/test";

test.describe("P8 product flow", () => {
  test("starts with a plain-language landing page", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /Release the build you actually tested/i }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Get started" }).first()).toHaveAttribute(
      "href",
      "/start",
    );
    await expect(
      page.getByText("Private site rules stay inside the evaluation boundary."),
    ).toBeVisible();
  });

  test("onboarding hands the user into the workspace", async ({ page }) => {
    await page.goto("/start");

    await expect(
      page.getByRole("heading", { name: "Set up a release review in a minute." }),
    ).toBeVisible();
    await page.getByLabel("Site name").fill("Dockyard North");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Robot name").fill("AMR-09");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Build version").fill("5.1.0");
    await page.getByLabel("Build label").fill("Nightly candidate");
    await page.getByRole("button", { name: "Open workspace" }).click();

    await expect(page.getByRole("heading", { name: "Dockyard North" })).toBeVisible();
    await page.getByRole("link", { name: "Open Preflight workspace" }).click();
    await expect(page).toHaveURL(/\/app$/);
    await expect(
      page.getByRole("heading", { name: "Make the next release easy to trust." }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Dockyard North" })).toBeVisible();
    await expect(page.getByText("AMR-09 · release review")).toBeVisible();
    await expect(page.getByText("Nightly candidate")).toBeVisible();
  });
});
