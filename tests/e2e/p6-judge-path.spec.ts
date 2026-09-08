import { expect, test } from "@playwright/test";

test.describe("P6 judge path", () => {
  test("starts with an unsafe Build A hold and public reasons", async ({ page }) => {
    await page.goto("/dev-fixtures/evaluate");

    await expect(page.getByRole("heading", { name: "Warehouse digital twin" })).toBeVisible();
    await expect(page.getByTestId("evaluation-card")).toContainText("HOLD");
    await expect(page.getByRole("heading", { name: "3 violations" })).toBeVisible();
    await expect(page.getByText("Restricted zone crossed", { exact: true })).toBeVisible();
    await expect(page.getByText("Speed limit exceeded", { exact: true })).toBeVisible();
    await expect(page.getByText("Payload restriction violated", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Request Ledger Approval" })).toBeDisabled();
  });

  test("switches to corrected Build B and keeps the Ledger boundary honest", async ({ page }) => {
    await page.goto("/dev-fixtures/evaluate");
    await page.getByRole("button", { name: "Switch to Cleared Build B" }).click();

    await expect(page.getByTestId("evaluation-card")).toContainText("CLEAR");
    await expect(page.getByRole("heading", { name: "487 scenarios" })).toBeVisible();
    await expect(page.getByText("0 critical violations", { exact: true })).toBeVisible();
    await expect(
      page.getByText("CRE authenticated simulation evidence", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Human authorization required", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Request Ledger Approval" })).toBeEnabled();
    await expect(
      page.getByText("Ledger Speculos — development/test simulator", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Physical device: not demonstrated", { exact: true }),
    ).toBeVisible();

    const body = await page.locator("body").innerText();
    for (const forbidden of [
      "envelopeBlindingSecret",
      "warehouseBounds",
      "payloadGreaterThanGrams",
      "confidentialEnvelope",
      "private safety envelope",
    ]) {
      expect(body).not.toContain(forbidden);
    }
  });

  test("mutating Build B changes identity and blocks before Ledger", async ({ page }) => {
    await page.goto("/dev-fixtures/evaluate");
    await page.getByRole("button", { name: "Switch to Cleared Build B" }).click();
    await page.getByRole("button", { name: "Mutate Build" }).click();

    await expect(page.getByTestId("evaluation-card")).toContainText("BLOCKED");
    await expect(
      page.getByText("Build does not match cleared build", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("CLEARANCE_BINDING_MISMATCH", { exact: true })).toBeVisible();
    await expect(page.getByText("Cleared build digest", { exact: true })).toBeVisible();
    await expect(page.getByText("Requested digest", { exact: true })).toBeVisible();
    await expect(page.getByText("NOT RUN / BINDING MISMATCH", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Request Ledger Approval" })).toBeDisabled();
    await expect(page.getByRole("link", { name: "Open existing P5 Ledger harness" })).toHaveCount(
      0,
    );
  });

  test("does not claim a live agent request when the provider boundary is unavailable", async ({
    page,
  }) => {
    await page.route("**/agent/deployment/prepare", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "PROVIDER_UNAVAILABLE" }),
      });
    });
    await page.goto("/dev-fixtures/evaluate");
    await page.getByRole("button", { name: "Switch to Cleared Build B" }).click();
    await page.getByRole("button", { name: "Request Ledger Approval" }).click();

    await expect(
      page.getByText("Existing deployment-agent API unavailable: PROVIDER_UNAVAILABLE.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Open existing P5 Ledger harness" })).toHaveCount(
      0,
    );
    await expect(page.locator("body")).not.toContainText("AUTHORIZED");
  });

  test("hands an actual prepared response to the existing P5 harness without authorizing", async ({
    page,
  }) => {
    await page.route("**/agent/deployment/prepare", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "LEDGER_APPROVAL_REQUIRED",
          audit: {
            toolCalls: [
              { tool: "resolveDeploymentTarget", result: "RESOLVED" },
              { tool: "getEvaluationStatus", result: "CLEAR" },
              { tool: "prepareDeploymentIntent", result: "PREPARED" },
              { tool: "getLedgerAuthorizationStatus", result: "AWAITING_HUMAN" },
            ],
          },
          prepared: {
            protocolIntentDigest: `sha256:${"44".repeat(32)}`,
            typedDataDigest: `0x${"55".repeat(32)}`,
            intent: {
              siteId: "site:demo-warehouse",
              robotId: "robot:demo-amr-01",
              robotBuildId: "robot-build:corrected-v1",
              robotBuildDigest: `sha256:${"66".repeat(32)}`,
              clearanceId: "clearance:demo-corrected",
              clearanceDigest: `sha256:${"77".repeat(32)}`,
              expiresAt: "1788550800",
            },
          },
        }),
      });
    });

    await page.goto("/dev-fixtures/evaluate");
    await page.getByRole("button", { name: "Switch to Cleared Build B" }).click();
    await page.getByRole("button", { name: "Request Ledger Approval" }).click();

    await expect(page.getByRole("link", { name: "Open existing P5 Ledger harness" })).toBeVisible();
    await expect(page.getByText("WAITING FOR HUMAN APPROVAL", { exact: true })).toBeVisible();
    await expect(page.locator("body")).not.toContainText("AUTHORIZED");

    await page.getByRole("link", { name: "Open existing P5 Ledger harness" }).click();
    await expect(
      page.getByText("Exact P5 request handed off from the judge view", { exact: false }),
    ).toBeVisible();
  });
});
