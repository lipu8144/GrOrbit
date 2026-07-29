// Real-browser E2E. Run on YOUR machine (needs browser binaries + optionally
// your live Supabase via .env):
//   npm i -D @playwright/test && npx playwright install chromium
//   npm run test:e2e
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  timeout: 45000,
  use: { baseURL: "http://localhost:5173" },
  webServer: { command: "npm run dev", url: "http://localhost:5173", reuseExistingServer: true },
});
