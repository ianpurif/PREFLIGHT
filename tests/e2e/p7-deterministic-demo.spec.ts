import { expect, type Page, test } from "@playwright/test";

const PREPARED = {
  protocolIntentDigest: "sha256:3a9909368b890b930d7af90a6d223850f9d0a032fd69001448a48747979059b7",
  typedDataDigest: "0xee8d32cabe16ba27146475d3f5dc843a5a3e4ea4092f0f5e4c99c1672767c60a",
  intent: {
    siteId: "site:demo-warehouse",
    robotId: "robot:demo-amr-01",
    robotBuildId: "robot-build:corrected-v1",
    robotBuildDigest: "sha256:8241d2ea876d4ee5d09df277a0ea6f8f7bcebf96acf47fe9b647ee2aeb9e3999",
    clearanceId: "clearance:demo-corrected",
    clearanceDigest: "sha256:99b1c64218fcd2d388673d557404478269d1ddf232c703aa037937904742cf90",
    expiresAt: "1788774500",
  },
};

async function installPreparedAgentRoute(page: Page) {
  await page.route("**/agent/deployment/prepare", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "LEDGER_APPROVAL_REQUIRED",
        audit: {
          toolCalls: [
            { tool: "resolveDeploymentTarget", result: "RESOLVED" },
            { tool: "getDeploymentContext", result: "LOCKED" },
            { tool: "getEvaluationStatus", result: "CLEAR" },
            { tool: "getClearance", result: "ELIGIBLE" },
            { tool: "prepareDeploymentIntent", result: "PREPARED" },
            { tool: "getLedgerAuthorizationStatus", result: "AWAITING_HUMAN" },
          ],
          finalReleaseStatus: "LEDGER_APPROVAL_REQUIRED",
          ledgerAuthorizationStatus: "AWAITING_HUMAN",
        },
        prepared: PREPARED,
      }),
    });
  });
}

test.describe("P7 deterministic judge rehearsal", () => {
  test("runs clean startup → reset → A → reset → B handoff → reset → C twice", async ({ page }) => {
    await installPreparedAgentRoute(page);
    await page.goto("/app/evaluate");

    await expect(page.getByTestId("demo-dashboard")).toHaveAttribute(
      "data-demo-selection",
      "unsafe",
    );
    await expect(page.getByTestId("evaluation-card")).toContainText("HOLD");
    await page.getByRole("button", { name: "Reset demo" }).click();
    await expect(page.getByTestId("demo-dashboard")).toHaveAttribute(
      "data-demo-selection",
      "unsafe",
    );
    await expect(
      page.getByText("Demo reset. Build A is loaded from the deterministic fixture."),
    ).toBeVisible();

    await page.getByRole("button", { name: "Switch to Cleared Build B" }).click();
    await page.getByRole("button", { name: "Request Ledger Approval" }).click();
    await expect(page.getByText("WAITING FOR HUMAN APPROVAL", { exact: true })).toBeVisible();
    await expect(page.getByText("site:demo-warehouse", { exact: true })).toBeVisible();
    await expect(page.getByText("robot-build:corrected-v1", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("sha256:8241d2ea…eb9e3999", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("clearance:demo-corrected", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Prepared ID clearance:demo-corrected", { exact: false }),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText("AUTHORIZED");
    await page.getByRole("link", { name: "Open existing P5 Ledger harness" }).click();
    await expect(page).toHaveURL(/\/p5-ledger\?source=p6$/);
    await expect(
      page.getByText("Exact P5 request handed off from the judge view", { exact: false }),
    ).toBeVisible();

    await page.goto("/app/evaluate");
    await page.getByRole("button", { name: "Reset demo" }).click();
    await expect(page.getByRole("link", { name: "Open existing P5 Ledger harness" })).toHaveCount(
      0,
    );
    await page.getByRole("button", { name: "Switch to Cleared Build B" }).click();
    await page.getByRole("button", { name: "Mutate Build" }).click();
    await expect(page.getByTestId("evaluation-card")).toContainText("BLOCKED");
    await expect(page.getByText("CLEARANCE_BINDING_MISMATCH", { exact: true })).toBeVisible();
    await expect(page.getByText("NOT RUN / BINDING MISMATCH", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open existing P5 Ledger harness" })).toHaveCount(
      0,
    );
    const firstMutatedOutput = await page.getByTestId("evaluation-card").innerText();

    await page.getByRole("button", { name: "Reset demo" }).click();
    await page.getByRole("button", { name: "Switch to Cleared Build B" }).click();
    await page.getByRole("button", { name: "Mutate Build" }).click();
    await expect
      .poll(() => page.getByTestId("evaluation-card").innerText())
      .toBe(firstMutatedOutput);
    await expect(page.getByRole("link", { name: "Open existing P5 Ledger harness" })).toHaveCount(
      0,
    );
  });

  test("ignores a late prepared response after reset", async ({ page }) => {
    let releaseResponse: (() => void) | undefined;
    const responseReady = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });
    await page.route("**/agent/deployment/prepare", async (route) => {
      await responseReady;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "LEDGER_APPROVAL_REQUIRED",
          audit: { toolCalls: [], ledgerAuthorizationStatus: "AWAITING_HUMAN" },
          prepared: PREPARED,
        }),
      });
    });
    await page.goto("/app/evaluate");
    await page.getByRole("button", { name: "Switch to Cleared Build B" }).click();
    const request = page.getByRole("button", { name: "Request Ledger Approval" });
    await request.click();
    await expect(
      page.getByText("Calling the existing deployment-agent preparation endpoint…"),
    ).toBeVisible();
    await page.getByRole("button", { name: "Reset demo" }).click();
    releaseResponse?.();
    await expect(page.getByTestId("demo-dashboard")).toHaveAttribute(
      "data-demo-selection",
      "unsafe",
    );
    await expect(page.getByRole("link", { name: "Open existing P5 Ledger harness" })).toHaveCount(
      0,
    );
    await expect(page.locator("body")).not.toContainText("LEDGER_APPROVAL_REQUIRED");
  });
});
