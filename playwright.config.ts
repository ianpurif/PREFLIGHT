import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: "http://localhost:3000" },
  webServer: [
    {
      command: "bun run --cwd apps/api dev",
      url: "http://localhost:43100/health",
      env: {
        PORT: "43100",
        NODE_ENV: "test",
        PREFLIGHT_APP_DB_PATH: ".data/preflight-e2e.sqlite",
        PREFLIGHT_POLICY_KEY_PATH: ".data/preflight-e2e.key",
        EVM_RPC_URL: "",
        SEPOLIA_RPC_URL: "",
      },
      reuseExistingServer: false,
    },
    {
      command: "bun --cwd apps/web dev",
      url: "http://localhost:3000",
      // Fixture routes are deliberately enabled only for regression tests; normal /app routes
      // still require an authenticated API session.
      env: {
        NEXT_PUBLIC_P6_SIGNER_ADDRESS: "0x0000000000000000000000000000000000000001",
        NEXT_PUBLIC_API_ORIGIN: "http://localhost:43100",
        PREFLIGHT_ENABLE_DEMO_ROUTES: "true",
      },
      reuseExistingServer: false,
    },
  ],
});
