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
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Open workspace" }).click();

    await expect(page.getByRole("heading", { name: "Warehouse Manila-01" })).toBeVisible();
    await page.getByRole("link", { name: "Open Preflight workspace" }).click();
    await expect(page).toHaveURL(/\/app$/);
    await expect(
      page.getByRole("heading", { name: "Make the next release easy to trust." }),
    ).toBeVisible();
  });
});
