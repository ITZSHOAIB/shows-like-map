// Browser checks against the built site, at phone width. The site is dark only, whatever the phone's theme.
import { defineConfig } from "@playwright/test";

const port = 4480;

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    viewport: { width: 390, height: 844 },
    // PROTOTYPE: V=guide (or marquee, transit) runs every check on that design direction.
    storageState: process.env.V ? { cookies: [{ name: "v", value: process.env.V, domain: "localhost", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" }], origins: [] } : undefined,
  },
  // Serves dist/ with Cloudflare's caching rules, so timings match the live site.
  webServer: { command: `node scripts/serve.ts`, port, env: { PORT: String(port) }, reuseExistingServer: !process.env.CI },
});
