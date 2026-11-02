import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Vitest configuration.
 *
 * Deliberately separate from `vite.config.ts` so the test runner never loads
 * the React/Tailwind plugins — the API-client tests are pure TypeScript and
 * run in a Node environment.
 *
 * The default environment is `node` because most of the suite is pure
 * TypeScript. DOM-backed tests opt in per FILE with a docblock pragma:
 *
 *     /**
 *      * @vitest-environment jsdom
 *      *\/
 *
 * `environmentMatchGlobs` is deliberately NOT used: it is deprecated in
 * Vitest 3 and silently changes behaviour between major versions, whereas the
 * pragma is stable, explicit, and travels with the file it applies to.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
