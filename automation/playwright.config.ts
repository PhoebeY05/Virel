import { defineConfig } from "playwright/test";

export default defineConfig({
  timeout: 60_000,
  use: {
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
  },
  outputDir: "test-results"
});
