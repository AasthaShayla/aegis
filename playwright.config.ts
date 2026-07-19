import { defineConfig } from "@playwright/test";

/**
 * Smoke E2E. Requires browsers once: `npx playwright install chromium`.
 * Run: `npx playwright test`.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  use: { baseURL: "http://localhost:3000", headless: true },
  webServer: {
    command: "npm run dev",
    port: 3000,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
