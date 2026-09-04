import { expect, test } from "@playwright/test";

test("boilerplate shell is reachable", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Development harness ready." })).toBeVisible();
});
