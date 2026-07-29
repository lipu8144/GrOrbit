import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Force DEMO MODE in unit/journey tests no matter what .env is present.
  // Without this, a machine with real Supabase keys runs the tests in LIVE
  // mode: async auth breaks sync assertions, stores read remote caches, and
  // worse — journeys write TEST ORDERS into the real database.
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(""),
    "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(""),
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.js"],
    css: false,
    exclude: ["**/node_modules/**", "e2e/**"],
  },
});
