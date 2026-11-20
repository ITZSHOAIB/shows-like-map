// The accessibility checks (docs/agents/frontend.md) run against the built site, at phone width, in both themes.
import { defineConfig } from "@playwright/test";

const port = 4480;

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://localhost:${port}`, viewport: { width: 390, height: 844 } },
  projects: [
    { name: "dark", use: { colorScheme: "dark" } },
    { name: "light", use: { colorScheme: "light" } },
  ],
  webServer: { command: `npx astro preview --port ${port}`, port, reuseExistingServer: !process.env.CI },
});
