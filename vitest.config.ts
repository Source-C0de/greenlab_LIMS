import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Vitest configuration.
 *
 * Deliberately separate from `vite.config.ts` so the test runner never loads
 * the React/Tailwind plugins — the API-client tests are pure TypeScript and
 * run in a Node environment.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
