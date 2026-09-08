import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: "bun --cwd apps/web dev",
    url: "http://localhost:3000",
    // Public test identity only: browser tests intercept the API response and never sign or authorize.
    env: {
      NEXT_PUBLIC_P6_SIGNER_ADDRESS: "0x0000000000000000000000000000000000000001",
      PREFLIGHT_ENABLE_DEMO_ROUTES: "true",
    },
    // A stale local Next process can retain old environment/configuration and make a judge
    // rehearsal appear to pass against the wrong build. Always start the isolated web server.
    reuseExistingServer: false,
  },
});
